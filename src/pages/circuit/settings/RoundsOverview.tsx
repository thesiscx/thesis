import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds, ROUND_TYPE_LABELS, Round } from "@/hooks/useRounds";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CloseRoundDialog from "@/components/circuit/CloseRoundDialog";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import { 
  X, 
  Loader2, 
  Users, 
  FileText, 
  CheckCircle, 
  DollarSign,
  ChevronDown,
  ChevronRight,
  Lock,
  Eye,
  Upload,
  Building2,
  CreditCard,
  Archive,
  RotateCcw,
  Plus
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
  wire_bank_name: string | null;
  wire_account_name: string | null;
  wire_account_number: string | null;
  wire_routing_number: string | null;
  wire_swift_code: string | null;
  wire_bank_address: string | null;
  wire_reference: string | null;
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

function ContractPreviewDialog({ 
  open, 
  onOpenChange, 
  round, 
  terms 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  round: Round;
  terms: RoundTerms | null;
}) {
  const { companyName } = useFounderAuth();
  const instrumentLabel = round.instrument_type === 'safe' ? 'SAFE' : 
                          round.instrument_type === 'note' ? 'Convertible Note' : 
                          'Investment Agreement';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview {instrumentLabel}</DialogTitle>
        </DialogHeader>
        
        <div className="prose prose-sm max-w-none">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold mb-2">
              {round.instrument_type === 'safe' ? 'SIMPLE AGREEMENT FOR FUTURE EQUITY' : 
               round.instrument_type === 'note' ? 'CONVERTIBLE PROMISSORY NOTE' :
               'INVESTMENT AGREEMENT'}
            </h2>
            <p className="text-muted-foreground">{companyName || '[Company Name]'}</p>
          </div>

          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">Investment Terms</h3>
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                <div>
                  <p className="text-muted-foreground">Valuation Cap</p>
                  <p className="font-medium">
                    {terms?.valuation_cap ? `$${terms.valuation_cap.toLocaleString()}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Discount Rate</p>
                  <p className="font-medium">
                    {terms?.discount_rate ? `${terms.discount_rate}%` : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Minimum Investment</p>
                  <p className="font-medium">
                    {terms?.minimum_ticket ? `$${terms.minimum_ticket.toLocaleString()}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Instrument Type</p>
                  <p className="font-medium">{instrumentLabel}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Rights & Provisions</h3>
              <ul className="list-disc pl-5 space-y-1">
                {terms?.pro_rata_enabled && (
                  <li>Pro-rata rights to participate in future financing rounds</li>
                )}
                {terms?.mfn_enabled && (
                  <li>Most Favored Nation (MFN) clause applicable</li>
                )}
                <li>Standard {round.instrument_type.toUpperCase()} terms and conditions apply</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">Wire Instructions</h3>
              {terms?.wire_bank_name ? (
                <div className="bg-muted/30 p-4 rounded-lg space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank Name:</span>
                    <span>{terms.wire_bank_name}</span>
                  </div>
                  {terms.wire_account_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name:</span>
                      <span>{terms.wire_account_name}</span>
                    </div>
                  )}
                  {terms.wire_account_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span>{terms.wire_account_number}</span>
                    </div>
                  )}
                  {terms.wire_routing_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Routing Number:</span>
                      <span>{terms.wire_routing_number}</span>
                    </div>
                  )}
                  {terms.wire_swift_code && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SWIFT Code:</span>
                      <span>{terms.wire_swift_code}</span>
                    </div>
                  )}
                  {terms.wire_bank_address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank Address:</span>
                      <span>{terms.wire_bank_address}</span>
                    </div>
                  )}
                  {terms.wire_reference && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span>{terms.wire_reference}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Wire instructions not configured</p>
              )}
            </section>

            <section className="border-t pt-4 mt-6">
              <p className="text-xs text-muted-foreground text-center">
                This is a preview of the investment agreement. The final document will be 
                generated when creating investor-specific dockets.
              </p>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoundTermsEditor({ round }: { round: Round }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    valuation_cap: null as number | null,
    discount_rate: null as number | null,
    pro_rata_enabled: false,
    mfn_enabled: false,
    minimum_ticket: null as number | null,
    wire_bank_name: "",
    wire_account_name: "",
    wire_account_number: "",
    wire_routing_number: "",
    wire_swift_code: "",
    wire_bank_address: "",
    wire_reference: "",
  });

  // Update form when terms load
  useEffect(() => {
    if (terms) {
      setFormData({
        valuation_cap: terms.valuation_cap,
        discount_rate: terms.discount_rate,
        pro_rata_enabled: terms.pro_rata_enabled || false,
        mfn_enabled: terms.mfn_enabled || false,
        minimum_ticket: terms.minimum_ticket,
        wire_bank_name: terms.wire_bank_name || "",
        wire_account_name: terms.wire_account_name || "",
        wire_account_number: terms.wire_account_number || "",
        wire_routing_number: terms.wire_routing_number || "",
        wire_swift_code: terms.wire_swift_code || "",
        wire_bank_address: terms.wire_bank_address || "",
        wire_reference: terms.wire_reference || "",
      });
    }
  }, [terms]);

  const handleSave = async () => {
    if (!isOpen) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("round_terms")
        .upsert({
          round_id: round.id,
          valuation_cap: formData.valuation_cap,
          discount_rate: formData.discount_rate,
          pro_rata_enabled: formData.pro_rata_enabled,
          mfn_enabled: formData.mfn_enabled,
          minimum_ticket: formData.minimum_ticket,
          wire_bank_name: formData.wire_bank_name || null,
          wire_account_name: formData.wire_account_name || null,
          wire_account_number: formData.wire_account_number || null,
          wire_routing_number: formData.wire_routing_number || null,
          wire_swift_code: formData.wire_swift_code || null,
          wire_bank_address: formData.wire_bank_address || null,
          wire_reference: formData.wire_reference || null,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: "Please upload a PDF file", variant: "destructive" });
      return;
    }

    setParsing(true);
    try {
      // Upload to temp storage for parsing
      const fileName = `wire-instructions-${Date.now()}.pdf`;
      const filePath = `temp/${round.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("pitch-decks")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("pitch-decks")
        .getPublicUrl(filePath);

      // Call AI to parse the wire instructions
      const { data, error } = await supabase.functions.invoke("parse-wire-instructions", {
        body: { fileUrl: urlData.publicUrl, roundId: round.id }
      });

      if (error) throw error;

      if (data?.wireInstructions) {
        setFormData(prev => ({
          ...prev,
          wire_bank_name: data.wireInstructions.bankName || prev.wire_bank_name,
          wire_account_name: data.wireInstructions.accountName || prev.wire_account_name,
          wire_account_number: data.wireInstructions.accountNumber || prev.wire_account_number,
          wire_routing_number: data.wireInstructions.routingNumber || prev.wire_routing_number,
          wire_swift_code: data.wireInstructions.swiftCode || prev.wire_swift_code,
          wire_bank_address: data.wireInstructions.bankAddress || prev.wire_bank_address,
          wire_reference: data.wireInstructions.reference || prev.wire_reference,
        }));
        toast({ title: "Wire instructions parsed", description: "Review the extracted information below" });
      } else {
        toast({ title: "Could not parse wire instructions", description: "Please enter manually", variant: "destructive" });
      }

      // Clean up temp file
      await supabase.storage.from("pitch-decks").remove([filePath]);
    } catch (error: any) {
      console.error("Parse error:", error);
      toast({ 
        title: "Failed to parse document", 
        description: "Please enter wire instructions manually",
        variant: "destructive" 
      });
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return <Skeleton className="h-40" />;
  }

  return (
    <div className="space-y-6">
      {!isOpen && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 p-3 rounded-lg">
          <Lock className="w-4 h-4" />
          Terms cannot be edited for closed rounds
        </div>
      )}

      {/* Preview Button */}
      <Button 
        variant="outline" 
        onClick={() => setPreviewOpen(true)}
        className="gap-2"
      >
        <Eye className="w-4 h-4" />
        Preview Agreement
      </Button>

      {/* Investment Terms */}
      <div>
        <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Investment Terms
        </h5>
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
            <Label>Minimum Investment</Label>
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

        <div className="flex gap-6 mt-4">
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
      </div>

      <Separator />

      {/* Wire Instructions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Wire Instructions
          </h5>
          {isOpen && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="gap-2"
              >
                {parsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {parsing ? "Parsing..." : "Upload PDF"}
              </Button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input
              value={formData.wire_bank_name}
              onChange={(e) => setFormData(prev => ({ ...prev, wire_bank_name: e.target.value }))}
              placeholder="First National Bank"
              disabled={!isOpen}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input
              value={formData.wire_account_name}
              onChange={(e) => setFormData(prev => ({ ...prev, wire_account_name: e.target.value }))}
              placeholder="Acme Inc."
              disabled={!isOpen}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={formData.wire_account_number}
              onChange={(e) => setFormData(prev => ({ ...prev, wire_account_number: e.target.value }))}
              placeholder="1234567890"
              disabled={!isOpen}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Routing Number (ABA)</Label>
            <Input
              value={formData.wire_routing_number}
              onChange={(e) => setFormData(prev => ({ ...prev, wire_routing_number: e.target.value }))}
              placeholder="021000021"
              disabled={!isOpen}
            />
          </div>
          
          <div className="space-y-2">
            <Label>SWIFT/BIC Code</Label>
            <Input
              value={formData.wire_swift_code}
              onChange={(e) => setFormData(prev => ({ ...prev, wire_swift_code: e.target.value }))}
              placeholder="CHASUS33"
              disabled={!isOpen}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Reference / Memo</Label>
            <Input
              value={formData.wire_reference}
              onChange={(e) => setFormData(prev => ({ ...prev, wire_reference: e.target.value }))}
              placeholder="Investment - [Investor Name]"
              disabled={!isOpen}
            />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label>Bank Address</Label>
          <Textarea
            value={formData.wire_bank_address}
            onChange={(e) => setFormData(prev => ({ ...prev, wire_bank_address: e.target.value }))}
            placeholder="123 Bank Street, New York, NY 10001"
            rows={2}
            disabled={!isOpen}
          />
        </div>
      </div>

      {isOpen && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Terms
          </Button>
        </div>
      )}

      <ContractPreviewDialog 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
        round={round}
        terms={terms}
      />
    </div>
  );
}

function RoundCard({ 
  round, 
  isActive,
  onCloseRound,
  onReopenRound,
  hasOpenRound,
}: { 
  round: Round; 
  isActive: boolean;
  onCloseRound: (round: Round) => void;
  onReopenRound: (round: Round) => void;
  hasOpenRound: boolean;
}) {
  const [isOpen, setIsOpen] = useState(isActive);
  const { toast } = useToast();

  const handleReopenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasOpenRound) {
      toast({
        title: "Cannot reopen round",
        description: "You must close your current round before reopening another",
        variant: "destructive",
      });
      return;
    }
    onReopenRound(round);
  };

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
                    {isActive && <Badge variant="default" className="text-xs">Open</Badge>}
                    {!isActive && <Badge variant="secondary" className="text-xs">Closed</Badge>}
                  </div>
                  <CardDescription className="mt-1">
                    {ROUND_TYPE_LABELS[round.round_type]} • {round.instrument_type.toUpperCase()}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {round.target_raise && (
                  <div className="text-sm text-muted-foreground">
                    Target: ${round.target_raise.toLocaleString()}
                  </div>
                )}
              </div>
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

            <Separator />

            {/* Close/Reopen Actions */}
            <div className="flex justify-end gap-3">
              {isActive ? (
                <Button 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseRound(round);
                  }}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Archive className="w-4 h-4" />
                  Close Round
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={handleReopenClick}
                  className="gap-2"
                  disabled={hasOpenRound}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reopen Round
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function RoundsOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isLoading: authLoading, profileLoaded } = useFounderAuth();
  const { rounds, isLoading: roundsLoading, openRound, closeRound, reopenRound, hasOpenRound } = useRounds();
  
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);

  const closedRounds = rounds.filter(r => r.state === "closed");

  const handleCloseRound = (round: Round) => {
    setSelectedRound(round);
    setCloseDialogOpen(true);
  };

  const confirmCloseRound = async (reason: string, notes: string) => {
    if (!selectedRound) return;
    
    try {
      await supabase
        .from("rounds")
        .update({ 
          state: "closed",
          closure_reason: reason,
          closure_notes: notes,
          closed_at: new Date().toISOString(),
        })
        .eq("id", selectedRound.id);

      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Round closed successfully" });
    } catch (error: any) {
      toast({ title: "Failed to close round", description: error.message, variant: "destructive" });
    }
  };

  const handleReopenRound = async (round: Round) => {
    try {
      await reopenRound.mutateAsync(round.id);
    } catch (error) {
      // Error handled by mutation
    }
  };

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
          <Button onClick={() => navigate("/")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl py-8 px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-heading font-semibold mb-1">Configure Rounds</h1>
            <p className="text-muted-foreground text-sm">Manage your fundraising rounds and terms</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Active Round */}
          {openRound && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Open Round</h2>
              <RoundCard 
                round={openRound} 
                isActive={true}
                onCloseRound={handleCloseRound}
                onReopenRound={handleReopenRound}
                hasOpenRound={hasOpenRound}
              />
            </div>
          )}

          {/* Closed Rounds */}
          {closedRounds.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Past Rounds</h2>
              <div className="space-y-3">
                {closedRounds.map(round => (
                  <RoundCard 
                    key={round.id} 
                    round={round} 
                    isActive={false}
                    onCloseRound={handleCloseRound}
                    onReopenRound={handleReopenRound}
                    hasOpenRound={hasOpenRound}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Open New Round button when no active round */}
          {!openRound && !roundsLoading && (
            <div className="pt-4">
              <Button onClick={() => setCreateDialogOpen(true)} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Open New Round
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Close Round Dialog */}
      <CloseRoundDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        roundName={selectedRound?.name || ""}
        onConfirm={confirmCloseRound}
      />

      {/* Create Round Dialog */}
      <CreateRoundDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["rounds"] });
        }}
      />
    </div>
  );
}
