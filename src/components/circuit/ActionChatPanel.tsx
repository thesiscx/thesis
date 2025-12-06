import { useState, useRef, useEffect } from "react";
import { Loader2, Link2, Lock, Unlock, Check, X, Users } from "lucide-react";
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

type PageKey = "stage" | "memo" | "docket" | "pipeline";

interface ActionMessage {
  id: string;
  message_type: "system" | "action" | "confirmation" | "result";
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface ActionChatPanelProps {
  pageKey: PageKey;
  roundId?: string;
  roundSlug?: string;
}

// Close round flow card
function CloseRoundFlow({ 
  roundName, 
  onConfirm, 
  onCancel 
}: { 
  roundName: string; 
  onConfirm: (reason: string, notes: string) => void;
  onCancel: () => void;
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
    <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-border">
      <div className="text-sm font-medium">Close {roundName}</div>
      
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Why are you closing this round?</Label>
        <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
          {CLOSURE_REASONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors",
                reason === opt.value ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted/50"
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
          className="text-sm resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1 h-7 text-xs">
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={() => onConfirm(reason, notes)} 
          disabled={!reason}
          className="flex-1 h-7 text-xs"
        >
          <Check className="w-3 h-3 mr-1" />
          Close Round
        </Button>
      </div>
    </div>
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
    <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
      <div className="text-sm font-medium">Generate Share Link</div>
      
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Investor Name</Label>
        <Input
          value={investorName}
          onChange={(e) => setInvestorName(e.target.value)}
          placeholder="e.g. Sequoia Capital"
          className="text-sm h-8"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1 h-7 text-xs" disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={() => onGenerate(investorName)} 
          disabled={!investorName.trim() || isLoading}
          className="flex-1 h-7 text-xs"
        >
          {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Link2 className="w-3 h-3 mr-1" />}
          Generate
        </Button>
      </div>
    </div>
  );
}

// Welcome messages for each page
const WELCOME_MESSAGES: Record<PageKey, string> = {
  stage: "Welcome to Circuit. Manage your fundraising rounds here.",
  memo: "Your investor memo editor. Draft, edit, and share.",
  docket: "Your docket contains all deal documents.",
  pipeline: "Track your investor pipeline here.",
};

export default function ActionChatPanel({ pageKey, roundId, roundSlug }: ActionChatPanelProps) {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useFounderAuth();
  const queryClient = useQueryClient();
  const { hasOpenRound, openRound } = useRounds();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  console.log(`[ActionChatPanel] Render: pageKey=${pageKey}, userId=${user?.id?.slice(0, 8) || 'none'}, authLoading=${authLoading}`);

  // Fetch messages from DB
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["action-messages", user?.id, pageKey],
    queryFn: async () => {
      console.log(`[ActionChatPanel] Fetching messages for ${pageKey}...`);
      const { data, error } = await supabase
        .from("action_messages")
        .select("*")
        .eq("user_id", user!.id)
        .eq("page_key", pageKey)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error(`[ActionChatPanel] Query error:`, error);
        throw error;
      }
      console.log(`[ActionChatPanel] Got ${data?.length || 0} messages`);
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

  // Actions
  const handleOpenRound = () => {
    if (hasOpenRound) {
      addMessage("system", "You can only have one open round at a time. Please close your current round before opening a new one.");
    } else {
      addMessage("action", "Opening new round dialog...");
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
    }
  };

  const handleGenerateLink = () => {
    setActiveFlow("generate-link");
  };

  const generateShareLink = async (investorName: string) => {
    if (!roundId) {
      toast({ title: "No round selected", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    
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
    } catch (error) {
      toast({ 
        title: "Failed to generate link", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setActiveFlow(null);
      setIsProcessing(false);
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
      default:
        return null;
    }
  };

  // Action buttons per page
  const getActionButtons = () => {
    switch (pageKey) {
      case "stage":
        return [
          { label: "Open Round", icon: Unlock, onClick: handleOpenRound, disabled: hasOpenRound },
          { label: "Close Round", icon: Lock, onClick: handleCloseRound, disabled: !hasOpenRound },
        ];
      case "memo":
        return [
          { label: "Share Link", icon: Link2, onClick: handleGenerateLink },
        ];
      case "docket":
        return [
          { label: "Share Link", icon: Link2, onClick: handleGenerateLink },
        ];
      case "pipeline":
        return [
          { label: "Add Investor", icon: Users, onClick: () => addMessage("system", "Use the Add Investor button in the pipeline view.") },
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
      <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
        <p className="text-sm font-medium mb-1">Circuit</p>
        <p className="text-xs text-muted-foreground">Sign in to continue</p>
      </div>
    );
  }

  const actionButtons = getActionButtons();

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4" ref={scrollRef}>
        <div className="space-y-3">
          {displayMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                msg.message_type === "system" && "bg-muted text-muted-foreground",
                msg.message_type === "action" && "bg-muted text-foreground",
                msg.message_type === "result" && "bg-[hsl(var(--assistant-accent))] text-[hsl(var(--assistant-accent-foreground))]",
                msg.message_type === "confirmation" && "bg-muted border border-border"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          
          {renderActiveFlow()}
        </div>
      </ScrollArea>

      {/* Footer with action buttons */}
      <div className="px-5 py-3 border-t border-border flex items-center gap-2 flex-wrap">
        {actionButtons.map((btn) => (
          <Button
            key={btn.label}
            size="sm"
            onClick={btn.onClick}
            disabled={btn.disabled}
            className="h-7 text-xs bg-foreground text-background hover:bg-foreground/90 gap-1"
          >
            <btn.icon className="w-3 h-3" />
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
