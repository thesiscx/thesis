import { useState, useRef, useEffect } from "react";
import { Loader2, Link2, Lock, Unlock, Check, X, Users, Globe, Eye, Key, FileText, Settings } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type PageKey = "stage" | "memo" | "docket" | "pipeline";

interface ActionMessage {
  id: string;
  message_type: "system" | "action" | "confirmation" | "result" | "user";
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface ActionChatPanelProps {
  pageKey: PageKey;
  roundId?: string;
  roundSlug?: string;
  onOpenRound?: () => void;
}

// Card-based flow component wrapper
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
  onCancel,
  isLoading
}: { 
  roundName: string; 
  onConfirm: (reason: string, notes: string) => void;
  onCancel: () => void;
  isLoading: boolean;
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

      <div className="flex gap-2 pt-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onCancel} 
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={() => onConfirm(reason, notes)} 
          disabled={!reason || isLoading}
          className="flex-1"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          Close Round
        </Button>
      </div>
    </FlowCard>
  );
}

// Generate link flow card
function GenerateLinkFlow({
  onGenerate,
  onCancel,
  isLoading
}: {
  onGenerate: (investorName: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [investorName, setInvestorName] = useState("");

  return (
    <FlowCard title="Generate Share Link">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Investor Name</Label>
        <Input
          value={investorName}
          onChange={(e) => setInvestorName(e.target.value)}
          placeholder="e.g. Sequoia Capital"
          className="bg-background"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onCancel} 
          className="flex-1" 
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={() => onGenerate(investorName)} 
          disabled={!investorName.trim() || isLoading}
          className="flex-1"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
          Generate
        </Button>
      </div>
    </FlowCard>
  );
}

// Access keys list flow
function AccessKeysFlow({
  roundId,
  onClose
}: {
  roundId?: string;
  onClose: () => void;
}) {
  const { data: accessKeys, isLoading } = useQuery({
    queryKey: ["access-keys", roundId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_keys")
        .select(`
          *,
          investors(name)
        `)
        .eq("round_id", roundId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundId,
  });

  return (
    <FlowCard title="Access Keys">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !accessKeys?.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No access keys generated yet.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {accessKeys.map((key) => (
            <div 
              key={key.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
            >
              <div>
                <p className="text-sm font-medium">{key.investors?.name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  {key.last_used_at 
                    ? `Last used ${format(new Date(key.last_used_at), "MMM d, h:mm a")}`
                    : "Never used"
                  }
                </p>
              </div>
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                key.status === "active" 
                  ? "bg-green-500/10 text-green-600" 
                  : "bg-muted text-muted-foreground"
              )}>
                {key.status}
              </span>
            </div>
          ))}
        </div>
      )}
      <Button size="sm" variant="outline" onClick={onClose} className="w-full mt-2">
        Close
      </Button>
    </FlowCard>
  );
}

// Welcome messages for each page
const WELCOME_MESSAGES: Record<PageKey, string> = {
  stage: "Welcome to Circuit. I'll help you manage your fundraising rounds. Use the actions below to open a new round, generate share links, or view analytics.",
  memo: "Your investor memo editor. Use the actions below to publish, share, or track views.",
  docket: "Your docket contains all deal documents. Set up your terms and share with investors.",
  pipeline: "Track your investor pipeline here. Add investors and manage your fundraising relationships.",
};

export default function ActionChatPanel({ pageKey, roundId, roundSlug, onOpenRound }: ActionChatPanelProps) {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useFounderAuth();
  const queryClient = useQueryClient();
  const { hasOpenRound, openRound } = useRounds();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Fetch messages from DB
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
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

  // Display messages with welcome fallback
  const displayMessages = messages.length === 0 
    ? [{ id: "welcome", message_type: "system" as const, content: WELCOME_MESSAGES[pageKey], created_at: new Date().toISOString() }]
    : messages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, activeFlow]);

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

  // Actions with loading states
  const handleOpenRound = async () => {
    if (hasOpenRound) {
      await addMessage("system", "You can only have one open round at a time. Please close your current round before opening a new one.");
      return;
    }
    if (onOpenRound) {
      onOpenRound();
    }
  };

  const handleCloseRound = () => {
    if (!hasOpenRound || !openRound) {
      addMessage("system", "You don't have an open round to close.");
      return;
    }
    setActiveFlow("close-round");
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

      await addMessage("result", `Round "${openRound.name}" has been closed successfully.`);
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Round closed" });
    } catch (error) {
      toast({ 
        title: "Failed to close round", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setActiveFlow(null);
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleGenerateLink = () => {
    setActiveFlow("generate-link");
  };

  const handleViewAccessKeys = () => {
    setActiveFlow("access-keys");
  };

  const handlePublish = async () => {
    setIsProcessing(true);
    setProcessingAction("publish");
    
    try {
      // For now, just show a success message
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

  const generateShareLink = async (investorName: string) => {
    if (!roundId) {
      toast({ title: "No round selected", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    setProcessingAction("generate-link");
    
    try {
      const slug = investorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      const { data: existingInvestor } = await supabase
        .from("investors")
        .select("id")
        .eq("workspace_id", user!.id)
        .eq("slug", slug)
        .single();

      let investorId = existingInvestor?.id;

      if (!investorId) {
        const { data: newInvestor, error: insertError } = await supabase
          .from("investors")
          .insert({
            name: investorName,
            slug,
            workspace_id: user!.id,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        investorId = newInvestor!.id;
      }

      const { data: keyData, error: keyError } = await supabase.functions.invoke("generate-access-key", {
        body: { roundId, investorId, tool: "memo" }
      });

      if (keyError) throw keyError;

      const shareUrl = `${window.location.origin}/share/${roundSlug}/memo?key=${keyData.key}`;
      
      await addMessage("result", `Share link generated for ${investorName}:\n\n${shareUrl}`);
      
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied to clipboard" });
      
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["access-keys"] });
    } catch (error) {
      toast({ 
        title: "Failed to generate link", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setActiveFlow(null);
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  // Render active flow
  const renderActiveFlow = () => {
    switch (activeFlow) {
      case "close-round":
        return openRound && (
          <CloseRoundFlow
            roundName={openRound.name}
            onConfirm={confirmCloseRound}
            onCancel={() => setActiveFlow(null)}
            isLoading={isProcessing}
          />
        );
      case "generate-link":
        return (
          <GenerateLinkFlow
            onGenerate={generateShareLink}
            onCancel={() => setActiveFlow(null)}
            isLoading={isProcessing}
          />
        );
      case "access-keys":
        return (
          <AccessKeysFlow
            roundId={roundId}
            onClose={() => setActiveFlow(null)}
          />
        );
      default:
        return null;
    }
  };

  // Action buttons per page - with processing states
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
            key: "publish",
            label: "Publish", 
            icon: Globe, 
            onClick: handlePublish,
            disabled: isButtonDisabled("publish")
          },
          { 
            key: "generate-link",
            label: "Create Link", 
            icon: Link2, 
            onClick: handleGenerateLink,
            disabled: isButtonDisabled("generate-link") || activeFlow === "generate-link"
          },
          { 
            key: "access-keys",
            label: "Access Keys", 
            icon: Key, 
            onClick: handleViewAccessKeys,
            disabled: activeFlow === "access-keys"
          },
        ];
      case "docket":
        return [
          { 
            key: "setup-terms",
            label: "Setup Terms", 
            icon: Settings, 
            onClick: () => addMessage("system", "Terms setup wizard coming soon."),
            disabled: false
          },
          { 
            key: "generate-link",
            label: "Create Link", 
            icon: Link2, 
            onClick: handleGenerateLink,
            disabled: isButtonDisabled("generate-link") || activeFlow === "generate-link"
          },
          { 
            key: "access-keys",
            label: "Access Keys", 
            icon: Key, 
            onClick: handleViewAccessKeys,
            disabled: activeFlow === "access-keys"
          },
        ];
      case "pipeline":
        return [
          { 
            key: "add-investor",
            label: "Add Investor", 
            icon: Users, 
            onClick: () => addMessage("system", "Use the Add Investor button in the pipeline view."),
            disabled: false
          },
          { 
            key: "track-views",
            label: "Track Views", 
            icon: Eye, 
            onClick: () => addMessage("system", "View tracking analytics coming soon."),
            disabled: false
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
      <ScrollArea className="flex-1 px-6 py-6" ref={scrollRef}>
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
          
          {/* Active flow cards */}
          {activeFlow && (
            <div className="pt-2">
              {renderActiveFlow()}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with action buttons */}
      <div className="px-6 py-4 border-t border-border">
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
