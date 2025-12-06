import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds, ROUND_TYPE_LABELS, Round } from "@/hooks/useRounds";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Loader2, 
  Users, 
  FileText, 
  CheckCircle, 
  DollarSign,
  ChevronDown,
  ChevronRight,
  Lock
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RoundTerms {
  id: string;
  round_id: string;
  valuation_cap: number | null;
  discount_rate: number | null;
  pro_rata_enabled: boolean | null;
  mfn_enabled: boolean | null;
  minimum_ticket: number | null;
  wire_instructions: string | null;
}

interface RoundStats {
  investors_connected: number;
  dockets_sent: number;
  investors_signed: number;
  amount_raised: number;
}

function RoundStatsDisplay({ round }: { round: Round }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["round-stats", round.id],
    queryFn: async () => {
      // Get investors for this workspace
      const { count: investorsCount } = await supabase
        .from("investors")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", round.workspace_id);

      // Get dockets sent (non-global dockets for this round)
      const { count: docketsCount } = await supabase
        .from("dockets")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id)
        .eq("is_global", false);

      // Get signed dockets
      const { data: signedDockets } = await supabase
        .from("dockets")
        .select("id, amount")
        .eq("round_id", round.id)
        .eq("status", "signed");

      const amountRaised = signedDockets?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      return {
        investors_connected: investorsCount || 0,
        dockets_sent: docketsCount || 0,
        investors_signed: signedDockets?.length || 0,
        amount_raised: amountRaised,
      } as RoundStats;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-secondary/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Users className="w-4 h-4" />
          Investors Connected
        </div>
        <div className="text-2xl font-semibold">{stats?.investors_connected || 0}</div>
      </div>
      <div className="bg-secondary/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <FileText className="w-4 h-4" />
          Dockets Sent
        </div>
        <div className="text-2xl font-semibold">{stats?.dockets_sent || 0}</div>
      </div>
      <div className="bg-secondary/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <CheckCircle className="w-4 h-4" />
          Investors Signed
        </div>
        <div className="text-2xl font-semibold">{stats?.investors_signed || 0}</div>
      </div>
      <div className="bg-secondary/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <DollarSign className="w-4 h-4" />
          Amount Raised
        </div>
        <div className="text-2xl font-semibold">
          ${stats?.amount_raised?.toLocaleString() || 0}
        </div>
      </div>
    </div>
  );
}

