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
import CloseRoundDialog from "@/components/thesis/CloseRoundDialog";
import CreateRoundDialog from "@/components/thesis/CreateRoundDialog";
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
  Plus,
  Download
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

      // Get access logs to count memo views
      const { count: memoViews } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact", head: true })
        .eq("round_id", roundId)
        .eq("action_type", "memo_viewed");

      // Get dockets sent (non-global dockets for this round)
      const { count: docketsSent } = await supabase
        .from("dockets")
        .select("*", { count: "exact", head: true })
        .eq("round_id", roundId)
        .eq("is_global", false);

      // Get signed dockets (status is 'Signed', 'Executed', or 'Funded')
      const { count: signed } = await supabase
        .from("dockets")
        .select("*", { count: "exact", head: true })
        .eq("round_id", roundId)
        .in("status", ["Signed", "Executed", "Funded"]);

      // Get wire received
      const { count: wired } = await supabase
        .from("dockets")
        .select("*", { count: "exact", head: true })
        .eq("round_id", roundId)
        .eq("wire_received", true);

      return {
        links: linksGenerated || 0,
        viewed: memoViews || 0,
        dockets: docketsSent || 0,
        signed: signed || 0,
        wired: wired || 0,
      };
    },
  });

  const stages = [
    { label: "Links Generated", value: flowData?.links || 0 },
    { label: "Memo Viewed", value: flowData?.viewed || 0 },
    { label: "Docket Sent", value: flowData?.dockets || 0 },
    { label: "Signed", value: flowData?.signed || 0 },
    { label: "Wire Received", value: flowData?.wired || 0 },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Round Funnel</p>
      <div className="space-y-2">
        {stages.map((stage, i) => {
          // Calculate opacity based on position (lighter to darker)
          const opacity = 0.4 + (i * 0.15);
          return (
            <div key={stage.label} className="flex items-center gap-3">
              <div className="w-32 text-sm text-muted-foreground">{stage.label}</div>
              <div className="flex-1 h-6 bg-secondary/50 rounded overflow-hidden">
                <div 
                  className="h-full bg-foreground transition-all duration-500"
                  style={{ 
                    width: `${(stage.value / maxValue) * 100}%`,
                    opacity: opacity,
                  }}
                />
              </div>
              <div className="w-12 text-sm font-medium text-right">{stage.value}</div>
            </div>
          );
        })}
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

  // Generate the actual SAFE HTML content
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const valuationCapFormatted = terms?.valuation_cap 
    ? formatCurrency(terms.valuation_cap)
    : 'N/A';

  const discountSection = terms?.discount_rate 
    ? `The "Discount Rate" is <strong>${100 - terms.discount_rate}%</strong>.`
    : '';

  const proRataSection = terms?.pro_rata_enabled ? `
    <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
      Pro-Rata Rights
    </h3>
    <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
      The Investor shall have a pro-rata right to participate in subsequent Equity Financings to maintain 
      their ownership percentage in the Company, subject to customary exceptions.
    </p>
  ` : '';

  const safeHtml = `
    <div style="font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333;">
      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 8px; letter-spacing: 2px;">
        SAFE
      </h1>
      <h2 style="text-align: center; font-size: 16px; color: #666; margin-bottom: 32px; font-weight: normal;">
        (Simple Agreement for Future Equity)
      </h2>
      
      <p style="margin-bottom: 20px; text-align: justify; font-size: 11px; text-transform: uppercase; color: #666;">
        THIS INSTRUMENT AND ANY SECURITIES ISSUABLE PURSUANT HERETO HAVE NOT BEEN REGISTERED 
        UNDER THE SECURITIES ACT OF 1933, AS AMENDED (THE "SECURITIES ACT"), OR UNDER THE 
        SECURITIES LAWS OF CERTAIN STATES. THESE SECURITIES MAY NOT BE OFFERED, SOLD OR 
        OTHERWISE TRANSFERRED, PLEDGED OR HYPOTHECATED EXCEPT AS PERMITTED UNDER THE ACT AND 
        APPLICABLE STATE SECURITIES LAWS PURSUANT TO AN EFFECTIVE REGISTRATION STATEMENT OR AN 
        EXEMPTION THEREFROM.
      </p>
      
      <p style="margin-bottom: 24px; text-align: justify;">
        <strong>${companyName || '[Company Name]'}</strong>, a Delaware corporation (the "Company"), hereby certifies that in exchange for 
        the payment by <strong>[Investor Name]</strong> (the "Investor") of <strong>[Purchase Amount]</strong> 
        (the "Purchase Amount") on or about ${currentDate}, the Company issues to the Investor 
        the right to certain shares of the Company's Capital Stock, subject to the terms 
        described below.
      </p>

      <p style="margin-bottom: 24px; text-align: justify;">
        The "Valuation Cap" is <strong>${valuationCapFormatted}</strong>.
        ${discountSection}
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        1. Events
      </h3>
      
      <p style="margin-bottom: 16px; text-align: justify; margin-left: 20px;">
        <strong>(a) Equity Financing.</strong> If there is an Equity Financing before the 
        termination of this Safe, on the initial closing of such Equity Financing, this Safe 
        will automatically convert into the number of shares of Safe Preferred Stock equal to 
        the Purchase Amount divided by the Conversion Price.
      </p>

      <p style="margin-bottom: 16px; text-align: justify; margin-left: 20px;">
        <strong>(b) Liquidity Event.</strong> If there is a Liquidity Event before the 
        termination of this Safe, this Safe will automatically be entitled to receive a portion 
        of Proceeds, due and payable to the Investor immediately prior to, or concurrent with, 
        the consummation of such Liquidity Event.
      </p>

      <p style="margin-bottom: 16px; text-align: justify; margin-left: 20px;">
        <strong>(c) Dissolution Event.</strong> If there is a Dissolution Event before the 
        termination of this Safe, the Investor will automatically be entitled to receive a portion 
        of Proceeds equal to the Cash-Out Amount.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        2. Definitions
      </h3>
      
      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        "<strong>Capital Stock</strong>" means the capital stock of the Company, including, without limitation, 
        the "Common Stock" and the "Preferred Stock."
      </p>

      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        "<strong>Conversion Price</strong>" means either: (1) the Safe Price or (2) the Discount Price, 
        whichever calculation results in a greater number of shares of Safe Preferred Stock.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        3. Company Representations
      </h3>
      
      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        The Company is a corporation duly organized, validly existing and in good standing under the 
        laws of its state of incorporation.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        4. Investor Representations
      </h3>
      
      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        The Investor is an accredited investor as such term is defined in Rule 501 of Regulation D 
        under the Securities Act.
      </p>

      ${proRataSection}

      <div style="margin-top: 60px; padding-top: 32px; border-top: 2px solid #333;">
        <p style="font-weight: bold; margin-bottom: 24px; text-align: center;">
          IN WITNESS WHEREOF, the undersigned have caused this Safe to be duly executed and delivered.
        </p>
        
        <div style="display: flex; gap: 60px; margin-top: 40px;">
          <div style="flex: 1;">
            <p style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">COMPANY:</p>
            <p style="margin-bottom: 4px;">${companyName || '[Company Name]'}</p>
            <div style="border-bottom: 1px solid #000; margin-top: 48px; margin-bottom: 4px;"></div>
            <p style="font-size: 12px; color: #666;">By: ________________________________</p>
            <p style="font-size: 12px; color: #666; margin-top: 4px;">Title: Authorized Signatory</p>
          </div>
          
          <div style="flex: 1;">
            <p style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">INVESTOR:</p>
            <p style="margin-bottom: 4px;">[Investor Name]</p>
            <div style="border-bottom: 1px solid #000; margin-top: 48px; margin-bottom: 4px;"></div>
            <p style="font-size: 12px; color: #666;">By: ________________________________</p>
          </div>
        </div>
      </div>
    </div>
  `;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview {instrumentLabel}</DialogTitle>
        </DialogHeader>
        
        <div 
          className="bg-white text-black rounded-lg p-4 border"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </DialogContent>
    </Dialog>
  );
}

