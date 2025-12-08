import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { StatusLine } from "./StatusLine";

interface AccessLogsCardProps {
  accessKeyId?: string;
  investorName?: string;
}

export function AccessLogsCard({ accessKeyId, investorName }: AccessLogsCardProps) {
  const { data: accessLogs = [], isLoading } = useQuery({
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
    enabled: !!accessKeyId,
  });

  if (isLoading) {
    return (
      <Card className="border-border bg-transparent">
        <CardHeader className="pb-3 border-b border-border">
          <Skeleton className="h-5 w-24" />
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

  const logCount = accessLogs.length;
  const statusText = logCount === 0 
    ? "No access recorded yet" 
    : `${logCount} access event${logCount !== 1 ? 's' : ''} recorded`;

  return (
    <>
      <Card className="border-border bg-transparent">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Access Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {investorName && (
            <p className="text-xs text-muted-foreground mb-3">{investorName}</p>
          )}
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
      <StatusLine status="idle" idleText={statusText} />
    </>
  );
}
