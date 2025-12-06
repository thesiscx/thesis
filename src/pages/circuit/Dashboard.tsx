import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds, Round } from "@/hooks/useRounds";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import CloseRoundDialog from "@/components/circuit/CloseRoundDialog";
import AssistantSidebar from "@/components/circuit/AssistantSidebar";
import CircuitHeader from "@/components/circuit/CircuitHeader";
import {
  Users,
  FileText,
  FolderOpen,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, companyName, fullName, profileLoaded } = useFounderAuth();
  const { rounds, isLoading: roundsLoading, hasOpenRound } = useRounds();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  // Fetch memo and docket counts per round
  const { data: roundStats } = useQuery({
    queryKey: ["round-stats", rounds?.map((r) => r.id)],
    queryFn: async () => {
      if (!rounds || rounds.length === 0) return {};

      const stats: Record<string, { memoCount: number; docketCount: number; investorCount: number }> = {};

      for (const round of rounds) {
        const [memoRes, docketRes, investorRes] = await Promise.all([
          supabase.from("memos").select("*", { count: "exact", head: true }).eq("round_id", round.id),
          supabase.from("dockets").select("*", { count: "exact", head: true }).eq("round_id", round.id),
          supabase.from("investors").select("*", { count: "exact", head: true }).eq("workspace_id", round.workspace_id),
        ]);

        stats[round.id] = {
          memoCount: memoRes.count || 0,
          docketCount: docketRes.count || 0,
          investorCount: investorRes.count || 0,
        };
      }

      return stats;
    },
    enabled: !!rounds && rounds.length > 0,
  });

  // Auto-expand open rounds on initial load
  useEffect(() => {
    if (rounds && rounds.length > 0) {
      const openRoundIds = rounds.filter(r => r.state === "open").map(r => r.id);
      setExpandedRounds(new Set(openRoundIds));
    }
  }, [rounds]);

  const toggleRoundExpanded = (roundId: string) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  const confirmCloseRound = async (reason: string, notes: string) => {
    if (!selectedRound) return;
    
    const { error } = await supabase
      .from("rounds")
      .update({
        state: "closed",
        closure_reason: reason,
        closure_notes: notes || null,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedRound.id);

    if (error) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["rounds"] });
    setCloseDialogOpen(false);
    setSelectedRound(null);
  };

  // Only block on auth - rounds can load progressively
  if (authLoading || !profileLoaded) {
    const blockingState = authLoading ? "Checking authentication..." : "Loading profile...";
    return (
      <div className="h-screen bg-background flex">
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-border px-6 flex items-center">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <span className="text-sm text-muted-foreground">{blockingState}</span>
          </div>
        </div>
        <div className="w-96 border-l border-border" />
      </div>
    );
  }

  const openRounds = rounds?.filter((r) => r.state === "open") || [];
  const closedRounds = rounds?.filter((r) => r.state === "closed") || [];

  const firstName = fullName?.split(" ")[0] || "there";

  const tools = [
    { key: "pipeline", label: "Pipeline", icon: Users, countKey: "investorCount" as const, countLabel: "investors" },
    { key: "memo", label: "Memo", icon: FileText, countKey: "memoCount" as const, countLabel: "variants" },
    { key: "docket", label: "Docket", icon: FolderOpen, countKey: "docketCount" as const, countLabel: "docs" },
    { key: "registry", label: "Registry", icon: BookOpen, disabled: true },
  ];

  const RoundTree = ({ round, isOpen }: { round: Round; isOpen: boolean }) => {
    const stats = roundStats?.[round.id];
    const isExpanded = expandedRounds.has(round.id);

    return (
      <div className="select-none">
        {/* Round row - entire div is clickable */}
        <div
          onClick={() => toggleRoundExpanded(round.id)}
          className={cn(
            "group flex items-center gap-2 py-3 px-4 rounded-xl cursor-pointer",
            "hover:bg-secondary/50 transition-all",
            isOpen && "bg-secondary/30 border border-border",
            !isOpen && "hover:bg-muted/50"
          )}
        >
          <div className="p-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className={cn(
              "font-medium truncate",
              isOpen ? "text-foreground" : "text-muted-foreground"
            )}>
              {round.name}
            </span>
            {isOpen && (
              <span className="text-[10px] bg-foreground/10 text-foreground px-2 py-0.5 rounded-full font-medium shrink-0">
                Open
              </span>
            )}
          </div>

          <span className="text-xs text-muted-foreground shrink-0">
            {round.instrument_type?.toUpperCase()}
            {round.target_raise && ` · $${Number(round.target_raise).toLocaleString()}`}
          </span>
        </div>

        {/* Tool children */}
        {isExpanded && (
          <div className="ml-6 mt-2 space-y-1 pl-4 border-l border-border">
            {tools.map((tool) => (
              <button
                key={tool.key}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!tool.disabled) {
                    navigate(`/circuit/${round.slug}/${tool.key}/global`);
                  }
                }}
                disabled={tool.disabled}
                className={cn(
                  "w-full flex items-center gap-3 py-2.5 px-4 text-left rounded-lg",
                  "hover:bg-secondary/50 transition-all",
                  tool.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <tool.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{tool.label}</span>
                {tool.disabled ? (
                  <span className="text-[10px] text-muted-foreground ml-auto">Coming soon</span>
                ) : tool.countKey && stats?.[tool.countKey] !== undefined ? (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {stats[tool.countKey]} {tool.countLabel}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <CircuitHeader activeTool="stage" />

        {/* Main Content */}
        <main className="flex-1 overflow-auto px-8 py-8">
          <div className="max-w-2xl">
            {/* Greeting - aligned with header padding */}
            <div className="mb-10">
              <h1 className="font-heading text-2xl font-bold">Hello, {firstName}</h1>
              {companyName && (
                <p className="text-muted-foreground mt-1">{companyName}</p>
              )}
            </div>

            {/* Empty State */}
            {openRounds.length === 0 && closedRounds.length === 0 && (
              <div className="border border-dashed border-border rounded-xl p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">No rounds yet</h3>
                <p className="text-muted-foreground text-sm">
                  Use the "Open Round" button in Circuit to start your first fundraising round.
                </p>
              </div>
            )}

            {/* Tree View */}
            {(openRounds.length > 0 || closedRounds.length > 0) && (
              <div className="space-y-8">
                {/* Open Rounds */}
                {openRounds.length > 0 && (
                  <div>
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2 px-4">
                      <Unlock className="w-3.5 h-3.5" />
                      Open Round
                    </h2>
                    <div className="space-y-2">
                      {openRounds.map((round) => (
                        <RoundTree key={round.id} round={round} isOpen />
                      ))}
                    </div>
                  </div>
                )}

                {/* Closed Rounds */}
                {closedRounds.length > 0 && (
                  <div>
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2 px-4">
                      <Lock className="w-3.5 h-3.5" />
                      Closed Rounds
                    </h2>
                    <div className="space-y-2">
                      {closedRounds.map((round) => (
                        <RoundTree key={round.id} round={round} isOpen={false} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <CreateRoundDialog open={createRoundOpen} onOpenChange={setCreateRoundOpen} />

        <CloseRoundDialog
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          roundName={selectedRound?.name || ""}
          onConfirm={confirmCloseRound}
        />
      </div>

      {/* Assistant Sidebar */}
      <AssistantSidebar pageKey="stage" onOpenRound={() => setCreateRoundOpen(true)} />
    </div>
  );
}
