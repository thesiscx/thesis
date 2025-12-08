import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import CircuitLayout from "@/components/circuit/CircuitLayout";
import GlobalDocket from "@/components/circuit/docket/GlobalDocket";
import InvestorDocket from "@/components/circuit/docket/InvestorDocket";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function ThesisDocket() {
  const { roundSlug, variantSlug } = useParams();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [accessKeyId, setAccessKeyId] = useState<string | undefined>();
  const { user } = useFounderAuth();
  
  const { rounds, isLoading: roundsLoading } = useRounds();
  const { investors } = useInvestors();

  const isGlobal = !variantSlug || variantSlug === "global";
  const isInvestorSubpage = !isGlobal;

  // Fetch investor name for breadcrumb when on investor docket page
  const { data: investorData } = useQuery({
    queryKey: ["investor-for-breadcrumb", variantSlug, roundSlug, user?.id],
    queryFn: async () => {
      if (!variantSlug || variantSlug === "global" || !roundSlug || !user?.id) return null;
      
      // Get round to find workspace_id
      const { data: round } = await supabase
        .from("rounds")
        .select("workspace_id")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .single();
      
      if (!round) return null;
      
      const { data: investor } = await supabase
        .from("investors")
        .select("id, name")
        .eq("slug", variantSlug)
        .eq("workspace_id", round.workspace_id)
        .single();
      
      return investor;
    },
    enabled: !!variantSlug && variantSlug !== "global" && !!roundSlug && !!user?.id,
  });

  // Build breadcrumb for investor docket pages
  const breadcrumb = !isGlobal && investorData?.name 
    ? { label: investorData.name }
    : !isGlobal && variantSlug
    ? { label: variantSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) }
    : undefined;

  const investorName = investorData?.name || variantSlug?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Investor";

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
        breadcrumb={breadcrumb}
        isSubpage={isInvestorSubpage}
        investorSlug={variantSlug}
        investorId={investorData?.id}
        investorName={isInvestorSubpage ? investorName : undefined}
        accessKeyId={accessKeyId}
      >
        {isGlobal ? (
          <GlobalDocket roundSlug={roundSlug} />
        ) : (
          <InvestorDocket 
            roundSlug={roundSlug} 
            investorSlug={variantSlug}
            onAccessKeyLoaded={setAccessKeyId}
          />
        )}
      </CircuitLayout>

      <CreateRoundDialog
        open={createRoundOpen}
        onOpenChange={setCreateRoundOpen}
      />
    </>
  );
}
