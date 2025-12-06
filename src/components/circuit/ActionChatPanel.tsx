import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Link2, Lock, Unlock, Check, Users, Globe, Key, FileEdit, Copy, Settings, UserPlus, Pencil, UserRoundSearch } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type PageKey = "stage" | "memo" | "docket" | "pipeline";

interface ActionMessage {
  id: string;
  message_type: "system" | "action" | "confirmation" | "result" | "user" | "card";
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  flow_type?: string | null;
  flow_step?: number | null;
  flow_data?: Record<string, unknown> | null;
  flow_complete?: boolean | null;
}

interface ActionChatPanelProps {
  pageKey: PageKey;
  roundId?: string;
  roundSlug?: string;
  onOpenRound?: () => void;
  onUpdateMemoContent?: (content: any) => void;
  hasMemoContent?: boolean;
  currentMemoContent?: any;
}

// Card-based flow component wrapper - no close button, persistent
function FlowCard({ title, children, isHistorical }: { title: string; children: React.ReactNode; isHistorical?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border border-border overflow-hidden",
      isHistorical ? "bg-secondary/30 opacity-60" : "bg-secondary/50"
    )}>
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

// Close round flow card
function CloseRoundFlow({ 
  roundName, 
  onConfirm, 
  isLoading,
  isComplete,
  isHistorical,
  savedData
}: { 
  roundName: string; 
  onConfirm: (reason: string, notes: string) => void;
  isLoading: boolean;
  isComplete: boolean;
  isHistorical?: boolean;
  savedData?: { reason?: string; notes?: string };
}) {
  const [reason, setReason] = useState(savedData?.reason || "");
  const [notes, setNotes] = useState(savedData?.notes || "");

  const CLOSURE_REASONS = [
    { value: "raised_funding", label: "Successfully raised funding" },
    { value: "paused", label: "Paused fundraising" },
    { value: "changed_plans", label: "Changed plans / pivoted" },
    { value: "merged", label: "Merged into another round" },
    { value: "other", label: "Other" },
  ];

  if (isComplete || isHistorical) {
    const displayReason = savedData?.reason || reason;
    const reasonLabel = CLOSURE_REASONS.find(r => r.value === displayReason)?.label || displayReason;
    return (
      <div className={cn("rounded-xl border border-border p-4", isHistorical && "bg-secondary/30 opacity-60")}>
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-green-600" />
          <span className="font-medium">Round closed</span>
          {reasonLabel && <span className="text-muted-foreground">- {reasonLabel}</span>}
        </div>
      </div>
    );
  }

  return (
    <FlowCard title={`Close ${roundName}`}>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Why are you closing this round?</Label>
        <RadioGroup value={reason} onValueChange={setReason} className="space-y-1.5">
          {CLOSURE_REASONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-sm transition-all",
                reason === opt.value 
                  ? "border-foreground bg-foreground/5" 
                  : "border-border hover:bg-secondary/50"
              )}
            >
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional details..."
          rows={2}
          className="text-sm resize-none bg-background"
        />
      </div>

      <Button 
        size="sm" 
        onClick={() => onConfirm(reason, notes)} 
        disabled={!reason || isLoading}
        className="w-full"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
        Close Round
      </Button>
    </FlowCard>
  );
}

