import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { 
  Mail, 
  Building2, 
  MapPin, 
  ArrowLeft,
  Bot,
  MessageSquare,
  XCircle,
  FolderOpen
} from "lucide-react";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_OPTIONS = [
  { value: "prospect", label: "Prospect", color: "bg-muted text-muted-foreground" },
  { value: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "interested", label: "Interested", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "committed", label: "Committed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "signed", label: "Signed", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "declined", label: "Declined", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
] as const;

interface InvestorPipelineProps {
  roundSlug?: string;
  investorSlug?: string;
  onInvestorLoaded?: (investor: { id: string; name: string; status?: string }) => void;
}

export default function InvestorPipeline({ roundSlug, investorSlug, onInvestorLoaded }: InvestorPipelineProps) {
  const { user } = useFounderAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isMarkingPassed, setIsMarkingPassed] = useState(false);

  // Fetch round data
  const { data: roundData } = useQuery({
    queryKey: ["round", roundSlug, user?.id],
    queryFn: async () => {
      if (!roundSlug || !user?.id) return null;
      const { data } = await supabase
        .from("rounds")
        .select("id, workspace_id, name")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!roundSlug && !!user?.id,
    staleTime: 60 * 1000,
  });

  // Fetch investor data - use user.id directly as workspace_id to avoid dependency chain
  const { data: investor, isLoading: investorLoading } = useQuery({
    queryKey: ["investor", investorSlug, user?.id],
    queryFn: async () => {
      if (!investorSlug || !user?.id) return null;
      const { data } = await supabase
        .from("investors")
        .select("*")
        .eq("slug", investorSlug)
        .eq("workspace_id", user.id)
        .maybeSingle();
      
      if (data && onInvestorLoaded) {
        onInvestorLoaded({ id: data.id, name: data.name, status: data.status || undefined });
      }
      
      return data;
    },
    enabled: !!investorSlug && !!user?.id,
    staleTime: 60 * 1000,
  });

  // Fetch activity logs for this investor
  const { data: activityLogs = [] } = useQuery({
    queryKey: ["activity-logs", investor?.id, user?.id],
    queryFn: async () => {
      if (!investor?.id || !user?.id) return [];
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("investor_id", investor.id)
        .eq("workspace_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!investor?.id && !!user?.id,
    staleTime: 60 * 1000,
  });

  // Fetch docket status for this investor
  const { data: docket } = useQuery({
    queryKey: ["investor-docket-status", investor?.id, roundData?.id],
    queryFn: async () => {
      if (!investor?.id || !roundData?.id) return null;
      const { data } = await supabase
        .from("dockets")
        .select("id, status, amount, commitment_status")
        .eq("investor_id", investor.id)
        .eq("round_id", roundData.id)
        .eq("is_global", false)
        .maybeSingle();
      return data;
    },
    enabled: !!investor?.id && !!roundData?.id,
    staleTime: 60 * 1000,
  });

  const getStatusColor = (status?: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.color || STATUS_OPTIONS[0].color;
  };

  const getStatusLabel = (status?: string) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.label || "Prospect";
  };

  if (investorLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Investor not found</p>
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/${roundSlug}/pipeline`)}
              className="mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Derive status from docket commitment_status or default to prospect
  const investorStatus = docket?.commitment_status || "prospect";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-heading text-2xl font-bold">{investor.name}</h1>
              <Badge className={getStatusColor(investorStatus)}>
                {getStatusLabel(investorStatus)}
              </Badge>
            </div>
            {investor.email && (
              <p className="text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {investor.email}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!user?.id || !investor) return;
              setIsMarkingPassed(true);
              try {
                const { error } = await supabase
                  .from("investors")
                  .update({ status: "lost" })
                  .eq("id", investor.id);
                
                if (error) throw error;
                
                await logActivity({
                  workspaceId: user.id,
                  actionType: "investor_marked_passed",
                  investorId: investor.id,
                  roundId: roundData?.id,
                  metadata: { investor_name: investor.name }
                });
                
                toast.success(`${investor.name} marked as passed`);
                queryClient.invalidateQueries({ queryKey: ["investors"] });
                queryClient.invalidateQueries({ queryKey: ["investor", investorSlug] });
                navigate(`/${roundSlug}/pipeline`);
              } catch (err) {
                console.error("Failed to mark as passed:", err);
                toast.error("Failed to mark investor as passed");
              } finally {
                setIsMarkingPassed(false);
              }
            }}
            disabled={investor.status === "lost" || isMarkingPassed}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {isMarkingPassed ? "Marking..." : investor.status === "lost" ? "Already Passed" : "Mark as Passed"}
          </Button>
        </div>

        {/* AI Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Communication Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground italic">
                No communication history available yet. Email integration coming soon to provide AI-generated summaries of your investor conversations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Entity Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Entity Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Entity Name</p>
                <p className="text-sm font-medium">{investor.entity_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entity Type</p>
                <p className="text-sm font-medium capitalize">{investor.entity_type || "Individual"}</p>
              </div>
              {investor.address && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Address
                  </p>
                  <p className="text-sm">{investor.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investment Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Investment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Docket Status</p>
                <p className="text-sm font-medium capitalize">{docket?.status || "No docket"}</p>
              </div>
              {docket?.amount && (
                <div>
                  <p className="text-xs text-muted-foreground">Investment Amount</p>
                  <p className="text-sm font-medium">
                    ${docket.amount.toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Added</p>
                <p className="text-sm">
                  {format(new Date(investor.created_at), "MMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-start justify-between text-sm border-b border-border pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium capitalize text-xs">
                        {log.action_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}