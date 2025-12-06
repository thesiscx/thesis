import { useState } from "react";
import { useParams } from "react-router-dom";
import CircuitLayout from "@/components/circuit/CircuitLayout";
import MemoEditor from "@/components/circuit/MemoEditor";
import MemoSidebar from "@/components/circuit/MemoSidebar";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { useMemo } from "@/hooks/useMemo";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

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
    isLoading: memoLoading,
  } = useMemo(roundSlug, variantSlug);

  const isLoading = memoLoading;

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
            {isLoading ? (
              <div className="flex-1 h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MemoEditor
                key={`${roundSlug}-${variantSlug}`}
                content={memo?.content}
                onChange={updateMemo}
              />
            )}
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
