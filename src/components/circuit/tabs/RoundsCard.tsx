import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRounds, ROUND_TYPE_LABELS, Round } from "@/hooks/useRounds";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { StatusLine } from "./StatusLine";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import CloseRoundDialog from "@/components/circuit/CloseRoundDialog";
import { 
  Plus,
  ChevronRight,
  DollarSign,
  Settings,
  Archive,
  RotateCcw
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  pro_rata_enabled: boolean | null;
  minimum_ticket: number | null;
}

function RoundItem({ round, isActive }: { round: Round; isActive: boolean }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reopenRound, closeRound } = useRounds();
  const [isOpen, setIsOpen] = useState(isActive);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const isOpenRound = round.state === "open";

  const { data: terms, isLoading: termsLoading } = useQuery({
    queryKey: ["round-terms", round.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("round_terms")
        .select("valuation_cap, discount_rate, pro_rata_enabled, minimum_ticket")
        .eq("round_id", round.id)
        .maybeSingle();
      return data as RoundTerms | null;
    },
    enabled: isOpen,
  });

  const { data: stats } = useQuery({
    queryKey: ["round-stats-mini", round.id],
    queryFn: async () => {
      const { count: investors } = await supabase
        .from("investors")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", round.workspace_id);
      const { data: dockets } = await supabase
        .from("dockets")
        .select("amount, wire_received")
        .eq("round_id", round.id)
        .eq("is_global", false);
      const raised = dockets?.filter(d => d.wire_received).reduce((s, d) => s + (d.amount || 0), 0) || 0;
      return { investors: investors || 0, dockets: dockets?.length || 0, raised };
    },
    enabled: isOpen,
  });

  const handleReopen = async () => {
    try {
      await reopenRound.mutateAsync(round.id);
      toast({ title: "Round reopened" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

  const hasTerms = terms?.valuation_cap || terms?.discount_rate;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center gap-2">
              <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              <span className="font-medium text-sm">{round.name}</span>
              <Badge variant={isOpenRound ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                {isOpenRound ? "Open" : "Closed"}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {ROUND_TYPE_LABELS[round.round_type as keyof typeof ROUND_TYPE_LABELS]}
            </span>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-background/50 rounded p-2 text-center">
                <div className="text-muted-foreground">Investors</div>
                <div className="font-semibold">{stats?.investors || 0}</div>
              </div>
              <div className="bg-background/50 rounded p-2 text-center">
                <div className="text-muted-foreground">Dockets</div>
                <div className="font-semibold">{stats?.dockets || 0}</div>
              </div>
              <div className="bg-background/50 rounded p-2 text-center">
                <div className="text-muted-foreground">Raised</div>
                <div className="font-semibold">${((stats?.raised || 0) / 1000).toFixed(0)}k</div>
              </div>
            </div>

            {/* Terms Summary + Configure (only for open rounds) */}
            {isOpenRound && (
              <>
                <Separator />
                <div className="space-y-3">
                  {termsLoading ? (
                    <Skeleton className="h-12" />
                  ) : hasTerms ? (
                    <div className="text-xs space-y-1.5 bg-background/50 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cap:</span>
                        <span className="font-medium">
                          {terms.valuation_cap ? `$${(terms.valuation_cap / 1000000).toFixed(1)}M` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="font-medium">
                          {terms.discount_rate ? `${terms.discount_rate}%` : "—"}
                        </span>
                      </div>
                      {terms.minimum_ticket && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min:</span>
                          <span className="font-medium">${(terms.minimum_ticket / 1000).toFixed(0)}k</span>
                        </div>
                      )}
                      {terms.pro_rata_enabled && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pro-rata:</span>
                          <span className="font-medium">Yes</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No terms configured yet
                    </div>
                  )}

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/settings/rounds')}
                    className="w-full h-7 text-xs gap-1.5"
                  >
                    <Settings className="w-3 h-3" />
                    Configure Round
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setCloseDialogOpen(true)}
                    className="w-full h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Archive className="w-3 h-3" />
                    Close Round
                  </Button>
                </div>
              </>
            )}

            {/* Reopen button for closed rounds */}
            {!isOpenRound && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleReopen}
                className="w-full h-7 text-xs gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reopen Round
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <CloseRoundDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        roundName={round.name}
        onConfirm={async (reason, notes) => {
          await closeRound.mutateAsync(round.id);
          setCloseDialogOpen(false);
        }}
      />
    </>
  );
}

export function RoundsCard() {
  const { rounds, isLoading, openRound, hasOpenRound } = useRounds();
  const [createOpen, setCreateOpen] = useState(false);

  const openRounds = rounds.filter(r => r.state === "open");
  const closedRounds = rounds.filter(r => r.state === "closed");

  return (
    <>
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Rounds</span>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setCreateOpen(true)}
            disabled={hasOpenRound}
            className="h-7 px-2"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : rounds.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>No rounds yet.</p>
                <Button size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Create First Round
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {openRounds.map((r) => (
                  <RoundItem key={r.id} round={r} isActive={true} />
                ))}
                {closedRounds.length > 0 && openRounds.length > 0 && (
                  <div className="text-xs text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1">
                    Closed
                  </div>
                )}
                {closedRounds.map((r) => (
                  <RoundItem key={r.id} round={r} isActive={false} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      <StatusLine 
        status="idle" 
        idleText={openRound ? `${openRound.name} active` : "No active round"} 
      />
      
      <CreateRoundDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
