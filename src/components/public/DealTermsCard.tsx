import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileSignature } from "lucide-react";
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
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={handleReviewClick}
        className="group relative w-28 h-28 bg-background border border-border rounded-2xl shadow-lg hover:shadow-xl transition-all hover:border-primary/50 overflow-hidden"
      >
        {/* Large icon - centered and cut off at bottom */}
        <div className="absolute inset-0 flex items-center justify-center pt-2">
          <FileSignature 
            className="w-20 h-20 text-muted-foreground/20 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:text-primary/30" 
            strokeWidth={1.5}
          />
        </div>
        
        {/* Label overlay at top */}
        <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-background via-background/90 to-transparent">
          <span className="font-heading font-medium text-foreground text-sm">
            Deal Terms
          </span>
        </div>
        
        {/* Bottom hint */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-background via-background/90 to-transparent">
          <span className="text-[10px] text-muted-foreground">
            View & Invest →
          </span>
        </div>
      </button>
    </div>
  );
}