// Published memo flow - shows generated link and investor options
function PublishFlow({
  roundId,
  roundSlug,
  companySlug,
  investors,
  onGenerateInvestorLink,
  isLoading,
  generatedLinks,
  isHistorical,
}: {
  roundId: string;
  roundSlug?: string;
  companySlug?: string;
  investors: { id: string; name: string; slug: string }[];
  onGenerateInvestorLink: (investorId: string, investorName: string) => void;
  isLoading: boolean;
  generatedLinks: Record<string, { url: string; key: string }>;
  isHistorical?: boolean;
}) {
  const { toast } = useToast();
  const publicUrl = companySlug && roundSlug 
    ? `${window.location.origin}/share/${companySlug}/${roundSlug}/memo`
    : null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed - please copy manually", variant: "destructive" });
    }
  };

  // Generate a public access key for the share link
  const [publicAccessKey, setPublicAccessKey] = useState<string | null>(null);
  
  // Generate public access key on mount
  useEffect(() => {
    const generatePublicKey = async () => {
      if (!roundId || !roundSlug) return;
      try {
        const { data } = await supabase.functions.invoke("generate-access-key", {
          body: { roundId, tool: "memo" }
        });
        if (data?.key) {
          setPublicAccessKey(data.key);
        }
      } catch (e) {
        console.error("Failed to generate public key:", e);
      }
    };
    if (!isHistorical) {
      generatePublicKey();
    }
  }, [roundId, roundSlug, isHistorical]);

  return (
    <FlowCard title="Memo Published" isHistorical={isHistorical}>
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Public Share Link
          </Label>
          {publicUrl ? (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background px-3 py-2 rounded border border-border break-all">
                  {publicUrl}
                </code>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => copyToClipboard(publicUrl)}
                  className="shrink-0 h-8 w-8 p-0"
                  disabled={isHistorical}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              {publicAccessKey && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Access Key
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-secondary/50 px-3 py-2 rounded border border-border break-all font-mono">
                      {publicAccessKey}
                    </code>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => copyToClipboard(publicAccessKey)}
                      className="shrink-0 h-8 w-8 p-0"
                      disabled={isHistorical}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Complete your profile settings to enable public sharing.</p>
          )}
        </div>

        {!isHistorical && (
          <div className="border-t border-border pt-3 space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <UserRoundSearch className="w-3.5 h-3.5" />
              Individual Investor Links
            </Label>
            {investors.length === 0 ? (
              <p className="text-xs text-muted-foreground">No investors in your pipeline yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {investors.map((inv) => {
                  const linkData = generatedLinks[inv.id];
                  return (
                    <div key={inv.id} className="p-3 rounded-lg bg-background border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{inv.name}</span>
                        {!linkData && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onGenerateInvestorLink(inv.id, inv.name)}
                            disabled={isLoading}
                            className="h-7 text-xs"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate Link"}
                          </Button>
                        )}
                      </div>
                      {linkData && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-secondary px-2 py-1.5 rounded break-all">
                              {linkData.url}
                            </code>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => copyToClipboard(linkData.url)}
                              className="shrink-0 h-7 w-7 p-0"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Key className="w-3 h-3" />
                            <span>Access Key: {linkData.key}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </FlowCard>
  );
}

// Accumulated draft data across steps
interface DraftData {
  company_name?: string;
  one_liner?: string;
  founded?: string;
  problem?: string;
  solution?: string;
  tam?: string;
  market_insight?: string;
  revenue_model?: string;
  pricing?: string;
  key_metrics?: string;
  founders?: string;
  raising?: string;
  use_of_funds?: string;
}

// Draft memo wizard flow
function DraftMemoFlow({
  step,
  onNext,
  isLoading,
  isComplete,
  accumulatedData,
  isHistorical,
}: {
  step: number;
  onNext: (data: Record<string, string>) => void;
  isLoading: boolean;
  isComplete: boolean;
  accumulatedData: DraftData;
  isHistorical?: boolean;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const STEPS = [
    {
      title: "Company Overview",
      fields: [
        { key: "company_name", label: "Company Name", placeholder: "Acme Corp" },
        { key: "one_liner", label: "One-Liner", placeholder: "What does your company do in one sentence?" },
        { key: "founded", label: "Founded", placeholder: "2023" },
      ]
    },
    {
      title: "The Problem",
      fields: [
        { key: "problem", label: "Problem Statement", placeholder: "What problem are you solving?", multiline: true },
      ]
    },
    {
      title: "Your Solution",
      fields: [
        { key: "solution", label: "Solution", placeholder: "How does your product solve this?", multiline: true },
      ]
    },
    {
      title: "Market Opportunity",
      fields: [
        { key: "tam", label: "Total Addressable Market", placeholder: "$10B" },
        { key: "market_insight", label: "Key Market Insight", placeholder: "Why now?", multiline: true },
      ]
    },
    {
      title: "Business Model",
      fields: [
        { key: "revenue_model", label: "Revenue Model", placeholder: "How do you make money?" },
        { key: "pricing", label: "Pricing", placeholder: "Your pricing structure" },
      ]
    },
    {
      title: "Traction",
      fields: [
        { key: "key_metrics", label: "Key Metrics", placeholder: "ARR, users, growth rate, etc.", multiline: true },
      ]
    },
    {
      title: "Team",
      fields: [
        { key: "founders", label: "Founding Team", placeholder: "Brief background of founders", multiline: true },
      ]
    },
    {
      title: "The Ask",
      fields: [
        { key: "raising", label: "Amount Raising", placeholder: "$1.5M" },
        { key: "use_of_funds", label: "Use of Funds", placeholder: "How will you use this capital?", multiline: true },
      ]
    },
  ];

  // Pre-fill form with accumulated data when step changes
  useEffect(() => {
    const currentStep = STEPS[step];
    if (currentStep) {
      const prefilled: Record<string, string> = {};
      currentStep.fields.forEach(f => {
        if (accumulatedData[f.key as keyof DraftData]) {
          prefilled[f.key] = accumulatedData[f.key as keyof DraftData] || "";
        }
      });
      setFormData(prev => ({ ...prefilled, ...prev }));
    }
  }, [step, accumulatedData]);

  // Completed state - collapsed summary
  if (isComplete || isHistorical) {
    return (
      <div className={cn("rounded-xl border border-border p-4", isHistorical && "bg-secondary/30 opacity-60")}>
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-green-600" />
          <span className="font-medium">Questionnaire completed</span>
          {accumulatedData.company_name && (
            <span className="text-muted-foreground">- {accumulatedData.company_name}</span>
          )}
        </div>
      </div>
    );
  }

  // Loading state - generating memo
  if (isLoading) {
    return (
      <FlowCard title="Draft Memo">
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
          <span className="text-sm text-muted-foreground animate-pulse">
            Generating your memo...
          </span>
        </div>
      </FlowCard>
    );
  }

  const currentStep = STEPS[step];
  if (!currentStep) return null;

  const isStepValid = currentStep.fields.every(f => formData[f.key]?.trim());

  return (
    <FlowCard title={`Draft Memo - ${currentStep.title}`}>
      <div className="text-xs text-muted-foreground mb-3">
        Step {step + 1} of {STEPS.length}
      </div>
      
      <div className="space-y-3">
        {currentStep.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{field.label}</Label>
            {field.multiline ? (
              <Textarea
                value={formData[field.key] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={3}
                className="text-sm resize-none bg-background"
              />
            ) : (
              <Input
                value={formData[field.key] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="bg-background"
              />
            )}
          </div>
        ))}
      </div>

      <Button 
        size="sm" 
        onClick={() => onNext(formData)} 
        disabled={!isStepValid}
        className="w-full"
      >
        {step === STEPS.length - 1 ? (
          <Check className="w-4 h-4 mr-2" />
        ) : null}
        {step === STEPS.length - 1 ? "Generate Memo" : "Continue"}
      </Button>
    </FlowCard>
  );
}

// Generate TipTap memo content from draft data
function generateMemoContent(data: DraftData): any {
  const content: any[] = [];

  // Helper to add a section
  const addSection = (title: string, text?: string) => {
    // Heading
    content.push({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: title }]
    });
    // Paragraph
    if (text) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text }]
      });
    } else {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: "[Add content here]" }]
      });
    }
    // Spacing
    content.push({ type: "paragraph" });
  };

  // Company title at top
  if (data.company_name) {
    content.push({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: data.company_name }]
    });
    if (data.one_liner) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: data.one_liner }]
      });
    }
    content.push({ type: "paragraph" });
  }

  // All memo sections
  addSection("Vision", "[Describe your long-term ambition and what the company achieves at scale]");
  addSection("Problem", data.problem);
  addSection("Solution", data.solution);
  addSection("Product", "[Describe what exists today, how it works, and what users do with it]");
  addSection("Timing", data.market_insight || "[Why is this the right moment for this product?]");
  addSection("Market", data.tam ? `Total Addressable Market: ${data.tam}` : "[Define your market opportunity]");
  addSection("Competition", "[How is this problem solved today and why do alternatives fall short?]");
  addSection("Advantages", "[What makes your company meaningfully better than substitutes?]");
  addSection("Model", data.revenue_model || "[How does the business make money?]");
  addSection("Economics", data.pricing ? `Pricing: ${data.pricing}` : "[Describe cost structure and unit economics]");
  addSection("Distribution", "[How are customers acquired, activated, retained, and expanded?]");
  addSection("Traction", data.key_metrics || "[List proof points: demand, usage, revenue, partnerships, growth]");
  addSection("Team", data.founders || "[Why is this team uniquely positioned to win?]");
  addSection("Funding", data.raising ? `Raising: ${data.raising}` : "[What has been raised and what is being raised now?]");
  addSection("Roadmap", data.use_of_funds || "[What will be built next and what milestones will this capital achieve?]");

  return {
    type: "doc",
    content
  };
}

