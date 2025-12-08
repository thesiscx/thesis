import { useState } from "react";
import { FileEdit, Loader2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds } from "@/hooks/useRounds";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface EditMemoCardProps {
  roundId?: string;
  roundSlug?: string;
  onUpdateMemoContent?: (content: any) => void;
  currentMemoContent?: any;
}

type EditStatus = "idle" | "editing" | "success";

export function EditMemoCard({ 
  roundId, 
  roundSlug, 
  onUpdateMemoContent,
  currentMemoContent 
}: EditMemoCardProps) {
  const { user } = useFounderAuth();
  const { toast } = useToast();
  const { openRound } = useRounds();
  const queryClient = useQueryClient();
  
  const [editPrompt, setEditPrompt] = useState("");
  const [editStatus, setEditStatus] = useState<EditStatus>("idle");

  const effectiveRoundId = roundId || openRound?.id;
  const effectiveRoundSlug = roundSlug || openRound?.slug;

  const handleEditWithAI = async () => {
    if (!editPrompt.trim() || !currentMemoContent) {
      toast({
        title: "Enter your changes",
        description: "Describe what you'd like to change in the memo",
        variant: "destructive",
      });
      return;
    }

    setEditStatus("editing");

    try {
      const { data, error } = await supabase.functions.invoke("draft-memo-ai", {
        body: {
          editMode: true,
          editPrompt: editPrompt.trim(),
          currentContent: currentMemoContent,
        },
      });

      if (error) throw error;

      if (data?.content) {
        onUpdateMemoContent?.(data.content);
        setEditStatus("success");
        setEditPrompt("");
        
        // Invalidate memo query to refresh
        queryClient.invalidateQueries({ queryKey: ["memo", effectiveRoundSlug] });
        
        toast({ title: "Memo updated" });
        
        // Reset status after delay
        setTimeout(() => {
          setEditStatus("idle");
        }, 2000);
      }
    } catch (error) {
      console.error("Edit memo error:", error);
      toast({
        title: "Failed to edit memo",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setEditStatus("idle");
    }
  };

  if (!openRound) {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Edit Memo</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground text-center py-4">
            Open a round first to edit memo
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (editStatus === "success") {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Edit Memo</span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm py-4">
            <Check className="w-4 h-4 text-green-600" />
            <span className="font-medium">Memo updated successfully</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
        <FileEdit className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium">Edit Memo</span>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Describe your changes</Label>
          <Textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="e.g., Make the problem section more concise and add recent traction metrics..."
            rows={4}
            className="text-sm resize-none bg-background"
            disabled={editStatus === "editing"}
          />
        </div>

        <Button
          size="sm"
          onClick={handleEditWithAI}
          disabled={!editPrompt.trim() || editStatus === "editing"}
          className="w-full"
        >
          {editStatus === "editing" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Updating with AI...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Edit with AI
            </>
          )}
        </Button>

        {editStatus === "editing" && (
          <div className="text-xs text-center py-2 rounded-lg bg-primary/10 text-primary animate-pulse">
            AI is revising your memo...
          </div>
        )}
      </div>
    </div>
  );
}
