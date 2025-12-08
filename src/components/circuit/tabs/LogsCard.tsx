import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Eye, Activity, Mail } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface LogsCardProps {
  accessKeyId?: string;
  investorId?: string;
  investorName?: string;
  context?: "memo" | "docket" | "pipeline";
}

export function LogsCard({ accessKeyId, investorId, investorName, context = "memo" }: LogsCardProps) {
  const { user } = useFounderAuth();
  
  // Fetch access logs (for memo/docket contexts with access keys)
  const { data: accessLogs = [], isLoading: accessLoading } = useQuery({
    queryKey: ["access-logs", accessKeyId],
    queryFn: async () => {
      if (!accessKeyId) return [];
      
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .eq("access_key_id", accessKeyId)
        .order("timestamp", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!accessKeyId && context !== "pipeline",
  });

  // Fetch activity logs (for pipeline context)
  const { data: activityLogs = [], isLoading: activityLoading } = useQuery({
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
    enabled: !!investorId && !!user?.id && context === "pipeline",
  });

  const isLoading = context === "pipeline" ? activityLoading : accessLoading;

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pipeline context - show activity logs + email placeholder
  if (context === "pipeline") {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity & Communication
          </CardTitle>
          {investorName && (
            <p className="text-xs text-muted-foreground">{investorName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
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
    );
  }

  // Memo/Docket context - show access logs
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Access Logs
        </CardTitle>
        {investorName && (
          <p className="text-xs text-muted-foreground">{investorName}</p>
        )}
      </CardHeader>
      <CardContent>
        {!accessKeyId ? (
          <p className="text-sm text-muted-foreground">No access key found</p>
        ) : accessLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No access logs yet</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {accessLogs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start justify-between text-sm border-b border-border pb-3 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium capitalize text-xs">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.timestamp), "MMM d, h:mm a")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
