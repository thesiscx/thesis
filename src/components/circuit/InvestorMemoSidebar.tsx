import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Copy, 
  Key, 
  Link2, 
  RefreshCw, 
  Clock, 
  Eye,
  Calendar,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface InvestorMemoSidebarProps {
  roundSlug: string;
  investorSlug: string;
  roundId?: string;
}

interface AccessLog {
  id: string;
  action: string;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
}

export function InvestorMemoSidebar({ 
  roundSlug, 
  investorSlug,
  roundId 
}: InvestorMemoSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, user } = useFounderAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch investor details
  const { data: investor } = useQuery({
    queryKey: ["investor", investorSlug, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("investors")
        .select("*")
        .eq("slug", investorSlug)
        .eq("workspace_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!investorSlug,
  });

  // Fetch access key for this investor's memo
  const { data: accessKey, refetch: refetchKey } = useQuery({
    queryKey: ["investor-memo-key", roundId, investor?.id],
    queryFn: async () => {
      if (!roundId || !investor?.id) return null;
      const { data } = await supabase
        .from("access_keys")
        .select("*")
        .eq("round_id", roundId)
        .eq("investor_id", investor.id)
        .eq("tool", "memo")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!roundId && !!investor?.id,
  });

  // Fetch access logs for this key
  const { data: accessLogs = [] } = useQuery({
    queryKey: ["access-logs", accessKey?.id],
    queryFn: async () => {
      if (!accessKey?.id) return [];
      const { data } = await supabase
        .from("access_logs")
        .select("*")
        .eq("access_key_id", accessKey.id)
        .order("timestamp", { ascending: false })
        .limit(20);
      return (data || []) as AccessLog[];
    },
    enabled: !!accessKey?.id,
  });

  const shareUrl = profile?.company_slug 
    ? `${window.location.origin}/share/${profile.company_slug}/${roundSlug}/memo/${investorSlug}`
    : null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleRefreshKey = async () => {
    if (!roundId || !investor?.id) return;
    setIsRefreshing(true);
    try {
      // Revoke current key
      if (accessKey?.id) {
        await supabase
          .from("access_keys")
          .update({ status: "revoked" })
          .eq("id", accessKey.id);
      }
      
      // Generate new key
      await supabase.functions.invoke("generate-access-key", {
        body: { roundId, investorId: investor.id, tool: "memo" }
      });
      
      await refetchKey();
      queryClient.invalidateQueries({ queryKey: ["access-logs"] });
      toast({ title: "Access key refreshed" });
    } catch (error) {
      toast({ title: "Failed to refresh key", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!accessKey?.id) return;
    try {
      await supabase
        .from("access_keys")
        .update({ status: "revoked" })
        .eq("id", accessKey.id);
      
      await refetchKey();
      toast({ title: "Access key revoked" });
    } catch (error) {
      toast({ title: "Failed to revoke key", variant: "destructive" });
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "access_granted": return "Accessed with key";
      case "memo_viewed": return "Viewed memo";
      case "memo_opened": return "Opened memo page";
      default: return action.replace(/_/g, " ");
    }
  };

  return (
    <div className="w-72 border-r border-border bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/${roundSlug}/memo`)}
          className="gap-2 -ml-2 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Memo
        </Button>
        
        <h2 className="font-semibold text-lg">{investor?.name || "Investor"}</h2>
        {investor?.email && (
          <p className="text-sm text-muted-foreground">{investor.email}</p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Share Link */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="w-4 h-4" />
              Share Link
            </div>
            {shareUrl ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded border border-border break-all">
                    {shareUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(shareUrl, "Link")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Complete your profile to enable sharing
              </p>
            )}
          </div>

          {/* Access Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="w-4 h-4" />
                Access Key
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRefreshKey} disabled={isRefreshing}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Key
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleRevokeKey} 
                    disabled={!accessKey}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke Key
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {accessKey ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-secondary/50 px-2 py-1.5 rounded border border-border font-mono">
                    {accessKey.key}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(accessKey.key, "Key")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                {accessKey.expires_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Expires {format(new Date(accessKey.expires_at), "MMM d, yyyy")}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No active access key. Generate one from the memo page.
              </p>
            )}
          </div>

          <Separator />

          {/* Activity Log */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="w-4 h-4" />
              Activity
            </div>
            
            {accessLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No activity recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {accessLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-2 text-xs"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{getActionLabel(log.action)}</p>
                      <p className="text-muted-foreground">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
