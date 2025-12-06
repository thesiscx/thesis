import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import CircuitLayout from "@/components/circuit/CircuitLayout";
import MemoEditor from "@/components/circuit/MemoEditor";
import MemoViewer from "@/components/circuit/MemoViewer";
import MemoSidebar from "@/components/circuit/MemoSidebar";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { useMemo } from "@/hooks/useMemo";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useFounderAuth } from "@/contexts/FounderAuthContext";

export default function ThesisMemo() {
  const { roundSlug, variantSlug } = useParams();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useFounderAuth();
  
  const { rounds, isLoading: roundsLoading } = useRounds();
  const { investors } = useInvestors();
  const { 
    memo, 
    tocItems, 
    updateMemo, 
    isSaving, 
    lastSaved,
    versions,
    restoreVersion,
    isRestoringVersion,
    isLoading: memoLoading,
  } = useMemo(roundSlug, variantSlug);

  const isLoading = memoLoading;

  // Callback to handle memo content update from Draft Memo wizard
  const handleUpdateMemoContent = useCallback(async (content: any) => {
    if (!memo?.id) return;
    
    try {
      // Directly update the memo in the database
      const { error } = await supabase
        .from("memos")
        .update({ content })
        .eq("id", memo.id);

      if (error) throw error;

      // Invalidate the memo query to refetch
      queryClient.invalidateQueries({ queryKey: ["memo", roundSlug, variantSlug, user?.id] });
      
      // Switch to edit mode to show the content
      setIsEditing(true);
    } catch (error) {
      console.error("Failed to update memo content:", error);
    }
  }, [memo?.id, queryClient, roundSlug, variantSlug, user?.id]);

  if (roundsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Skeleton className="h-14 w-full" />
        <div className="flex-1 flex">
          <Skeleton className="w-72 h-full" />
          <div className="flex-1 p-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CircuitLayout
        rounds={rounds}
        investors={investors}
        onCreateRound={() => setCreateRoundOpen(true)}
        onUpdateMemoContent={handleUpdateMemoContent}
      >
        <div className="flex h-[calc(100vh-3.5rem)]">
          {/* Left Sidebar - TOC */}
          <MemoSidebar 
            tocItems={tocItems}
            lastSaved={lastSaved}
            isSaving={isSaving}
            versions={versions}
            onRestoreVersion={restoreVersion}
            isRestoringVersion={isRestoringVersion}
          />

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Edit/View Toggle Button - top right of content area */}
            <div className="flex justify-end p-4 border-b border-border bg-background">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                {isEditing ? (
                  <>
                    <Eye className="h-4 w-4" />
                    View
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </>
                )}
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex-1 h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isEditing ? (
                <MemoEditor
                  key={`${roundSlug}-${variantSlug}`}
                  content={memo?.content}
                  onChange={updateMemo}
                />
              ) : (
                <MemoViewer content={memo?.content} />
              )}
            </div>
          </div>
        </div>
      </CircuitLayout>

      <CreateRoundDialog
        open={createRoundOpen}
        onOpenChange={setCreateRoundOpen}
      />
    </>
  );
}
