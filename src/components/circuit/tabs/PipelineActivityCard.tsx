import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Activity, Mail } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { StatusLine } from "./StatusLine";

interface PipelineActivityCardProps {
  investorId?: string;
  investorName?: string;
}

export function PipelineActivityCard({ investorId, investorName }: PipelineActivityCardProps) {
  const { user } = useFounderAuth();
  
  const { data: activityLogs = [], isLoading } = useQuery({
    queryKey: ["activity-logs", investorId, user?.id],
    queryFn: async () => {
      if (!investorId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("investor_id", investorId)
        .eq("workspace_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!investorId && !!user?.id,
  });

  if (isLoading) {
    return (
      <Card className="border-border bg-transparent">
        <CardHeader className="pb-3 border-b border-border">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activityCount = activityLogs.length;
  const statusText = activityCount === 0 
    ? "No activity recorded yet" 
    : `${activityCount} event${activityCount !== 1 ? 's' : ''} tracked`;

  return (
    <>
      <Card className="border-border bg-transparent">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity & Communication
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {investorName && (
            <p className="text-xs text-muted-foreground">{investorName}</p>
          )}
          
          {/* Activity Logs */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Activity History</p>
            {activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {activityLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start justify-between text-sm border-b border-border pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium capitalize text-xs">
                          {log.action_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email History Placeholder */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email History
            </p>
            <div className="bg-muted/50 rounded-lg p-3 border border-dashed border-border">
              <p className="text-xs text-muted-foreground italic">
                Email integration coming soon. Connect your email to see communication history with this investor.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <StatusLine status="idle" idleText={statusText} />
    </>
  );
}
