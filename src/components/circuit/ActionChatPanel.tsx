import { useState, useRef, useEffect } from "react";
import { Loader2, Link2, Lock, Unlock, Check, Users, Globe, Key, FileEdit, Copy, Settings, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
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
}

// Card-based flow component wrapper - no close button, persistent
function FlowCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary/50 rounded-xl border border-border overflow-hidden">
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
  isComplete
}: { 
  roundName: string; 
  onConfirm: (reason: string, notes: string) => void;
  isLoading: boolean;
  isComplete: boolean;
}) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const CLOSURE_REASONS = [
    { value: "raised_funding", label: "Successfully raised funding" },
    { value: "paused", label: "Paused fundraising" },
    { value: "changed_plans", label: "Changed plans / pivoted" },
    { value: "merged", label: "Merged into another round" },
    { value: "other", label: "Other" },
  ];

  if (isComplete) {
    return (
      <FlowCard title={`Close ${roundName}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-green-600" />
          <span>Round closed successfully</span>
        </div>
      </FlowCard>
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
  generatedLinks
}: {
  roundId: string;
  roundSlug?: string;
  companySlug?: string;
  investors: { id: string; name: string; slug: string }[];
  onGenerateInvestorLink: (investorId: string, investorName: string) => void;
  isLoading: boolean;
  generatedLinks: Record<string, { url: string; key: string }>;
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

  return (
    <FlowCard title="Memo Published">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Public Share Link</Label>
          {publicUrl ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background px-3 py-2 rounded border border-border break-all">
                {publicUrl}
              </code>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => copyToClipboard(publicUrl)}
                className="shrink-0 h-8 w-8 p-0"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Complete your profile settings to enable public sharing.</p>
          )}
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Create Individual Investor Links</Label>
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
}: {
  step: number;
  onNext: (data: Record<string, string>) => void;
  isLoading: boolean;
  isComplete: boolean;
  accumulatedData: DraftData;
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

  if (isComplete) {
    return (
      <FlowCard title="Memo Draft Complete">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-green-600" />
          <span>Your memo structure has been added to the editor.</span>
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
        disabled={!isStepValid || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : step === STEPS.length - 1 ? (
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
}: {
  step: number;
  onNext: (data: Record<string, any>) => void;
  isLoading: boolean;
  isComplete: boolean;
  accumulatedData: TermsData;
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

  if (isComplete) {
    return (
      <FlowCard title="Terms Setup Complete">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-green-600" />
          <span>Your round terms have been saved.</span>
        </div>
      </FlowCard>
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
}: {
  onSubmit: (data: InvestorFormData) => void;
  isLoading: boolean;
  isComplete: boolean;
}) {
  const [formData, setFormData] = useState<InvestorFormData>({
    entity_type: "individual",
  });

  if (isComplete) {
    return (
      <FlowCard title="Add Investor">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-green-600" />
          <span>Investor added to your pipeline.</span>
        </div>
      </FlowCard>
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

export default function ActionChatPanel({ pageKey, roundId, roundSlug, onOpenRound, onUpdateMemoContent }: ActionChatPanelProps) {
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading } = useFounderAuth();
  const queryClient = useQueryClient();
  const { hasOpenRound, openRound } = useRounds();
  const { investors } = useInvestors();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [flowComplete, setFlowComplete] = useState<Record<string, boolean>>({});
  const [draftStep, setDraftStep] = useState(0);
  const [draftData, setDraftData] = useState<DraftData>({});
  const [termsStep, setTermsStep] = useState(0);
  const [termsData, setTermsData] = useState<TermsData>({});
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, { url: string; key: string }>>({});

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

  // Restore active flow from database on mount
  useEffect(() => {
    if (messages.length > 0) {
      // Find the most recent incomplete flow card
      const activeFlowMsg = [...messages]
        .reverse()
        .find(m => m.flow_type && m.flow_complete !== true);
      
      if (activeFlowMsg && activeFlowMsg.flow_type) {
        setActiveFlow(activeFlowMsg.flow_type);
        const step = activeFlowMsg.flow_step ?? 0;
        const data = (activeFlowMsg.flow_data || {}) as Record<string, any>;
        
        if (activeFlowMsg.flow_type === "draft-memo") {
          setDraftStep(step);
          setDraftData(data as DraftData);
        } else if (activeFlowMsg.flow_type === "setup-terms") {
          setTermsStep(step);
          setTermsData(data as TermsData);
        }
      }
    }
  }, [messages]);

  // Display messages with welcome fallback
  const displayMessages = messages.length === 0 
    ? [{ id: "welcome", message_type: "system" as const, content: WELCOME_MESSAGES[pageKey], created_at: new Date().toISOString() }]
    : messages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, activeFlow]);

  // Track current flow message ID for updates
  const [currentFlowMessageId, setCurrentFlowMessageId] = useState<string | null>(null);

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

  const saveFlowCard = async (flowType: string, step: number, data: Record<string, any>, complete: boolean) => {
    if (!user) return null;
    
    if (currentFlowMessageId) {
      // Update existing flow card
      await supabase
        .from("action_messages")
        .update({
          flow_step: step,
          flow_data: data,
          flow_complete: complete,
        })
        .eq("id", currentFlowMessageId);
    } else {
      // Create new flow card
      const { data: inserted } = await supabase
        .from("action_messages")
        .insert({
          user_id: user.id,
          page_key: pageKey,
          message_type: "card",
          content: `Started ${flowType} flow`,
          flow_type: flowType,
          flow_step: step,
          flow_data: data,
          flow_complete: complete,
        })
        .select("id")
        .single();
      
      if (inserted) {
        setCurrentFlowMessageId(inserted.id);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ["action-messages", user.id, pageKey] });
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
    setCurrentFlowMessageId(null);
    setActiveFlow("close-round");
    await saveFlowCard("close-round", 0, {}, false);
  };

  const confirmCloseRound = async (reason: string, notes: string) => {
    if (!openRound) return;
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

      await saveFlowCard("close-round", 1, { reason, notes }, true);
      await addMessage("result", `Round "${openRound.name}" has been closed successfully.`);
      setFlowComplete(prev => ({ ...prev, "close-round": true }));
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
      await addMessage("result", "Your memo has been published to your share subdomain.");
      setActiveFlow("publish");
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
    setDraftStep(0);
    setDraftData({});
    setCurrentFlowMessageId(null);
    setActiveFlow("draft-memo");
    await saveFlowCard("draft-memo", 0, {}, false);
  };

  const handleDraftNext = async (data: Record<string, string>) => {
    const totalSteps = 8;
    
    // Accumulate data across steps
    const newDraftData = { ...draftData, ...data };
    setDraftData(newDraftData);
    
    if (draftStep < totalSteps - 1) {
      const nextStep = draftStep + 1;
      setDraftStep(nextStep);
      await saveFlowCard("draft-memo", nextStep, newDraftData, false);
    } else {
      // Complete - call AI to generate memo content
      setIsProcessing(true);
      try {
        // Prepare data for AI
        const aiPayload = {
          companyName: newDraftData.company_name,
          roundType: openRound?.round_type || "seed",
          targetRaise: openRound?.target_raise?.toString() || "",
          problem: newDraftData.problem,
          solution: newDraftData.solution,
          highlights: [
            newDraftData.key_metrics,
            newDraftData.tam ? `TAM: ${newDraftData.tam}` : "",
            newDraftData.founders,
          ].filter(Boolean).join("\n\n"),
        };

        await addMessage("system", "Generating your memo with AI... This may take a moment.");
        
        // Call the AI edge function
        const { data: aiResponse, error: aiError } = await supabase.functions.invoke("draft-memo-ai", {
          body: { draftData: aiPayload }
        });

        if (aiError) throw aiError;
        
        if (!aiResponse?.content) {
          throw new Error("No content returned from AI");
        }

        // Call the callback to update memo content
        if (onUpdateMemoContent) {
          onUpdateMemoContent(aiResponse.content);
        }
        
        await saveFlowCard("draft-memo", totalSteps, newDraftData, true);
        await addMessage("result", "Your memo has been drafted by AI. Click 'Edit' to review and customize it.");
        setFlowComplete(prev => ({ ...prev, "draft-memo": true }));
        toast({ title: "Memo drafted with AI" });
      } catch (error) {
        console.error("AI memo generation error:", error);
        
        // Fallback to template-based generation
        const fallbackContent = generateMemoContent(newDraftData);
        if (onUpdateMemoContent) {
          onUpdateMemoContent(fallbackContent);
        }
        
        await saveFlowCard("draft-memo", totalSteps, newDraftData, true);
        await addMessage("result", "Your memo structure has been generated. Click 'Edit' to customize your memo.");
        setFlowComplete(prev => ({ ...prev, "draft-memo": true }));
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
    setCurrentFlowMessageId(null);
    setActiveFlow("setup-terms");
    await saveFlowCard("setup-terms", 0, {}, false);
  };

  const handleTermsNext = async (data: Record<string, any>) => {
    const totalSteps = 4;
    
    // Accumulate data across steps
    const newTermsData = { ...termsData, ...data };
    setTermsData(newTermsData);
    
    if (termsStep < totalSteps - 1) {
      const nextStep = termsStep + 1;
      setTermsStep(nextStep);
      await saveFlowCard("setup-terms", nextStep, newTermsData, false);
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
        
        await saveFlowCard("setup-terms", totalSteps, newTermsData, true);
        await addMessage("result", "Your round terms have been saved. You can now create dockets for investors.");
        setFlowComplete(prev => ({ ...prev, "setup-terms": true }));
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
    setCurrentFlowMessageId(null);
    setActiveFlow("add-investor");
    await saveFlowCard("add-investor", 0, {}, false);
  };

  const confirmAddInvestor = async (data: InvestorFormData) => {
    if (!openRound || !data.name?.trim()) return;
    
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

      await saveFlowCard("add-investor", 1, data, true);
      await addMessage("result", `${data.name} has been added to your pipeline.`);
      setFlowComplete(prev => ({ ...prev, "add-investor": true }));
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

  // Render active flow - no close buttons, persistent
  const renderActiveFlow = () => {
    switch (activeFlow) {
      case "close-round":
        return openRound && (
          <CloseRoundFlow
            roundName={openRound.name}
            onConfirm={confirmCloseRound}
            isLoading={isProcessing}
            isComplete={flowComplete["close-round"] || false}
          />
        );
      case "publish":
        return roundId && (
          <PublishFlow
            roundId={roundId}
            roundSlug={roundSlug}
            companySlug={profile?.company_slug || undefined}
            investors={investors}
            onGenerateInvestorLink={generateInvestorLink}
            isLoading={isProcessing}
            generatedLinks={generatedLinks}
          />
        );
      case "draft-memo":
        return (
          <DraftMemoFlow
            step={draftStep}
            onNext={handleDraftNext}
            isLoading={isProcessing}
            isComplete={flowComplete["draft-memo"] || false}
            accumulatedData={draftData}
          />
        );
      case "setup-terms":
        return (
          <DocketTermsFlow
            step={termsStep}
            onNext={handleTermsNext}
            isLoading={isProcessing}
            isComplete={flowComplete["setup-terms"] || false}
            accumulatedData={termsData}
          />
        );
      case "add-investor":
        return (
          <AddInvestorFlow
            onSubmit={confirmAddInvestor}
            isLoading={isProcessing}
            isComplete={flowComplete["add-investor"] || false}
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
            disabled: !hasOpenRound || isButtonDisabled("close-round") || activeFlow === "close-round"
          },
        ];
      case "memo":
        return [
          { 
            key: "draft-memo",
            label: "Draft Memo", 
            icon: FileEdit, 
            onClick: handleDraftMemo,
            disabled: isButtonDisabled("draft-memo") || activeFlow === "draft-memo"
          },
          { 
            key: "publish",
            label: "Publish", 
            icon: Globe, 
            onClick: handlePublish,
            disabled: isButtonDisabled("publish") || activeFlow === "publish"
          },
        ];
      case "docket":
        return [
          { 
            key: "setup-terms",
            label: "Setup Terms", 
            icon: Settings, 
            onClick: handleSetupTerms,
            disabled: isButtonDisabled("setup-terms") || activeFlow === "setup-terms"
          },
          { 
            key: "publish",
            label: "Publish", 
            icon: Globe, 
            onClick: handlePublish,
            disabled: isButtonDisabled("publish") || activeFlow === "publish"
          },
        ];
      case "pipeline":
        return [
          { 
            key: "add-investor",
            label: "Add Investor", 
            icon: UserPlus, 
            onClick: handleAddInvestor,
            disabled: !hasOpenRound || isButtonDisabled("add-investor") || activeFlow === "add-investor"
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
                  msg.message_type === "result" && "bg-[hsl(var(--assistant-accent))] text-[hsl(var(--assistant-accent-foreground))]"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {/* Active flow cards - persistent, no close */}
          {activeFlow && (
            <div className="pt-2">
              {renderActiveFlow()}
            </div>
          )}
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
    </div>
  );
}
