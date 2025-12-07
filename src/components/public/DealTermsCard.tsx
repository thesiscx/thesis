import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";

interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  minimum_ticket: number | null;
  pro_rata_enabled: boolean | null;
  mfn_enabled: boolean | null;
}

interface DocketSettings {
  show_deal_terms: boolean;
  custom_terms: string | null;
}

export default function DealTermsCard() {
  const navigate = useNavigate();
  const { companySlug, roundCode } = useParams();
  const { investorSession } = useInvestorAuth();
  const [terms, setTerms] = useState<RoundTerms | null>(null);
  const [docketSettings, setDocketSettings] = useState<DocketSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      if (!investorSession?.roundId) return;

      try {
        // Fetch round terms
        const { data: roundTerms } = await supabase
          .from('round_terms')
          .select('valuation_cap, discount_rate, minimum_ticket, pro_rata_enabled, mfn_enabled')
          .eq('round_id', investorSession.roundId)
          .maybeSingle();

        setTerms(roundTerms);

        // Check docket settings if investor-specific
        if (investorSession.investorId) {
          const { data: docket } = await supabase
            .from('dockets')
            .select('show_deal_terms, custom_terms')
            .eq('round_id', investorSession.roundId)
            .eq('investor_id', investorSession.investorId)
            .maybeSingle();

          if (docket) {
            setDocketSettings(docket);
          }
        }
      } catch (error) {
        console.error('Error fetching terms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, [investorSession]);

  // Don't show if docket explicitly hides deal terms
  if (docketSettings && !docketSettings.show_deal_terms) {
    return null;
  }

  // Don't show if loading or no terms
  if (isLoading || !terms) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  const handleReviewClick = () => {
    navigate(`/share/${companySlug}/${roundCode}/invest`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={handleReviewClick}
        className="group flex items-center gap-4 bg-background border border-border rounded-lg px-5 py-4 shadow-lg hover:shadow-xl transition-all hover:border-primary/50"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
          <FileText className="w-5 h-5" />
        </div>
        
        <div className="text-left">
          <div className="font-heading font-medium text-foreground text-sm">
            Deal Terms
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {terms.valuation_cap && (
              <span>{formatCurrency(terms.valuation_cap)} cap</span>
            )}
            {terms.valuation_cap && terms.discount_rate && (
              <span className="mx-1">·</span>
            )}
            {terms.discount_rate && (
              <span>{terms.discount_rate}% discount</span>
            )}
          </div>
        </div>

        <div className="ml-2 text-muted-foreground group-hover:text-primary transition-colors">
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}