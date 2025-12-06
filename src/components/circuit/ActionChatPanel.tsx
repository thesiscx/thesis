import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Link2, Video, Pencil, FileText, FolderPlus, Lock, Unlock, Check, X, Users } from "lucide-react";
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

// Action button with shine effect
function ActionButton({ 
  onClick, 
  children, 
  icon: Icon,
  disabled 
}: { 
  onClick: () => void; 
  children: React.ReactNode; 
  icon: React.ElementType;
  disabled?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden bg-foreground text-background hover:bg-foreground/90",
        "transition-all duration-200 gap-2",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        "before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-500"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Button>
  );
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
    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
      <div className="text-sm font-medium">Close {roundName}</div>
      
      <div className="space-y-2">
        <Label className="text-xs">Why are you closing this round?</Label>
        <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
          {CLOSURE_REASONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm",
                reason === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional details..."
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1">
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={() => onConfirm(reason, notes)} 
          disabled={!reason}
          className="flex-1"
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
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="text-sm font-medium">Generate Share Link</div>
      
      <div className="space-y-2">
        <Label className="text-xs">Investor Name</Label>
        <Input
          value={investorName}
          onChange={(e) => setInvestorName(e.target.value)}
          placeholder="e.g. Sequoia Capital"
          className="text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1" disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={() => onGenerate(investorName)} 
          disabled={!investorName.trim() || isLoading}
          className="flex-1"
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
  stage: "Welcome to Circuit. Here you can manage your fundraising rounds. Open a new round when you're ready to raise, or close your current round when it's complete.",
  memo: "This is your investor memo editor. Draft your memo, make edits, add videos, or generate a unique share link for each investor.",
  docket: "Your docket contains all deal documents. Prepare documents, add new files, or share a secure link with investors.",
  pipeline: "Track your investor pipeline here. Add new investors, update their status, and manage your relationships.",
};

export default function ActionChatPanel({ pageKey, roundId, roundSlug }: ActionChatPanelProps) {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useFounderAuth();
  const queryClient = useQueryClient();
  const { hasOpenRound, openRound, closeRound } = useRounds();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  console.log(`[ActionChatPanel] Render: pageKey=${pageKey}, userId=${user?.id?.slice(0, 8) || 'none'}, authLoading=${authLoading}`);

  // Fetch messages for this page
  const { data: messages = [], isLoading: messagesLoading, isFetching } = useQuery({
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
    staleTime: 1000 * 60 * 5,
  });

  // Add welcome message if no messages exist
  const displayMessages = messages.length === 0 
    ? [{ id: "welcome", message_type: "system" as const, content: WELCOME_MESSAGES[pageKey], created_at: new Date().toISOString() }]
    : messages;

  // Auto-scroll to bottom
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

  // Stage page actions
  const handleOpenRound = () => {
    if (hasOpenRound) {
      addMessage("system", "You can only have one open round at a time. Please close your current round before opening a new one.");
    } else {
      // Navigate to create round (handled by parent)
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

  // Memo page actions
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
      // Create or find investor
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

      // Generate access key
      const { data: keyData, error: keyError } = await supabase.functions.invoke("generate-access-key", {
        body: { roundId, investorId, tool: "memo" }
      });

      if (keyError) throw keyError;

      const shareUrl = `${window.location.origin}/view/memo/${roundSlug}?key=${keyData.accessKey}`;
      
      await addMessage("result", `Share link generated for ${investorName}:\n\n${shareUrl}`);
      
      // Copy to clipboard
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

  const handleDraftMemo = () => {
    addMessage("system", "Use the editor on the left to draft your memo. You can add sections, format text, and include images.");
  };

  const handleEditSection = () => {
    addMessage("system", "Click on any section in the editor to edit it. Use the toolbar to format text, add links, or insert images.");
  };

  const handleAddVideo = () => {
    addMessage("system", "To add a video, paste a YouTube or Loom URL in the editor. Videos help investors understand your product better.");
  };

  // Render action buttons based on page
  const renderActionButtons = () => {
    switch (pageKey) {
      case "stage":
        return (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={handleOpenRound} icon={Unlock} disabled={hasOpenRound}>
              Open Round
            </ActionButton>
            <ActionButton onClick={handleCloseRound} icon={Lock} disabled={!hasOpenRound}>
              Close Round
            </ActionButton>
          </div>
        );
      case "memo":
        return (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={handleDraftMemo} icon={FileText}>
              Draft Memo
            </ActionButton>
            <ActionButton onClick={handleEditSection} icon={Pencil}>
              Edit Section
            </ActionButton>
            <ActionButton onClick={handleAddVideo} icon={Video}>
              Add Video
            </ActionButton>
            <ActionButton onClick={handleGenerateLink} icon={Link2}>
              Generate Link
            </ActionButton>
          </div>
        );
      case "docket":
        return (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => addMessage("system", "Upload documents using the docket editor.")} icon={FolderPlus}>
              Add Document
            </ActionButton>
            <ActionButton onClick={handleGenerateLink} icon={Link2}>
              Generate Link
            </ActionButton>
          </div>
        );
      case "pipeline":
        return (
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => addMessage("system", "Click the Add Investor button to add a new investor to your pipeline.")} icon={Users}>
              Add Investor
            </ActionButton>
          </div>
        );
      default:
        return null;
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

  // Show loading only when auth is loading
  if (authLoading) {
    console.log("[ActionChatPanel] Showing auth loading spinner");
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show sign-in message if no user (not loading)
  if (!user) {
    console.log("[ActionChatPanel] No user, showing sign-in message");
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm font-medium mb-1">Circuit</p>
        <p className="text-xs text-muted-foreground">Sign in to continue</p>
      </div>
    );
  }

  // Only show loading when actively fetching messages (not when disabled)
  const showMessagesLoading = messagesLoading && isFetching;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {showMessagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  msg.message_type === "system" && "bg-muted",
                  msg.message_type === "action" && "bg-primary/10 text-primary",
                  msg.message_type === "result" && "bg-green-500/10 text-green-700 dark:text-green-400",
                  msg.message_type === "confirmation" && "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            
            {/* Active flow card */}
            {renderActiveFlow()}
          </div>
        )}
      </ScrollArea>

      {/* Action Buttons */}
      <div className="p-3 border-t border-border">
        {renderActionButtons()}
      </div>
    </div>
  );
}