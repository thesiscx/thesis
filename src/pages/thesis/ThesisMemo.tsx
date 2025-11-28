import { useState } from "react";
import { useParams } from "react-router-dom";
import ThesisLayout from "@/components/thesis/ThesisLayout";
import MemoEditor from "@/components/thesis/MemoEditor";
import MemoSidebar from "@/components/thesis/MemoSidebar";
import CreateRoundDialog from "@/components/thesis/CreateRoundDialog";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { useMemo } from "@/hooks/useMemo";
import { Skeleton } from "@/components/ui/skeleton";

export default function ThesisMemo() {
  const { roundSlug, variantSlug } = useParams();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  
  const { rounds, isLoading: roundsLoading } = useRounds();
  const { investors, recentInvestors } = useInvestors();
  const { 
    memo, 
    tocItems, 
    updateMemo, 
    isSaving, 
    lastSaved,
    versions,
    restoreVersion,
    isRestoringVersion,
  } = useMemo(roundSlug, variantSlug);

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
      <ThesisLayout
        rounds={rounds}
        investors={investors}
        recentInvestors={recentInvestors}
        onCreateRound={() => setCreateRoundOpen(true)}
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

          {/* Main Editor */}
          <div className="flex-1 overflow-hidden">
            <MemoEditor
              content={memo?.content}
              onChange={updateMemo}
            />
          </div>
        </div>
      </ThesisLayout>

      <CreateRoundDialog
        open={createRoundOpen}
        onOpenChange={setCreateRoundOpen}
      />
    </>
  );
}
