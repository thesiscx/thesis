import { useState, useEffect, useRef } from "react";
import { useRounds, ROUND_TYPE_LABELS, Round } from "@/hooks/useRounds";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { StatusLine, StatusState } from "./StatusLine";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import CloseRoundDialog from "@/components/circuit/CloseRoundDialog";
import { 
  Loader2, 
  Plus,
  ChevronRight,
  DollarSign,
  Users,
  CheckCircle,
  Settings,
  Archive,
  RotateCcw,
  Upload
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  pro_rata_enabled: boolean | null;
  mfn_enabled: boolean | null;
  minimum_ticket: number | null;
  wire_bank_name: string | null;
  wire_account_name: string | null;
  wire_account_number: string | null;
  wire_routing_number: string | null;
  wire_swift_code: string | null;
  wire_bank_address: string | null;
}

function RoundItem({ round, isActive }: { round: Round; isActive: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { reopenRound, closeRound } = useRounds();
  const [isOpen, setIsOpen] = useState(isActive);
  const [saving, setSaving] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOpenRound = round.state === "open";

  const { data: terms, isLoading: termsLoading } = useQuery({
    queryKey: ["round-terms", round.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("round_terms")
        .select("*")
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

  const [formData, setFormData] = useState({
    valuation_cap: null as number | null,
    discount_rate: null as number | null,
    pro_rata_enabled: false,
    mfn_enabled: false,
    minimum_ticket: null as number | null,
  });

  useEffect(() => {
    if (terms) {
      setFormData({
        valuation_cap: terms.valuation_cap,
        discount_rate: terms.discount_rate,
        pro_rata_enabled: terms.pro_rata_enabled || false,
        mfn_enabled: terms.mfn_enabled || false,
        minimum_ticket: terms.minimum_ticket,
      });
    }
  }, [terms]);

  const handleSave = async () => {
    if (!isOpenRound) return;
    setSaving(true);
    try {
      await supabase.from("round_terms").upsert({
        round_id: round.id,
        ...formData,
      }, { onConflict: "round_id" });
      toast({ title: "Terms saved" });
      queryClient.invalidateQueries({ queryKey: ["round-terms", round.id] });
    } catch (e: any) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    try {
      await reopenRound.mutateAsync(round.id);
      toast({ title: "Round reopened" });
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

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

            {/* Terms Editor (only for open rounds) */}
            {isOpenRound && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Settings className="w-3 h-3" />
                    Terms
                  </div>
                  
                  {termsLoading ? (
                    <Skeleton className="h-20" />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Valuation Cap</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            type="number"
                            value={formData.valuation_cap || ""}
                            onChange={(e) => setFormData(p => ({ ...p, valuation_cap: e.target.value ? Number(e.target.value) : null }))}
                            className="h-8 text-xs pl-5"
                            placeholder="10M"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discount</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={formData.discount_rate || ""}
                            onChange={(e) => setFormData(p => ({ ...p, discount_rate: e.target.value ? Number(e.target.value) : null }))}
                            className="h-8 text-xs pr-6"
                            placeholder="20"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Min. Ticket</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            type="number"
                            value={formData.minimum_ticket || ""}
                            onChange={(e) => setFormData(p => ({ ...p, minimum_ticket: e.target.value ? Number(e.target.value) : null }))}
                            className="h-8 text-xs pl-5"
                            placeholder="25k"
                          />
                        </div>
                      </div>
                      <div className="space-y-1 flex flex-col justify-end">
                        <div className="flex items-center gap-2 h-8">
                          <Switch
                            checked={formData.pro_rata_enabled}
                            onCheckedChange={(c) => setFormData(p => ({ ...p, pro_rata_enabled: c }))}
                            className="scale-75"
                          />
                          <Label className="text-xs">Pro-rata</Label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-7 text-xs">
                      {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      Save Terms
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setCloseDialogOpen(true)}
                      className="h-7 text-xs gap-1"
                    >
                      <Archive className="w-3 h-3" />
                      Close
                    </Button>
                  </div>
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
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
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
        
        <ScrollArea className="max-h-[400px]">
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
