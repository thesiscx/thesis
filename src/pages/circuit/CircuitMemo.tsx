import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import CircuitLayout from "@/components/circuit/CircuitLayout";
import MemoEditor from "@/components/circuit/MemoEditor";
import MemoViewer from "@/components/circuit/MemoViewer";
import MemoSidebar from "@/components/circuit/MemoSidebar";
import { InvestorMemoSidebar } from "@/components/circuit/InvestorMemoSidebar";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { useMemo } from "@/hooks/useMemo";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
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
    localContent,
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
  
  // Determine if we're on an investor-specific memo page
  const isInvestorView = Boolean(variantSlug && variantSlug !== "global");

  // Fetch round ID for investor sidebar
  const { data: roundData } = useQuery({
    queryKey: ["round-by-slug", roundSlug, user?.id],
    queryFn: async () => {
      if (!user?.id || !roundSlug) return null;
      const { data } = await supabase
        .from("rounds")
        .select("id")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!roundSlug && isInvestorView,
  });
  const handleUpdateMemoContent = useCallback(async (content: any) => {
    if (!user?.id || !roundSlug) {
      console.error("Missing user or roundSlug");
      return;
    }
    
    try {
      // First get the round
      const { data: round, error: roundError } = await supabase
        .from("rounds")
        .select("id")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .single();

      if (roundError) throw roundError;

      // Check if memo already exists
      const isGlobal = !variantSlug || variantSlug === "global";
      let existingMemoId = memo?.id;

      if (!existingMemoId) {
        // Try to find existing memo
        let query = supabase
          .from("memos")
          .select("id")
          .eq("round_id", round.id);

        if (isGlobal) {
          query = query.eq("is_global", true);
        }

        const { data } = await query.maybeSingle();
        existingMemoId = data?.id;
      }

      if (existingMemoId) {
        // Update existing memo
        const { error } = await supabase
          .from("memos")
          .update({ content })
          .eq("id", existingMemoId);

        if (error) throw error;
      } else {
        // Create new memo
        const { error } = await supabase
          .from("memos")
          .insert({
            round_id: round.id,
            content,
            is_global: isGlobal,
            created_by: user.id,
          });

        if (error) throw error;
      }

      // Invalidate the memo query to refetch
      queryClient.invalidateQueries({ queryKey: ["memo", roundSlug, variantSlug, user?.id] });
      
      // Switch to edit mode to show the content
      setIsEditing(true);
    } catch (error) {
      console.error("Failed to update memo content:", error);
    }
  }, [memo, queryClient, roundSlug, variantSlug, user?.id]);

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

  // Check if memo has content
  const hasMemoContent = Boolean(localContent || memo?.content);
  const currentMemoContent = localContent ?? memo?.content;

  return (
    <>
      <CircuitLayout
        rounds={rounds}
        investors={investors}
        onCreateRound={() => setCreateRoundOpen(true)}
        onUpdateMemoContent={handleUpdateMemoContent}
        hasMemoContent={hasMemoContent}
        currentMemoContent={currentMemoContent}
      >
        <div className="flex h-[calc(100vh-3.5rem)]">
          {/* Left Sidebar - Investor sidebar or TOC */}
          {isInvestorView ? (
            <InvestorMemoSidebar 
              roundSlug={roundSlug!}
              investorSlug={variantSlug!}
              roundId={roundData?.id}
            />
          ) : (
            <MemoSidebar 
              tocItems={tocItems}
              lastSaved={lastSaved}
              isSaving={isSaving}
              versions={versions}
              onRestoreVersion={restoreVersion}
              isRestoringVersion={isRestoringVersion}
              isEditing={isEditing}
              onToggleEdit={() => setIsEditing(!isEditing)}
              memoId={memo?.id}
            />
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex-1 h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isEditing ? (
                <MemoEditor
                  key={`${roundSlug}-${variantSlug}`}
                  content={localContent ?? memo?.content}
                  onChange={updateMemo}
                />
              ) : (
                <MemoViewer content={localContent ?? memo?.content} />
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
