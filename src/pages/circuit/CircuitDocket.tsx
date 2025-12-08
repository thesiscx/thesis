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

  // Fetch investor and docket data for breadcrumb when on investor docket page
  const { data: docketData } = useQuery({
    queryKey: ["docket-for-breadcrumb", variantSlug, roundSlug, user?.id],
    queryFn: async () => {
      if (!variantSlug || variantSlug === "global" || !roundSlug || !user?.id) return null;
      
      // Get round to find workspace_id
      const { data: round } = await supabase
        .from("rounds")
        .select("id, workspace_id")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .single();
      
      if (!round) return null;
      
      const { data: investor } = await supabase
        .from("investors")
        .select("id, name, slug")
        .eq("slug", variantSlug)
        .eq("workspace_id", round.workspace_id)
        .single();
      
      if (!investor) return null;

      // Get docket for this investor to retrieve docket_id
      const { data: docket } = await supabase
        .from("dockets")
        .select("id, docket_id, docket_number")
        .eq("round_id", round.id)
        .eq("investor_id", investor.id)
        .maybeSingle();
      
      return { investor, docket };
    },
    enabled: !!variantSlug && variantSlug !== "global" && !!roundSlug && !!user?.id,
  });

  // Build breadcrumb for investor docket pages - use docket_id instead of name
  const breadcrumb = !isGlobal && docketData?.docket?.docket_id 
    ? { label: docketData.docket.docket_id }
    : !isGlobal && docketData?.investor?.name
    ? { label: docketData.investor.name }
    : !isGlobal && variantSlug
    ? { label: variantSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) }
    : undefined;

  const investorName = docketData?.investor?.name || variantSlug?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Investor";
  const investorData = docketData?.investor;

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
