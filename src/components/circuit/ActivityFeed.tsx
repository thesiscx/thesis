import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  FolderOpen, 
  Users, 
  Send, 
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
  Key
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from "date-fns";

interface ActivityLog {
  id: string;
  action_type: string;
  metadata: {
    investor_name?: string;
    round_name?: string;
    memo_title?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof FileText; label: (meta: ActivityLog["metadata"]) => string }> = {
  // Memo actions
  memo_updated: {
    icon: Pencil,
    label: () => "Updated memo",
  },
  memo_published: {
    icon: Upload,
    label: () => "Published memo",
  },
  memo_version_created: {
    icon: FileText,
    label: () => "Created new memo version",
  },
  memo_link_generated: {
    icon: Link,
    label: (meta) => `Generated memo link for ${meta.investor_name || "investor"}`,
  },
  // Docket actions
  docket_created: {
    icon: FolderOpen,
    label: (meta) => `Created docket for ${meta.investor_name || "investor"}`,
  },
  docket_link_generated: {
    icon: Link,
    label: (meta) => `Generated docket link for ${meta.investor_name || "investor"}`,
  },
  docket_terms_updated: {
    icon: Pencil,
    label: () => "Updated docket terms",
  },
  docket_voided: {
    icon: XCircle,
    label: (meta) => `Voided docket for ${meta.investor_name || "investor"}`,
  },
  docket_archived: {
    icon: Archive,
    label: (meta) => `Archived docket for ${meta.investor_name || "investor"}`,
  },
  // Investor commitment actions
  investor_viewed_memo: {
    icon: Eye,
    label: (meta) => `${meta.investor_name || "Investor"} viewed memo`,
  },
  investor_viewed_docket: {
    icon: Eye,
    label: (meta) => `${meta.investor_name || "Investor"} viewed docket`,
  },
  investor_details_submitted: {
    icon: Users,
    label: (meta) => `${meta.investor_name || "Investor"} submitted investment details`,
  },
  investor_signed: {
    icon: PenTool,
    label: (meta) => `${meta.investor_name || "Investor"} signed SAFE agreement`,
  },
  investor_funded: {
    icon: DollarSign,
    label: (meta) => `${meta.investor_name || "Investor"} wire received`,
  },
  deal_executed: {
    icon: CheckCircle2,
    label: (meta) => `Deal executed with ${meta.investor_name || "investor"}`,
  },
  // Pipeline actions
  investor_added: {
    icon: Plus,
    label: (meta) => `Added ${meta.investor_name || "investor"} to pipeline`,
  },
  investor_updated: {
    icon: RefreshCw,
    label: (meta) => `Updated ${meta.investor_name || "investor"} details`,
  },
  // Round actions
  round_created: {
    icon: Plus,
    label: (meta) => `Created ${meta.round_name || "new round"}`,
  },
  round_opened: {
    icon: Plus,
    label: (meta) => `Opened ${meta.round_name || "round"}`,
  },
  round_closed: {
    icon: Archive,
    label: (meta) => `Closed ${meta.round_name || "round"}`,
  },
  round_reopened: {
    icon: RefreshCw,
    label: (meta) => `Reopened ${meta.round_name || "round"}`,
  },
  // Access key actions
  access_key_generated: {
    icon: Key,
    label: (meta) => `Generated access key for ${meta.investor_name || "investor"}`,
  },
};

function getDateGroup(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return "This Week";
  return format(date, "MMMM d, yyyy");
}

function groupByDate(logs: ActivityLog[]): Record<string, ActivityLog[]> {
  const groups: Record<string, ActivityLog[]> = {};
  
  for (const log of logs) {
    const date = new Date(log.created_at);
    const group = getDateGroup(date);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(log);
  }
  
  return groups;
}

export function ActivityFeed() {
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
        .limit(100);

      if (error) throw error;
      return data as ActivityLog[];
    },
    enabled: !!user?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("activity-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `workspace_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity-logs", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        <p>No activity yet.</p>
        <p className="mt-1 text-xs">Actions will appear here as you work.</p>
      </div>
    );
  }

  const groupedLogs = groupByDate(logs);
  const groupOrder = ["Today", "Yesterday", "This Week"];

  // Sort groups: Today, Yesterday, This Week first, then by date descending
  const sortedGroups = Object.keys(groupedLogs).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // For other dates, sort by the actual date
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {sortedGroups.map((group) => (
          <div key={group}>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {group}
            </div>
            <div className="space-y-4">
              {groupedLogs[group].map((log) => {
                const config = ACTION_CONFIG[log.action_type];
                if (!config) return null;

                const Icon = config.icon;
                const label = config.label(log.metadata);

                return (
                  <div key={log.id} className="space-y-1.5">
                    {/* Header with Circuit label and timestamp */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Circuit</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                    </div>
                    
                    {/* Message bubble */}
                    <div className="rounded-xl bg-secondary/70 px-4 py-3 text-sm leading-relaxed mr-4">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <p className="text-foreground">{label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