// Accumulated terms data
interface TermsData {
  valuation_cap?: string;
  discount_rate?: string;
  mfn_enabled?: boolean;
  pro_rata_enabled?: boolean;
  minimum_ticket?: string;
  wire_instructions?: string;
}

// Docket terms setup wizard flow
function DocketTermsFlow({
  step,
  onNext,
  isLoading,
  isComplete,
  accumulatedData,
  isHistorical,
}: {
  step: number;
  onNext: (data: Record<string, any>) => void;
  isLoading: boolean;
  isComplete: boolean;
  accumulatedData: TermsData;
  isHistorical?: boolean;
}) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const STEPS = [
    {
      title: "Valuation & Discount",
      fields: [
        { key: "valuation_cap", label: "Valuation Cap", placeholder: "10000000", prefix: "$", type: "number" },
        { key: "discount_rate", label: "Discount Rate (%)", placeholder: "20", type: "number" },
      ]
    },
    {
      title: "Investor Rights",
      fields: [
        { key: "mfn_enabled", label: "MFN (Most Favored Nation)", type: "switch" },
        { key: "pro_rata_enabled", label: "Pro-rata Rights", type: "switch" },
      ]
    },
    {
      title: "Investment Terms",
      fields: [
        { key: "minimum_ticket", label: "Minimum Investment", placeholder: "25000", prefix: "$", type: "number" },
      ]
    },
    {
      title: "Wire Instructions",
      fields: [
        { key: "wire_instructions", label: "Wire Instructions", placeholder: "Bank name, account number, routing number...", type: "textarea" },
      ]
    },
  ];

  // Pre-fill form with accumulated data when step changes
  useEffect(() => {
    const currentStep = STEPS[step];
    if (currentStep) {
      const prefilled: Record<string, any> = {};
      currentStep.fields.forEach(f => {
        const val = accumulatedData[f.key as keyof TermsData];
        if (val !== undefined) {
          prefilled[f.key] = val;
        }
      });
      setFormData(prev => ({ ...prefilled, ...prev }));
    }
  }, [step, accumulatedData]);

  if (isComplete || isHistorical) {
    return (
      <div className={cn("rounded-xl border border-border p-4", isHistorical && "bg-secondary/30 opacity-60")}>
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-green-600" />
          <span className="font-medium">Terms configured</span>
          {accumulatedData.valuation_cap && (
            <span className="text-muted-foreground">- ${Number(accumulatedData.valuation_cap).toLocaleString()} cap</span>
          )}
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step];
  if (!currentStep) return null;

  // Check if step is valid - for switches, they're always valid
  const isStepValid = currentStep.fields.every(f => {
    if (f.type === "switch") return true;
    return formData[f.key]?.toString().trim();
  });

  return (
    <FlowCard title={`Terms Setup - ${currentStep.title}`}>
      <div className="text-xs text-muted-foreground mb-3">
        Step {step + 1} of {STEPS.length}
      </div>
      
      <div className="space-y-4">
        {currentStep.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            {field.type === "switch" ? (
              <div className="flex items-center justify-between py-2">
                <Label className="text-sm">{field.label}</Label>
                <Switch
                  checked={formData[field.key] || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [field.key]: checked }))}
                />
              </div>
            ) : field.type === "textarea" ? (
              <>
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <Textarea
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={4}
                  className="text-sm resize-none bg-background"
                />
              </>
            ) : (
              <>
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <div className="relative">
                  {field.prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {field.prefix}
                    </span>
                  )}
                  <Input
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    type={field.type}
                    className={cn("bg-background", field.prefix && "pl-7")}
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Button 
        size="sm" 
        onClick={() => onNext(formData)} 
        disabled={!isStepValid || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : step === STEPS.length - 1 ? (
          <Check className="w-4 h-4 mr-2" />
        ) : null}
        {step === STEPS.length - 1 ? "Save Terms" : "Continue"}
      </Button>
    </FlowCard>
  );
}

