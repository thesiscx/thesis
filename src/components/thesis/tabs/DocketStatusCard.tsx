import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Check, Circle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { StatusLine } from "./StatusLine";

interface DocketStatusCardProps {
  docketId?: string;
  investorName?: string;
}

const DOCKET_STAGES = [
  { key: "drafted", label: "Drafted" },
  { key: "viewed", label: "Viewed" },
  { key: "signed", label: "Signed" },
  { key: "executed", label: "Executed" },
  { key: "funded", label: "Funded" },
] as const;

type StageKey = typeof DOCKET_STAGES[number]["key"];

function getStageIndex(status: string): number {
  const normalizedStatus = status?.toLowerCase() || "drafted";
  const index = DOCKET_STAGES.findIndex(s => s.key === normalizedStatus);
  return index >= 0 ? index : 0;
}

export function DocketStatusCard({ docketId, investorName }: DocketStatusCardProps) {
  const { data: docket, isLoading } = useQuery({
    queryKey: ["docket-status", docketId],
    queryFn: async () => {
      if (!docketId) return null;
      
      const { data, error } = await supabase
        .from("dockets")
        .select("id, status, created_at, updated_at, wire_received_at")
        .eq("id", docketId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!docketId,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentStageIndex = getStageIndex(docket?.status || "drafted");
  const currentStage = DOCKET_STAGES[currentStageIndex]?.label || "Drafted";

  return (
    <>
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <FileText className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Docket Status</span>
        </div>
        <div className="p-4">
          {investorName && (
            <p className="text-xs text-muted-foreground mb-3">{investorName}</p>
          )}
          {!docketId ? (
            <p className="text-sm text-muted-foreground">No docket found</p>
          ) : (
            <div className="space-y-0">
              {DOCKET_STAGES.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;
                
                // Determine timestamp to show
                let timestamp: string | null = null;
                if (isCompleted || isCurrent) {
                  if (stage.key === "drafted" && docket?.created_at) {
                    timestamp = format(new Date(docket.created_at), "MMM d, h:mm a");
                  } else if (stage.key === "funded" && docket?.wire_received_at) {
                    timestamp = format(new Date(docket.wire_received_at), "MMM d, h:mm a");
                  } else if (isCurrent && docket?.updated_at) {
                    timestamp = format(new Date(docket.updated_at), "MMM d, h:mm a");
                  }
                }
                
                return (
                  <div key={stage.key} className="relative">
                    {/* Connecting line */}
                    {index < DOCKET_STAGES.length - 1 && (
                      <div 
                        className={cn(
                          "absolute left-[11px] top-[24px] w-0.5 h-8",
                          isCompleted ? "bg-foreground" : "bg-border"
                        )}
                      />
                    )}
                    
                    {/* Stage row */}
                    <div className="flex items-center gap-3 py-2">
                      {/* Status indicator */}
                      <div className="relative z-10">
                        {isCompleted ? (
                          <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-background" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center ring-4 ring-foreground/20">
                            <Circle className="w-2.5 h-2.5 fill-background text-background" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-border bg-background flex items-center justify-center">
                            <Circle className="w-2 h-2 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Label and timestamp */}
                      <div className="flex-1 flex items-center justify-between">
                        <span className={cn(
                          "text-sm font-medium",
                          isPending && "text-muted-foreground"
                        )}>
                          {stage.label}
                          {isCurrent && (
                            <span className="ml-2 text-xs text-muted-foreground">← Current</span>
                          )}
                        </span>
                        {timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {timestamp}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <StatusLine status="idle" idleText={`Current stage: ${currentStage}`} />
    </>
  );
}
