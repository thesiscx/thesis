import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X } from "lucide-react";

interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  minimum_ticket: number | null;
  pro_rata_enabled: boolean | null;
  mfn_enabled: boolean | null;
  company_name: string | null;
}

interface ReviewTermsStepProps {
  terms: RoundTerms | null;
  customTerms: string | null;
  instrumentType: string;
  onContinue: () => void;
}

export default function ReviewTermsStep({ terms, customTerms, instrumentType, onContinue }: ReviewTermsStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Investment Terms
        </h1>
        <p className="text-muted-foreground mt-2">
          Review the terms of this {instrumentType.toUpperCase()} agreement before proceeding.
        </p>
      </div>

      <div className="space-y-6">
        {/* Key Terms */}
        <div className="bg-muted/30 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
            Key Terms
          </h2>
          
          <div className="grid gap-4">
            {terms?.valuation_cap && (
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Valuation Cap</span>
                <span className="font-medium text-foreground">{formatCurrency(terms.valuation_cap)}</span>
              </div>
            )}
            
            {terms?.discount_rate && (
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Discount Rate</span>
                <span className="font-medium text-foreground">{terms.discount_rate}%</span>
              </div>
            )}
            
            {terms?.minimum_ticket && (
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Minimum Investment</span>
                <span className="font-medium text-foreground">{formatCurrency(terms.minimum_ticket)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Pro-Rata Rights</span>
              <span className="font-medium text-foreground flex items-center gap-1.5">
                {terms?.pro_rata_enabled ? (
                  <><Check className="w-4 h-4 text-green-600" /> Included</>
                ) : (
                  <><X className="w-4 h-4 text-muted-foreground" /> Not included</>
                )}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">MFN Provision</span>
              <span className="font-medium text-foreground flex items-center gap-1.5">
                {terms?.mfn_enabled ? (
                  <><Check className="w-4 h-4 text-green-600" /> Included</>
                ) : (
                  <><X className="w-4 h-4 text-muted-foreground" /> Not included</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Terms / Side Letter */}
        {customTerms && (
          <div className="bg-muted/30 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
              Additional Terms
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {customTerms}
            </p>
          </div>
        )}

        {/* Agreement Type */}
        <div className="text-sm text-muted-foreground">
          This is a standard Y Combinator {instrumentType.toUpperCase()} agreement. By proceeding, you acknowledge 
          that you have reviewed and understand these terms.
        </div>
      </div>

      <Button onClick={onContinue} className="w-full" size="lg">
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}