// Add Investor flow
interface InvestorFormData {
  name?: string;
  email?: string;
  entity_name?: string;
  entity_type?: string;
  address?: string;
}

function AddInvestorFlow({
  onSubmit,
  isLoading,
  isComplete,
  isHistorical,
  savedData,
}: {
  onSubmit: (data: InvestorFormData) => void;
  isLoading: boolean;
  isComplete: boolean;
  isHistorical?: boolean;
  savedData?: InvestorFormData;
}) {
  const [formData, setFormData] = useState<InvestorFormData>({
    entity_type: "individual",
    ...savedData,
  });

  if (isComplete || isHistorical) {
    return (
      <div className={cn("rounded-xl border border-border p-4", isHistorical && "bg-secondary/30 opacity-60")}>
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-green-600" />
          <span className="font-medium">Investor added</span>
          {(savedData?.name || formData.name) && (
            <span className="text-muted-foreground">- {savedData?.name || formData.name}</span>
          )}
        </div>
      </div>
    );
  }

  const ENTITY_TYPES = [
    { value: "individual", label: "Individual" },
    { value: "llc", label: "LLC" },
    { value: "corporation", label: "Corporation" },
    { value: "partnership", label: "Partnership" },
    { value: "trust", label: "Trust" },
  ];

  return (
    <FlowCard title="Add Investor">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Name *</Label>
          <Input
            value={formData.name || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Sequoia Capital"
            className="bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Email</Label>
          <Input
            value={formData.email || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="partner@sequoia.com"
            type="email"
            className="bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Entity Name</Label>
          <Input
            value={formData.entity_name || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, entity_name: e.target.value }))}
            placeholder="Sequoia Capital Operations LLC"
            className="bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Entity Type</Label>
          <RadioGroup 
            value={formData.entity_type || "individual"} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, entity_type: v }))}
            className="grid grid-cols-2 gap-1.5"
          >
            {ENTITY_TYPES.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                  formData.entity_type === opt.value 
                    ? "border-foreground bg-foreground/5" 
                    : "border-border hover:bg-secondary/50"
                )}
              >
                <RadioGroupItem value={opt.value} className="h-3 w-3" />
                {opt.label}
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Address</Label>
          <Textarea
            value={formData.address || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="2800 Sand Hill Road, Menlo Park, CA 94025"
            rows={2}
            className="text-sm resize-none bg-background"
          />
        </div>
      </div>

      <Button 
        size="sm" 
        onClick={() => onSubmit(formData)} 
        disabled={!formData.name?.trim() || isLoading}
        className="w-full"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
        Add Investor
      </Button>
    </FlowCard>
  );
}

// Welcome messages for each page
const WELCOME_MESSAGES: Record<PageKey, string> = {
  stage: "Welcome to Circuit. I'll help you manage your fundraising rounds. Use the actions below to open a new round or close your current one.",
  memo: "Your investor memo editor. Use the actions below to draft, publish, and share your memo with investors.",
  docket: "Your docket contains all deal documents. Set up your terms below to get started.",
  pipeline: "Track your investor pipeline here. Add investors and manage your fundraising relationships.",
};

