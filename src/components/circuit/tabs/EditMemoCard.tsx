import { useState } from "react";
import { FileEdit, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRounds } from "@/hooks/useRounds";
import { useQueryClient } from "@tanstack/react-query";
import { StatusLine, StatusState } from "./StatusLine";

interface EditMemoCardProps {
  roundId?: string;
  roundSlug?: string;
  onUpdateMemoContent?: (content: any) => void;
  currentMemoContent?: any;
}

export function EditMemoCard({ 
  roundId, 
  roundSlug, 
  onUpdateMemoContent,
  currentMemoContent 
}: EditMemoCardProps) {
  const { toast } = useToast();
  const { openRound } = useRounds();
  const queryClient = useQueryClient();
  
  const [editPrompt, setEditPrompt] = useState("");
  const [status, setStatus] = useState<StatusState>("idle");

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

    setStatus("loading");

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
        setStatus("success");
        setEditPrompt("");
        
        queryClient.invalidateQueries({ queryKey: ["memo", effectiveRoundSlug] });
        toast({ title: "Memo updated" });
        
        setTimeout(() => {
          setStatus("idle");
        }, 3000);
      }
    } catch (error) {
      console.error("Edit memo error:", error);
      toast({
        title: "Failed to edit memo",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (!openRound) {
    return (
      <>
        <div className="rounded-xl border border-border bg-transparent overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Edit Memo</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              Open a round first to edit memo
            </p>
          </div>
        </div>
        <StatusLine status="idle" idleText="No active round" />
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
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
              disabled={status === "loading"}
            />
          </div>

          <Button
            size="sm"
            onClick={handleEditWithAI}
            disabled={!editPrompt.trim() || status === "loading"}
            className="w-full"
          >
            {status === "loading" ? (
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
        </div>
      </div>
      
      {/* Status Line - Outside Card */}
      <StatusLine 
        status={status}
        idleText="Ready for edits"
        loadingText="AI is revising your memo..."
        successText="Memo updated successfully"
        errorText="Failed to update memo"
      />
    </>
  );
}
