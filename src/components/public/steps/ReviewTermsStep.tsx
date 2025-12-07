import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X, Building2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface RoundInfo {
  name: string;
  targetRaise: number | null;
}

interface ReviewTermsStepProps {
  terms: RoundTerms | null;
  customTerms: string | null;
  instrumentType: string;
  companyInfo?: CompanyInfo;
  roundInfo?: RoundInfo;
  onContinue: () => void;
}

export default function ReviewTermsStep({ 
  terms, 
  customTerms, 
  instrumentType, 
  companyInfo, 
  roundInfo,
  onContinue 
}: ReviewTermsStepProps) {
  const [showPreview, setShowPreview] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getAgreementPreviewHtml = () => {
    const instrumentName = instrumentType.toUpperCase();
    return `
      <div style="font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 30px;">
          ${instrumentName} AGREEMENT
        </h1>
        
        <p style="margin-bottom: 20px;">
          THIS CERTIFIES THAT in exchange for the payment by the undersigned investor (the "Investor") 
          of $[INVESTMENT AMOUNT] (the "Purchase Amount") on or about [DATE], 
          <strong>${companyInfo?.name || '[COMPANY NAME]'}</strong>, a ${companyInfo?.entityType || 'Delaware corporation'} 
          (the "Company"), issues to the Investor the right to certain shares of the Company's Capital Stock, 
          subject to the terms described below.
        </p>

        <h2 style="font-size: 14px; font-weight: bold; margin-top: 30px; margin-bottom: 15px;">1. Events</h2>
        
        <p style="margin-bottom: 15px;">
          <strong>(a) Equity Financing.</strong> If there is an Equity Financing before the termination of this ${instrumentName}, 
          on the initial closing of such Equity Financing, this ${instrumentName} will automatically convert into the number of shares 
          of Standard Preferred Stock equal to the Purchase Amount divided by the Conversion Price.
        </p>

        ${terms?.valuation_cap ? `
        <p style="margin-bottom: 15px;">
          <strong>Valuation Cap:</strong> ${formatCurrency(terms.valuation_cap)}
        </p>
        ` : ''}

        ${terms?.discount_rate ? `
        <p style="margin-bottom: 15px;">
          <strong>Discount Rate:</strong> ${terms.discount_rate}%
        </p>
        ` : ''}

        ${terms?.pro_rata_enabled ? `
        <h2 style="font-size: 14px; font-weight: bold; margin-top: 30px; margin-bottom: 15px;">2. Pro-Rata Rights</h2>
        <p style="margin-bottom: 15px;">
          The Investor shall have the right to participate in subsequent financing rounds on a pro-rata basis.
        </p>
        ` : ''}

        ${terms?.mfn_enabled ? `
        <h2 style="font-size: 14px; font-weight: bold; margin-top: 30px; margin-bottom: 15px;">3. Most Favored Nation</h2>
        <p style="margin-bottom: 15px;">
          If the Company issues any subsequent ${instrumentName}s with more favorable terms, 
          the Investor may elect to adopt such terms.
        </p>
        ` : ''}

        <div style="margin-top: 60px; border-top: 1px solid #ccc; padding-top: 20px;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            This is a preview of the agreement template. Final terms will be populated when you complete the investment process.
          </p>
        </div>
      </div>
    `;
  };

  return (
    <>
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
              {/* Round Info */}
              {roundInfo?.name && (
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-muted-foreground">Round</span>
                  <span className="text-sm font-medium text-foreground">{roundInfo.name}</span>
                </div>
              )}
              
              {roundInfo?.targetRaise && (
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-muted-foreground">Target Raise</span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(roundInfo.targetRaise)}</span>
                </div>
              )}

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

          {/* Agreement Type with Preview Button */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="flex-1">
              This is a standard Y Combinator {instrumentType.toUpperCase()} agreement. By proceeding, you acknowledge 
              that you have reviewed and understand these terms.
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowPreview(true)}
              className="text-xs h-auto py-1 px-2 text-primary hover:text-primary/80 shrink-0"
            >
              <FileText className="w-3 h-3 mr-1" />
              Preview Agreement
            </Button>
          </div>
        </div>

        <Button onClick={onContinue} className="w-full" size="lg">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Preview Agreement Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Agreement Preview</DialogTitle>
          </DialogHeader>
          <div 
            className="flex-1 overflow-y-auto bg-white rounded border"
            dangerouslySetInnerHTML={{ __html: getAgreementPreviewHtml() }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
