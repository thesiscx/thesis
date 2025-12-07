import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import contractIcon from "@/assets/contract-icon.svg";

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
        const { data: roundTerms } = await supabase
          .from('round_terms')
          .select('valuation_cap, discount_rate, minimum_ticket, pro_rata_enabled, mfn_enabled')
          .eq('round_id', investorSession.roundId)
          .maybeSingle();

        setTerms(roundTerms);

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

  if (docketSettings && !docketSettings.show_deal_terms) {
    return null;
  }

  if (isLoading || !terms) {
    return null;
  }

  const handleReviewClick = () => {
    navigate(`/share/${companySlug}/${roundCode}/invest`);
  };

  return (
    <div className="fixed bottom-0 right-6 z-40">
      <button
        onClick={handleReviewClick}
        className="group relative w-36 h-40 bg-background border border-border border-b-0 rounded-t-2xl shadow-lg hover:shadow-xl transition-all hover:border-primary/50 overflow-hidden"
      >
        {/* Label at top with subtext */}
        <div className="absolute inset-x-0 top-0 p-4 z-10 bg-gradient-to-b from-background via-background/80 to-transparent">
          <span className="font-heading font-medium text-foreground text-base block">
            Deal Terms
          </span>
          <span className="text-xs text-muted-foreground">
            View & Invest →
          </span>
        </div>
        
        {/* Large contract icon - tilted left by default, shifts slightly on hover, cropped at bottom */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 -rotate-12 transition-transform duration-300 ease-out group-hover:-rotate-3 origin-center">
          <img 
            src={contractIcon}
            alt="Contract"
            className="w-36 h-36" 
          />
        </div>
      </button>
    </div>
  );
}
