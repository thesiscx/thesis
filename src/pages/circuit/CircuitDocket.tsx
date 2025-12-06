import { useState } from "react";
import { useParams } from "react-router-dom";
import CircuitLayout from "@/components/circuit/CircuitLayout";
import GlobalDocket from "@/components/circuit/docket/GlobalDocket";
import InvestorDocket from "@/components/circuit/docket/InvestorDocket";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { Skeleton } from "@/components/ui/skeleton";

export default function ThesisDocket() {
  const { roundSlug, variantSlug } = useParams();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  
  const { rounds, isLoading: roundsLoading } = useRounds();
  const { investors } = useInvestors();

  const isGlobal = !variantSlug || variantSlug === "global";

  if (roundsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Skeleton className="h-14 w-full" />
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
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
      >
        {isGlobal ? (
          <GlobalDocket roundSlug={roundSlug} />
        ) : (
          <InvestorDocket roundSlug={roundSlug} investorSlug={variantSlug} />
        )}
      </CircuitLayout>

      <CreateRoundDialog
        open={createRoundOpen}
        onOpenChange={setCreateRoundOpen}
      />
    </>
  );
}