function SankeyChart({ roundId }: { roundId: string }) {
  const { data: flowData } = useQuery({
    queryKey: ["round-flow", roundId],
    queryFn: async () => {
      // Get all access keys for this round
      const { count: linksGenerated } = await supabase
        .from("access_keys")
        .select("*", { count: "exact", head: true })
        .eq("round_id", roundId);

      // Get dockets sent
      const { count: docketsSent } = await supabase
        .from("dockets")
        .select("*", { count: "exact", head: true })
        .eq("round_id", roundId)
        .eq("is_global", false);

      // Get signed dockets
      const { count: signed } = await supabase
        .from("dockets")
        .select("*", { count: "exact", head: true })
        .eq("round_id", roundId)
        .eq("status", "signed");

      // Get wire received
      const { count: wired } = await supabase
        .from("dockets")
        .select("*", { count: "exact", head: true })
        .eq("round_id", roundId)
        .eq("wire_received", true);

      return {
        links: linksGenerated || 0,
        viewed: Math.round((linksGenerated || 0) * 0.7), // Placeholder
        dockets: docketsSent || 0,
        signed: signed || 0,
        wired: wired || 0,
      };
    },
  });

  const stages = [
    { label: "Links Generated", value: flowData?.links || 0, color: "bg-blue-500" },
    { label: "Memo Viewed", value: flowData?.viewed || 0, color: "bg-indigo-500" },
    { label: "Docket Sent", value: flowData?.dockets || 0, color: "bg-purple-500" },
    { label: "Signed", value: flowData?.signed || 0, color: "bg-green-500" },
    { label: "Wire Received", value: flowData?.wired || 0, color: "bg-emerald-500" },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Round Funnel</p>
      <div className="space-y-2">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-3">
            <div className="w-32 text-sm text-muted-foreground">{stage.label}</div>
            <div className="flex-1 h-6 bg-secondary/50 rounded overflow-hidden">
              <div 
                className={`h-full ${stage.color} transition-all duration-500`}
                style={{ width: `${(stage.value / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-12 text-sm font-medium text-right">{stage.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoundTermsEditor({ round }: { round: Round }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const isOpen = round.state === "open";

  const { data: terms, isLoading, refetch } = useQuery({
    queryKey: ["round-terms", round.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("round_terms")
        .select("*")
        .eq("round_id", round.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as RoundTerms | null;
    },
  });

  const [formData, setFormData] = useState({
    valuation_cap: terms?.valuation_cap || null,
    discount_rate: terms?.discount_rate || null,
    pro_rata_enabled: terms?.pro_rata_enabled || false,
    mfn_enabled: terms?.mfn_enabled || false,
    minimum_ticket: terms?.minimum_ticket || null,
    wire_instructions: terms?.wire_instructions || "",
  });

  // Update form when terms load
  useState(() => {
    if (terms) {
      setFormData({
        valuation_cap: terms.valuation_cap,
        discount_rate: terms.discount_rate,
        pro_rata_enabled: terms.pro_rata_enabled || false,
        mfn_enabled: terms.mfn_enabled || false,
        minimum_ticket: terms.minimum_ticket,
        wire_instructions: terms.wire_instructions || "",
      });
    }
  });

  const handleSave = async () => {
    if (!isOpen) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("round_terms")
        .upsert({
          round_id: round.id,
          ...formData,
        }, { onConflict: "round_id" });

      if (error) throw error;
      toast({ title: "Terms saved" });
      refetch();
    } catch (error: any) {
      toast({ title: "Failed to save terms", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-40" />;
  }

  return (
    <div className="space-y-4">
      {!isOpen && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 p-3 rounded-lg">
          <Lock className="w-4 h-4" />
          Terms cannot be edited for closed rounds
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valuation Cap</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={formData.valuation_cap || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, valuation_cap: e.target.value ? Number(e.target.value) : null }))}
              placeholder="10,000,000"
              className="pl-7"
              disabled={!isOpen}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Discount Rate</Label>
          <div className="relative">
            <Input
              type="number"
              value={formData.discount_rate || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, discount_rate: e.target.value ? Number(e.target.value) : null }))}
              placeholder="20"
              className="pr-7"
              disabled={!isOpen}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Minimum Ticket</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              type="number"
              value={formData.minimum_ticket || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, minimum_ticket: e.target.value ? Number(e.target.value) : null }))}
              placeholder="25,000"
              className="pl-7"
              disabled={!isOpen}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Instrument Type</Label>
          <Select value={round.instrument_type} disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="safe">SAFE</SelectItem>
              <SelectItem value="note">Convertible Note</SelectItem>
              <SelectItem value="equity">Priced Equity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-3">
          <Switch
            checked={formData.pro_rata_enabled || false}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, pro_rata_enabled: checked }))}
            disabled={!isOpen}
          />
          <Label>Pro-Rata Rights</Label>
        </div>
        
        <div className="flex items-center gap-3">
          <Switch
            checked={formData.mfn_enabled || false}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mfn_enabled: checked }))}
            disabled={!isOpen}
          />
          <Label>MFN Clause</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Wire Instructions</Label>
        <Textarea
          value={formData.wire_instructions}
          onChange={(e) => setFormData(prev => ({ ...prev, wire_instructions: e.target.value }))}
          placeholder="Bank name, account number, routing number, etc."
          rows={3}
          disabled={!isOpen}
        />
      </div>

      {isOpen && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Terms
          </Button>
        </div>
      )}
    </div>
  );
}

function RoundCard({ round, isActive }: { round: Round; isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(isActive);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{round.name}</CardTitle>
                    {isActive && <Badge variant="default" className="text-xs">Active</Badge>}
                    {!isActive && <Badge variant="secondary" className="text-xs">Closed</Badge>}
                  </div>
                  <CardDescription className="mt-1">
                    {ROUND_TYPE_LABELS[round.round_type]} • {round.instrument_type.toUpperCase()}
                  </CardDescription>
                </div>
              </div>
              {round.target_raise && (
                <div className="text-sm text-muted-foreground">
                  Target: ${round.target_raise.toLocaleString()}
                </div>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            <RoundStatsDisplay round={round} />
            
            <Separator />
            
            <SankeyChart roundId={round.id} />
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-4">Round Terms</h4>
              <RoundTermsEditor round={round} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function RoundsOverview() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, profileLoaded } = useFounderAuth();
  const { rounds, isLoading: roundsLoading, openRound } = useRounds();

  const closedRounds = rounds.filter(r => r.state === "closed");

  if (authLoading || !profileLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to access settings</p>
          <Button onClick={() => navigate("/auth")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl py-8 px-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/circuit")}
          className="mb-6 -ml-2 hover:bg-secondary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Stage
        </Button>
        
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-semibold mb-1">Rounds Overview</h1>
          <p className="text-muted-foreground text-sm">Manage your fundraising rounds and terms</p>
        </div>

        <div className="space-y-6">
          {/* Active Round */}
          {openRound && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Active Round</h2>
              <RoundCard round={openRound} isActive={true} />
            </div>
          )}

          {/* Closed Rounds */}
          {closedRounds.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Past Rounds</h2>
              <div className="space-y-3">
                {closedRounds.map(round => (
                  <RoundCard key={round.id} round={round} isActive={false} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!openRound && closedRounds.length === 0 && !roundsLoading && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No rounds created yet</p>
                <Button onClick={() => navigate("/circuit")}>
                  Go to Stage to Open a Round
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