export default function ActionChatPanel({ pageKey, roundId, roundSlug, onOpenRound, onUpdateMemoContent, hasMemoContent, currentMemoContent }: ActionChatPanelProps) {
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading } = useFounderAuth();
  const queryClient = useQueryClient();
  const { hasOpenRound, openRound } = useRounds();
  const { investors } = useInvestors();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Track which flow card ID is currently being edited (interactive)
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  
  // Local state for the currently active flow
  const [draftStep, setDraftStep] = useState(0);
  const [draftData, setDraftData] = useState<DraftData>({});
  const [termsStep, setTermsStep] = useState(0);
  const [termsData, setTermsData] = useState<TermsData>({});
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, { url: string; key: string }>>({});
  
  // Edit memo dialog state
  const [editMemoOpen, setEditMemoOpen] = useState(false);
  const [editMemoPrompt, setEditMemoPrompt] = useState("");

  // Fetch messages from DB
  const { data: messages = [] } = useQuery({
    queryKey: ["action-messages", user?.id, pageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("action_messages")
        .select("*")
        .eq("user_id", user!.id)
        .eq("page_key", pageKey)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw error;
      return (data || []) as ActionMessage[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });

  // On mount, restore the active flow from database if there's an incomplete one
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || isProcessing || messages.length === 0) return;
    
    // Find the most recent incomplete flow card
    const incompleteFlow = [...messages]
      .reverse()
      .find(m => m.message_type === "card" && m.flow_type && m.flow_complete !== true);
    
    if (incompleteFlow) {
      hasInitialized.current = true;
      setActiveFlowId(incompleteFlow.id);
      
      const step = incompleteFlow.flow_step ?? 0;
      const data = (incompleteFlow.flow_data || {}) as Record<string, any>;
      
      if (incompleteFlow.flow_type === "draft-memo") {
        setDraftStep(step);
        setDraftData(data as DraftData);
      } else if (incompleteFlow.flow_type === "setup-terms") {
        setTermsStep(step);
        setTermsData(data as TermsData);
      }
    } else {
      hasInitialized.current = true;
    }
  }, [messages, isProcessing]);

  // Display messages with welcome fallback
  const displayMessages = messages.length === 0 
    ? [{ id: "welcome", message_type: "system" as const, content: WELCOME_MESSAGES[pageKey], created_at: new Date().toISOString() }]
    : messages;

  useEffect(() => {
    // ScrollArea uses a viewport element inside, we need to find it
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [displayMessages, activeFlowId]);

  const addMessage = async (type: ActionMessage["message_type"], content: string, metadata?: Json) => {
    if (!user) return;
    
    await supabase.from("action_messages").insert({
      user_id: user.id,
      page_key: pageKey,
      message_type: type,
      content,
      metadata: metadata || {},
    });
    
    queryClient.invalidateQueries({ queryKey: ["action-messages", user.id, pageKey] });
  };

  const createFlowCard = async (flowType: string): Promise<string | null> => {
    if (!user) return null;
    
    const { data: inserted } = await supabase
      .from("action_messages")
      .insert({
        user_id: user.id,
        page_key: pageKey,
        message_type: "card",
        content: `Started ${flowType}`,
        flow_type: flowType,
        flow_step: 0,
        flow_data: {},
        flow_complete: false,
      })
      .select("id")
      .single();
    
    queryClient.invalidateQueries({ queryKey: ["action-messages", user.id, pageKey] });
    return inserted?.id || null;
  };

  const updateFlowCard = async (messageId: string, step: number, data: Record<string, any>, complete: boolean) => {
    await supabase
      .from("action_messages")
      .update({
        flow_step: step,
        flow_data: data,
        flow_complete: complete,
      })
      .eq("id", messageId);
    
    queryClient.invalidateQueries({ queryKey: ["action-messages", user?.id, pageKey] });
  };

  // Actions
  const handleOpenRound = async () => {
    if (hasOpenRound) {
      await addMessage("system", "You can only have one open round at a time. Please close your current round before opening a new one.");
      return;
    }
    if (onOpenRound) {
      onOpenRound();
    }
  };

  const handleCloseRound = async () => {
    if (!hasOpenRound || !openRound) {
      addMessage("system", "You don't have an open round to close.");
      return;
    }
    const cardId = await createFlowCard("close-round");
    if (cardId) {
      setActiveFlowId(cardId);
    }
  };

  const confirmCloseRound = async (reason: string, notes: string) => {
    if (!openRound || !activeFlowId) return;
    setIsProcessing(true);
    setProcessingAction("close-round");
    
    try {
      const { error } = await supabase
        .from("rounds")
        .update({
          state: "closed",
          closure_reason: reason,
          closure_notes: notes || null,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", openRound.id);

      if (error) throw error;

      await updateFlowCard(activeFlowId, 1, { reason, notes }, true);
      await addMessage("result", `Round "${openRound.name}" has been closed successfully.`);
      setActiveFlowId(null);
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Round closed" });
    } catch (error) {
      toast({ 
        title: "Failed to close round", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handlePublish = async () => {
    if (!roundId) {
      toast({ title: "No round selected", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    setProcessingAction("publish");
    
    try {
      // Create a new card for this publish action - mark it complete immediately
      // so it shows as a historical card, not an active one being edited
      const cardId = await createFlowCard("publish");
      if (cardId) {
        await updateFlowCard(cardId, 0, {}, false); // Not complete - it's an interactive publish card
      }
      // Don't set activeFlowId - each publish creates its own card that persists
      await addMessage("result", "Your memo has been published to your share subdomain.");
      toast({ title: "Published successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to publish", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleDraftMemo = async () => {
    // If memo already exists, open edit dialog instead
    if (hasMemoContent) {
      setEditMemoOpen(true);
      return;
    }
    
    setDraftStep(0);
    setDraftData({});
    hasInitialized.current = true; // Prevent re-initialization
    const cardId = await createFlowCard("draft-memo");
    if (cardId) {
      setActiveFlowId(cardId);
    }
  };

  const handleEditMemoSubmit = async () => {
    if (!editMemoPrompt.trim() || !currentMemoContent) return;
    
    setIsProcessing(true);
    setEditMemoOpen(false);
    
    // Add user message to chat
    await addMessage("user", editMemoPrompt);
    await addMessage("confirmation", "Editing your memo...");
    
    try {
      // Call the AI edge function with edit instructions
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke("draft-memo-ai", {
        body: { 
          editMode: true,
          editPrompt: editMemoPrompt,
          currentContent: currentMemoContent,
        }
      });

      if (aiError) {
        console.error("[EditMemo] AI function error:", aiError);
        throw aiError;
      }
      
      if (!aiResponse?.content) {
        throw new Error("No content returned from AI");
      }

      // Update memo content
      if (onUpdateMemoContent) {
        await onUpdateMemoContent(aiResponse.content);
      }
      
      await addMessage("result", "Your memo has been updated based on your instructions.");
      toast({ title: "Memo updated" });
    } catch (error) {
      console.error("[EditMemo] Error:", error);
      await addMessage("result", "Failed to edit memo. Please try again.");
      toast({ 
        title: "Failed to edit memo", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setEditMemoPrompt("");
    }
  };

  const handleDraftNext = async (data: Record<string, string>) => {
    if (!activeFlowId) return;
    
    const totalSteps = 8;
    
    // Accumulate data across steps
    const newDraftData = { ...draftData, ...data };
    setDraftData(newDraftData);
    
    if (draftStep < totalSteps - 1) {
      const nextStep = draftStep + 1;
      setDraftStep(nextStep);
      await updateFlowCard(activeFlowId, nextStep, newDraftData, false);
    } else {
      // Mark flow as complete
      await updateFlowCard(activeFlowId, totalSteps, newDraftData, true);
      setActiveFlowId(null);
      
      // Show responses recorded message
      await addMessage("confirmation", "Responses recorded. Generating your memo...");
      
      // Start AI generation
      setIsProcessing(true);
      try {
        // Prepare data for AI
        const aiPayload = {
          companyName: newDraftData.company_name,
          oneLiner: newDraftData.one_liner,
          founded: newDraftData.founded,
          roundType: openRound?.round_type || "seed",
          targetRaise: openRound?.target_raise?.toString() || newDraftData.raising,
          problem: newDraftData.problem,
          solution: newDraftData.solution,
          tam: newDraftData.tam,
          marketInsight: newDraftData.market_insight,
          revenueModel: newDraftData.revenue_model,
          pricing: newDraftData.pricing,
          keyMetrics: newDraftData.key_metrics,
          founders: newDraftData.founders,
          useOfFunds: newDraftData.use_of_funds,
        };

        console.log("[DraftMemo] Calling AI with payload:", aiPayload);
        
        // Call the AI edge function
        const { data: aiResponse, error: aiError } = await supabase.functions.invoke("draft-memo-ai", {
          body: { draftData: aiPayload }
        });

        if (aiError) {
          console.error("[DraftMemo] AI function error:", aiError);
          throw aiError;
        }
        
        console.log("[DraftMemo] AI response received:", aiResponse);
        
        if (!aiResponse?.content) {
          console.error("[DraftMemo] No content in response:", aiResponse);
          throw new Error("No content returned from AI");
        }

        // Call the callback to update memo content
        if (onUpdateMemoContent) {
          console.log("[DraftMemo] Calling onUpdateMemoContent with content");
          await onUpdateMemoContent(aiResponse.content);
        } else {
          console.error("[DraftMemo] onUpdateMemoContent callback not provided!");
        }
        
        await addMessage("result", "Your memo has been drafted by AI. Click 'Edit' to review and customize it.");
        toast({ title: "Memo drafted with AI" });
      } catch (error) {
        console.error("[DraftMemo] AI memo generation error:", error);
        
        // Fallback to template-based generation
        const fallbackContent = generateMemoContent(newDraftData);
        if (onUpdateMemoContent) {
          console.log("[DraftMemo] Using fallback template");
          await onUpdateMemoContent(fallbackContent);
        }
        
        await addMessage("result", "Your memo structure has been generated. Click 'Edit' to customize your memo.");
        toast({ 
          title: "Memo template generated", 
          description: "AI generation failed, using template instead." 
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSetupTerms = async () => {
    setTermsStep(0);
    setTermsData({});
    const cardId = await createFlowCard("setup-terms");
    if (cardId) {
      setActiveFlowId(cardId);
    }
  };

  const handleTermsNext = async (data: Record<string, any>) => {
    if (!activeFlowId) return;
    
    const totalSteps = 4;
    
    // Accumulate data across steps
    const newTermsData = { ...termsData, ...data };
    setTermsData(newTermsData);
    
    if (termsStep < totalSteps - 1) {
      const nextStep = termsStep + 1;
      setTermsStep(nextStep);
      await updateFlowCard(activeFlowId, nextStep, newTermsData, false);
    } else {
      // Complete - save terms to database
      setIsProcessing(true);
      try {
        if (!roundId) throw new Error("No round selected");

        // Upsert round_terms
        const { error } = await supabase
          .from("round_terms")
          .upsert({
            round_id: roundId,
            valuation_cap: newTermsData.valuation_cap ? parseFloat(newTermsData.valuation_cap) : null,
            discount_rate: newTermsData.discount_rate ? parseFloat(newTermsData.discount_rate) : null,
            mfn_enabled: newTermsData.mfn_enabled || false,
            pro_rata_enabled: newTermsData.pro_rata_enabled || false,
            minimum_ticket: newTermsData.minimum_ticket ? parseFloat(newTermsData.minimum_ticket) : null,
            wire_instructions: newTermsData.wire_instructions || null,
          }, { onConflict: 'round_id' });

        if (error) throw error;
        
        await updateFlowCard(activeFlowId, totalSteps, newTermsData, true);
        await addMessage("result", "Your round terms have been saved. You can now create dockets for investors.");
        setActiveFlowId(null);
        queryClient.invalidateQueries({ queryKey: ["round-terms"] });
        toast({ title: "Terms saved" });
      } catch (error) {
        toast({ 
          title: "Failed to save terms", 
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive" 
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleAddInvestor = async () => {
    const cardId = await createFlowCard("add-investor");
    if (cardId) {
      setActiveFlowId(cardId);
    }
  };

  const confirmAddInvestor = async (data: InvestorFormData) => {
    if (!openRound || !data.name?.trim() || !activeFlowId) return;
    
    setIsProcessing(true);
    setProcessingAction("add-investor");
    
    try {
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 30);

      const { error } = await supabase.from("investors").insert({
        name: data.name.trim(),
        slug,
        email: data.email?.trim() || null,
        entity_name: data.entity_name?.trim() || null,
        entity_type: data.entity_type || "individual",
        address: data.address?.trim() || null,
        workspace_id: openRound.workspace_id,
      });

      if (error) throw error;

      await updateFlowCard(activeFlowId, 1, data, true);
      await addMessage("result", `${data.name} has been added to your pipeline.`);
      setActiveFlowId(null);
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      toast({ title: "Investor added" });
    } catch (error) {
      toast({ 
        title: "Failed to add investor", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const generateInvestorLink = async (investorId: string, investorName: string) => {
    if (!roundId) return;
    
    setIsProcessing(true);
    
    try {
      const { data: keyData, error: keyError } = await supabase.functions.invoke("generate-access-key", {
        body: { roundId, investorId, tool: "memo" }
      });

      if (keyError) throw keyError;

      const shareUrl = profile?.company_slug && roundSlug
        ? `${window.location.origin}/share/${profile.company_slug}/${roundSlug}/memo?key=${keyData.key}`
        : `${window.location.origin}/share/${roundSlug}/memo?key=${keyData.key}`;
      
      setGeneratedLinks(prev => ({
        ...prev,
        [investorId]: { url: shareUrl, key: keyData.key }
      }));
      
      await addMessage("result", `Link generated for ${investorName}`);
      
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["access-keys"] });
      toast({ title: `Link created for ${investorName}` });
    } catch (error) {
      toast({ 
        title: "Failed to generate link", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Render a flow card from a database message
  const renderFlowCard = (msg: ActionMessage) => {
    const isActive = msg.id === activeFlowId && !msg.flow_complete;
    const isComplete = msg.flow_complete === true;
    const isHistorical = !isActive && isComplete;
    const flowData = (msg.flow_data || {}) as Record<string, any>;
    const step = msg.flow_step ?? 0;

    switch (msg.flow_type) {
      case "close-round":
        return (
          <CloseRoundFlow
            roundName={openRound?.name || "Round"}
            onConfirm={confirmCloseRound}
            isLoading={isProcessing && isActive}
            isComplete={isComplete}
            isHistorical={isHistorical}
            savedData={flowData as { reason?: string; notes?: string }}
          />
        );
      case "publish":
        return roundId ? (
          <PublishFlow
            roundId={roundId}
            roundSlug={roundSlug}
            companySlug={profile?.company_slug || undefined}
            investors={investors}
            onGenerateInvestorLink={generateInvestorLink}
            isLoading={isProcessing && isActive}
            generatedLinks={generatedLinks}
            isHistorical={isHistorical}
          />
        ) : null;
      case "draft-memo":
        return (
          <DraftMemoFlow
            step={isActive ? draftStep : step}
            onNext={handleDraftNext}
            isLoading={isProcessing && isActive}
            isComplete={isComplete}
            accumulatedData={isActive ? draftData : (flowData as DraftData)}
            isHistorical={isHistorical}
          />
        );
      case "setup-terms":
        return (
          <DocketTermsFlow
            step={isActive ? termsStep : step}
            onNext={handleTermsNext}
            isLoading={isProcessing && isActive}
            isComplete={isComplete}
            accumulatedData={isActive ? termsData : (flowData as TermsData)}
            isHistorical={isHistorical}
          />
        );
      case "add-investor":
        return (
          <AddInvestorFlow
            onSubmit={confirmAddInvestor}
            isLoading={isProcessing && isActive}
            isComplete={isComplete}
            isHistorical={isHistorical}
            savedData={flowData as InvestorFormData}
          />
        );
      default:
        return null;
    }
  };

  // Action buttons per page
  const getActionButtons = () => {
    const isButtonDisabled = (actionKey: string) => {
      return isProcessing && processingAction === actionKey;
    };

    // Check if there's an active flow for this action type
    const hasActiveFlow = (flowType: string) => {
      if (!activeFlowId) return false;
      const activeMsg = messages.find(m => m.id === activeFlowId);
      return activeMsg?.flow_type === flowType && activeMsg?.flow_complete !== true;
    };

    switch (pageKey) {
      case "stage":
        return [
          { 
            key: "open-round",
            label: "Open Round", 
            icon: Unlock, 
            onClick: handleOpenRound, 
            disabled: hasOpenRound || isButtonDisabled("open-round")
          },
          { 
            key: "close-round",
            label: "Close Round", 
            icon: Lock, 
            onClick: handleCloseRound, 
            disabled: !hasOpenRound || isButtonDisabled("close-round") || hasActiveFlow("close-round")
          },
        ];
      case "memo":
        return [
          { 
            key: "draft-memo",
            label: hasMemoContent ? "Edit Draft" : "Draft Memo", 
            icon: hasMemoContent ? Pencil : FileEdit, 
            onClick: handleDraftMemo,
            disabled: isButtonDisabled("draft-memo") || hasActiveFlow("draft-memo")
          },
          { 
            key: "publish",
            label: "Publish", 
            icon: Globe, 
            onClick: handlePublish,
            disabled: isButtonDisabled("publish") // Publish always creates new card, no hasActiveFlow check
          },
        ];
      case "docket":
        return [
          { 
            key: "setup-terms",
            label: "Setup Terms", 
            icon: Settings, 
            onClick: handleSetupTerms,
            disabled: isButtonDisabled("setup-terms") || hasActiveFlow("setup-terms")
          },
          { 
            key: "publish",
            label: "Publish", 
            icon: Globe, 
            onClick: handlePublish,
            disabled: isButtonDisabled("publish") // Publish always creates new card, no hasActiveFlow check
          },
        ];
      case "pipeline":
        return [
          { 
            key: "add-investor",
            label: "Add Investor", 
            icon: UserPlus, 
            onClick: handleAddInvestor,
            // Only disable if processing or if there's an active incomplete add-investor flow
            disabled: !hasOpenRound || isButtonDisabled("add-investor") || hasActiveFlow("add-investor")
          },
        ];
      default:
        return [];
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
        <p className="text-sm font-medium mb-1">Circuit</p>
        <p className="text-xs text-muted-foreground">Sign in to continue</p>
      </div>
    );
  }

  const actionButtons = getActionButtons();

  // Format timestamp
  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "h:mm a");
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-6 overscroll-contain" ref={scrollRef}>
        <div className="space-y-6">
          {displayMessages.map((msg) => (
            <div key={msg.id} className="space-y-1.5">
              {/* Card type messages - render the flow component */}
              {msg.message_type === "card" && msg.flow_type ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Circuit</span>
                    <span>·</span>
                    <span>{formatTime(msg.created_at)}</span>
                  </div>
                  {renderFlowCard(msg)}
                </div>
              ) : (
                <>
                  {/* Header with Circuit label and timestamp */}
                  {msg.message_type !== "user" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Circuit</span>
                      <span>·</span>
                      <span>{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div
                    className={cn(
                      "rounded-xl px-4 py-3 text-sm leading-relaxed",
                      msg.message_type === "user" 
                        ? "bg-foreground text-background ml-8" 
                        : "bg-secondary/70 text-foreground mr-4",
                      msg.message_type === "result" && "bg-[hsl(var(--assistant-accent))] text-[hsl(var(--assistant-accent-foreground))]",
                      msg.message_type === "confirmation" && "bg-gradient-to-r from-secondary/70 via-secondary to-secondary/70 animate-shimmer bg-[length:200%_100%]"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer with action buttons - no border, positioned higher */}
      <div className="px-6 pb-8">
        <div className="flex items-center gap-2 flex-wrap">
          {actionButtons.map((btn) => (
            <Button
              key={btn.key}
              size="sm"
              onClick={btn.onClick}
              disabled={btn.disabled}
              className={cn(
                "h-8 text-xs gap-1.5 transition-all",
                "bg-foreground text-background hover:bg-foreground/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {processingAction === btn.key ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <btn.icon className="w-3.5 h-3.5" />
              )}
              {btn.label}
            </Button>
          ))}
        </div>
      </div>
      {/* Edit Memo Dialog */}
      <Dialog open={editMemoOpen} onOpenChange={setEditMemoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Memo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Describe the changes you'd like to make to your memo.
            </p>
            <Textarea
              value={editMemoPrompt}
              onChange={(e) => setEditMemoPrompt(e.target.value)}
              placeholder="e.g., Make the problem section more concise, add more traction metrics, strengthen the competitive advantages..."
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemoOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditMemoSubmit} 
              disabled={!editMemoPrompt.trim() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Pencil className="w-4 h-4 mr-2" />
              )}
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
