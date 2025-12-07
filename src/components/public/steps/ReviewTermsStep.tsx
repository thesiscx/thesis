import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X, Building2 } from "lucide-react";

interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  minimum_ticket: number | null;
  pro_rata_enabled: boolean | null;
  mfn_enabled: boolean | null;
  company_name: string | null;
}

interface CompanyInfo {
  name: string;
  logo: string | null;
  entityType: string | null;
  address: string | null;
}

interface ReviewTermsStepProps {
  terms: RoundTerms | null;
  customTerms: string | null;
  instrumentType: string;
  companyInfo?: CompanyInfo;
  onContinue: () => void;
}

export default function ReviewTermsStep({ terms, customTerms, instrumentType, companyInfo, onContinue }: ReviewTermsStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Company Info Header */}
      {companyInfo && (
        <div className="flex items-start gap-3 pb-4 border-b border-border/50">
          {companyInfo.logo ? (
            <img 
              src={companyInfo.logo} 
              alt={companyInfo.name} 
              className="h-10 w-10 object-contain rounded-md"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-foreground text-lg">
              {companyInfo.name}
            </h2>
            {companyInfo.entityType && (
              <p className="text-sm text-muted-foreground">
                {companyInfo.entityType}
              </p>
            )}
            {companyInfo.address && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {companyInfo.address}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Investment Terms
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Review the terms of this {instrumentType.toUpperCase()} agreement before proceeding.
        </p>
      </div>

      <div className="space-y-4">
        {/* Key Terms - Tighter spacing */}
        <div className="bg-muted/30 rounded-lg p-5 space-y-1">
          <h2 className="text-xs font-medium text-foreground uppercase tracking-wide mb-3">
            Key Terms
          </h2>
          
          <div className="divide-y divide-border/50">
            {terms?.valuation_cap && (
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-muted-foreground">Valuation Cap</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(terms.valuation_cap)}</span>
              </div>
            )}
            
            {terms?.discount_rate && (
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-muted-foreground">Discount Rate</span>
                <span className="text-sm font-medium text-foreground">{terms.discount_rate}%</span>
              </div>
            )}
            
            {terms?.minimum_ticket && (
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-muted-foreground">Minimum Investment</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(terms.minimum_ticket)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-muted-foreground">Pro-Rata Rights</span>
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                {terms?.pro_rata_enabled ? (
                  <><Check className="w-3.5 h-3.5 text-green-600" /> Included</>
                ) : (
                  <><X className="w-3.5 h-3.5 text-muted-foreground" /> Not included</>
                )}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-muted-foreground">MFN Provision</span>
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                {terms?.mfn_enabled ? (
                  <><Check className="w-3.5 h-3.5 text-green-600" /> Included</>
                ) : (
                  <><X className="w-3.5 h-3.5 text-muted-foreground" /> Not included</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Terms / Side Letter */}
        {customTerms && (
          <div className="bg-muted/30 rounded-lg p-5 space-y-2">
            <h2 className="text-xs font-medium text-foreground uppercase tracking-wide">
              Additional Terms
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {customTerms}
            </p>
          </div>
        )}

        {/* Agreement Type */}
        <div className="text-xs text-muted-foreground">
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
