import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusLine } from "./StatusLine";
import { 
  FileText, 
  FolderOpen, 
  Users, 
  Eye, 
  Pencil, 
  Upload, 
  Link, 
  PenTool, 
  CheckCircle2, 
  DollarSign, 
  Archive, 
  XCircle, 
  Plus, 
  RefreshCw,
  Key,
  Activity
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";

interface ActivityLog {
  id: string;
  action_type: string;
  metadata: {
    investor_name?: string;
    round_name?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof FileText; label: (meta: ActivityLog["metadata"]) => string }> = {
  memo_updated: { icon: Pencil, label: () => "memo.update()" },
  memo_published: { icon: Upload, label: () => "memo.publish()" },
  memo_version_created: { icon: FileText, label: () => "memo.version.create()" },
  memo_link_generated: { icon: Link, label: (m) => `memo.link("${m.investor_name || "investor"}")` },
  docket_created: { icon: FolderOpen, label: (m) => `docket.create("${m.investor_name || "investor"}")` },
  docket_link_generated: { icon: Link, label: (m) => `docket.link("${m.investor_name || "investor"}")` },
  docket_voided: { icon: XCircle, label: (m) => `docket.void("${m.investor_name || "investor"}")` },
  docket_archived: { icon: Archive, label: (m) => `docket.archive("${m.investor_name || "investor"}")` },
  investor_viewed_memo: { icon: Eye, label: (m) => `investor.view("${m.investor_name || "?"}", "memo")` },
  investor_viewed_docket: { icon: Eye, label: (m) => `investor.view("${m.investor_name || "?"}", "docket")` },
  investor_signed: { icon: PenTool, label: (m) => `investor.sign("${m.investor_name || "?"}")` },
  investor_funded: { icon: DollarSign, label: (m) => `investor.funded("${m.investor_name || "?"}")` },
  deal_executed: { icon: CheckCircle2, label: (m) => `deal.execute("${m.investor_name || "?"}")` },
  investor_added: { icon: Plus, label: (m) => `pipeline.add("${m.investor_name || "investor"}")` },
  investor_updated: { icon: RefreshCw, label: (m) => `investor.update("${m.investor_name || "?"}")` },
  round_created: { icon: Plus, label: (m) => `round.create("${m.round_name || "new"}")` },
  round_opened: { icon: Plus, label: (m) => `round.open("${m.round_name || "?"}")` },
  round_closed: { icon: Archive, label: (m) => `round.close("${m.round_name || "?"}")` },
  round_reopened: { icon: RefreshCw, label: (m) => `round.reopen("${m.round_name || "?"}")` },
  access_key_generated: { icon: Key, label: (m) => `access.generate("${m.investor_name || "?"}")` },
};

function formatTime(date: Date): string {
  if (isToday(date)) return format(date, "HH:mm:ss");
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  return format(date, "MMM d HH:mm");
}

export function ActivityCard() {
  const { user } = useFounderAuth();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity-logs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("workspace_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("activity-logs-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activity_logs",
        filter: `workspace_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["activity-logs", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return (
    <>
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Activity Log</span>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="p-3 space-y-1.5">
            {isLoading ? (
              <div className="text-muted-foreground text-xs">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center text-xs">
                No activity yet
              </div>
            ) : (
              logs.map((log) => {
                const config = ACTION_CONFIG[log.action_type];
                if (!config) return null;
                const Icon = config.icon;
                const label = config.label(log.metadata);
                const time = formatTime(new Date(log.created_at));
                
                return (
                  <div key={log.id} className="flex items-start gap-2 text-xs group">
                    <span className="text-muted-foreground shrink-0 font-mono text-[10px] pt-0.5">{time}</span>
                    <Icon className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="text-foreground/80 font-mono">{label}</span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
      
      <StatusLine 
        status="idle" 
        idleText={`${logs.length} events logged`} 
      />
    </>
  );
}