function RoundTermsEditor({ round, onTermsChange }: { round: Round; onTermsChange?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [savingTerms, setSavingTerms] = useState(false);
  const [savingWire, setSavingWire] = useState(false);
  const [parsing, setParsing] = useState(false);
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

  const handleSaveTerms = async () => {
    if (!isOpen) return;
    
    setSavingTerms(true);
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
        }, { onConflict: "round_id" });

      if (error) throw error;
      toast({ title: "Investment terms saved" });
      refetch();
      onTermsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to save terms", description: error.message, variant: "destructive" });
    } finally {
      setSavingTerms(false);
    }
  };

  const handleSaveWireInstructions = async () => {
    if (!isOpen) return;
    
    setSavingWire(true);
    try {
      const { error } = await supabase
        .from("round_terms")
        .upsert({
          round_id: round.id,
          wire_bank_name: formData.wire_bank_name || null,
          wire_account_name: formData.wire_account_name || null,
          wire_account_number: formData.wire_account_number || null,
          wire_routing_number: formData.wire_routing_number || null,
          wire_swift_code: formData.wire_swift_code || null,
          wire_bank_address: formData.wire_bank_address || null,
          wire_reference: formData.wire_reference || null,
        }, { onConflict: "round_id" });

      if (error) throw error;
      toast({ title: "Wire instructions saved" });
      refetch();
      onTermsChange?.();
    } catch (error: any) {
      toast({ title: "Failed to save wire instructions", description: error.message, variant: "destructive" });
    } finally {
      setSavingWire(false);
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

        {isOpen && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveTerms} disabled={savingTerms} size="sm">
              {savingTerms && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Terms
            </Button>
          </div>
        )}
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

        {isOpen && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveWireInstructions} disabled={savingWire} size="sm">
              {savingWire && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Wire Instructions
            </Button>
          </div>
        )}
      </div>
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [instrumentType, setInstrumentType] = useState(round.instrument_type);
  const [savingInstrument, setSavingInstrument] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyName } = useFounderAuth();

  // Check if dockets exist (locks instrument type)
  const { data: hasDockets } = useQuery({
    queryKey: ["round-has-dockets", round.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("dockets")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id)
        .eq("is_global", false);
      return (count || 0) > 0;
    },
  });

  // Fetch terms for preview
  const { data: terms } = useQuery({
    queryKey: ["round-terms", round.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("round_terms")
        .select("*")
        .eq("round_id", round.id)
        .maybeSingle();
      return data as RoundTerms | null;
    },
  });

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

  const handleInstrumentChange = async (value: string) => {
    if (hasDockets) {
      toast({
        title: "Cannot change instrument type",
        description: "Dockets have already been generated for this round",
        variant: "destructive",
      });
      return;
    }
    
    setInstrumentType(value);
    setSavingInstrument(true);
    try {
      const { error } = await supabase
        .from("rounds")
        .update({ instrument_type: value })
        .eq("id", round.id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Instrument type updated" });
    } catch (error: any) {
      toast({ title: "Failed to update instrument type", description: error.message, variant: "destructive" });
      setInstrumentType(round.instrument_type);
    } finally {
      setSavingInstrument(false);
    }
  };

  const handleDownloadAgreement = () => {
    // Generate simple downloadable PDF placeholder
    toast({ title: "Download started", description: "Generating agreement template..." });
    // For now, just open preview - actual PDF generation would need html2pdf
  };

  const instrumentLabel = instrumentType === 'safe' ? 'SAFE' : 
                          instrumentType === 'note' ? 'Convertible Note' : 
                          'Investment Agreement';

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
                    {ROUND_TYPE_LABELS[round.round_type]} • {instrumentType.toUpperCase()}
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

            {/* Round Agreement / Document Section */}
            <div>
              <h4 className="font-medium mb-4">Round Agreement</h4>
              <div className="bg-secondary/30 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Instrument Type</p>
                    <p className="text-xs text-muted-foreground">
                      {hasDockets ? "Locked (dockets have been generated)" : "Select the type of investment agreement"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasDockets && <Lock className="w-4 h-4 text-muted-foreground" />}
                    <Select 
                      value={instrumentType} 
                      onValueChange={handleInstrumentChange}
                      disabled={hasDockets || !isActive || savingInstrument}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safe">SAFE</SelectItem>
                        <SelectItem value="note">Convertible Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Preview how your {instrumentLabel} will appear to investors based on your configured terms.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setPreviewOpen(true)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Preview Agreement
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadAgreement}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>
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

      <ContractPreviewDialog 
        open={previewOpen} 
        onOpenChange={setPreviewOpen} 
        round={{ ...round, instrument_type: instrumentType }}
        terms={terms}
      />
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
            variant="outline" 
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 px-3 gap-2"
          >
            <X className="h-3.5 w-3.5" />
            Exit
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
