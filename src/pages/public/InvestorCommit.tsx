import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CommitmentSteps, { CommitmentStep } from "@/components/public/CommitmentSteps";
import ReviewTermsStep from "@/components/public/steps/ReviewTermsStep";
import InvestorDetailsStep, { InvestorDetails } from "@/components/public/steps/InvestorDetailsStep";
import InvestmentAmountStep from "@/components/public/steps/InvestmentAmountStep";
import GenerateDocumentStep from "@/components/public/steps/GenerateDocumentStep";
import SignAgreementStep from "@/components/public/steps/SignAgreementStep";
import ConfirmationStep from "@/components/public/steps/ConfirmationStep";
import { PoweredByCircuit } from "@/components/public/PoweredByCircuit";
import { CircuitSplash } from "@/components/public/CircuitSplash";
interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  minimum_ticket: number | null;
  pro_rata_enabled: boolean | null;
  mfn_enabled: boolean | null;
  company_name: string | null;
  wire_bank_name: string | null;
  wire_account_name: string | null;
  wire_account_number: string | null;
  wire_routing_number: string | null;
  wire_swift_code: string | null;
  wire_bank_address: string | null;
  wire_reference: string | null;
}

export default function InvestorCommit() {
  const navigate = useNavigate();
  const { companySlug, roundCode } = useParams();
  const { investorSession, clearInvestorSession, isLoading: isAuthLoading } = useInvestorAuth();

  const [currentStep, setCurrentStep] = useState<CommitmentStep>('review-terms');
  const [completedSteps, setCompletedSteps] = useState<CommitmentStep[]>([]);
  const [terms, setTerms] = useState<RoundTerms | null>(null);
  const [customTerms, setCustomTerms] = useState<string | null>(null);
  const [instrumentType, setInstrumentType] = useState<string>('safe');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Form data
  const [investorDetails, setInvestorDetails] = useState<InvestorDetails>({
    name: '',
    email: '',
    phone: '',
    address: '',
    entityType: 'individual',
    entityName: '',
    entityJurisdiction: '',
  });
  const [investmentAmount, setInvestmentAmount] = useState<number>(0);
  const [documentHtml, setDocumentHtml] = useState<string>('');

  // Redirect if no session
  useEffect(() => {
    if (!isAuthLoading && !investorSession) {
      navigate(`/share/${companySlug}/${roundCode}/memo`, { replace: true });
    }
  }, [isAuthLoading, investorSession, companySlug, roundCode, navigate]);

  // Fetch terms and docket settings
  useEffect(() => {
    const fetchData = async () => {
      if (!investorSession?.roundId) return;

      try {
        // Fetch round terms
        const { data: roundTerms } = await supabase
          .from('round_terms')
          .select('*')
          .eq('round_id', investorSession.roundId)
          .maybeSingle();

        if (roundTerms) {
          setTerms(roundTerms);
        }

        // Fetch round for instrument type
        const { data: round } = await supabase
          .from('rounds')
          .select('instrument_type')
          .eq('id', investorSession.roundId)
          .maybeSingle();

        if (round) {
          setInstrumentType(round.instrument_type);
        }

        // Check for investor-specific docket with custom terms
        if (investorSession.investorId) {
          const { data: docket } = await supabase
            .from('dockets')
            .select('custom_terms')
            .eq('round_id', investorSession.roundId)
            .eq('investor_id', investorSession.investorId)
            .maybeSingle();

          if (docket?.custom_terms) {
            setCustomTerms(docket.custom_terms);
          }
        }

        // Pre-fill investor details if available
        if (investorSession.investorName) {
          setInvestorDetails(prev => ({
            ...prev,
            name: investorSession.investorName || '',
          }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load terms');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [investorSession]);

  const markStepComplete = (step: CommitmentStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
  };

  const goToStep = (step: CommitmentStep) => {
    setCurrentStep(step);
  };

  // Step handlers
  const handleReviewTermsContinue = () => {
    markStepComplete('review-terms');
    goToStep('your-details');
  };

  const handleDetailsContinue = (details: InvestorDetails) => {
    setInvestorDetails(details);
    markStepComplete('your-details');
    goToStep('investment-amount');
  };

  const handleAmountContinue = (amount: number) => {
    setInvestmentAmount(amount);
    markStepComplete('investment-amount');
    goToStep('generate-document');
  };

  const handleDocumentGenerated = useCallback((html: string) => {
    setDocumentHtml(html);
    markStepComplete('generate-document');
    goToStep('sign-agreement');
  }, []);

  const handleSign = async (signature: string) => {
    if (!investorSession) return;

    setIsSubmitting(true);
    try {
      // Create or update docket with investor details
      const docketData = {
        round_id: investorSession.roundId,
        investor_id: investorSession.investorId,
        amount: investmentAmount,
        status: 'investor_signed',
        commitment_status: 'signed',
        investor_name: investorDetails.entityType === 'entity' ? investorDetails.entityName : investorDetails.name,
        investor_email: investorDetails.email,
        investor_phone: investorDetails.phone,
        investor_address: investorDetails.address,
        investor_entity_name: investorDetails.entityType === 'entity' ? investorDetails.entityName : null,
        investor_entity_type: investorDetails.entityType,
        is_global: false,
      };

      // Check if docket exists
      const { data: existingDocket } = await supabase
        .from('dockets')
        .select('id')
        .eq('round_id', investorSession.roundId)
        .eq('investor_id', investorSession.investorId)
        .maybeSingle();

      let docketId: string;

      if (existingDocket) {
        // Update existing docket
        const { error } = await supabase
          .from('dockets')
          .update(docketData)
          .eq('id', existingDocket.id);

        if (error) throw error;
        docketId = existingDocket.id;
      } else {
        // Create new docket
        const { data: newDocket, error } = await supabase
          .from('dockets')
          .insert(docketData)
          .select('id')
          .single();

        if (error) throw error;
        docketId = newDocket.id;
      }

      // Record signature
      const { error: sigError } = await supabase
        .from('signatures')
        .insert({
          docket_id: docketId,
          signer_type: 'investor',
          signer_name: signature,
          signer_email: investorDetails.email,
          signer_title: investorDetails.entityType === 'entity' ? 'Authorized Signatory' : null,
          signature_data: signature,
        });

      if (sigError) throw sigError;

      markStepComplete('sign-agreement');
      goToStep('confirmation');
      toast.success('Agreement signed successfully');
    } catch (error) {
      console.error('Error signing agreement:', error);
      toast.error('Failed to sign agreement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToMemo = () => {
    navigate(`/share/${companySlug}/${roundCode}/memo/view`);
  };

  const handleClose = () => {
    navigate(`/share/${companySlug}/${roundCode}/memo/view`);
  };

  const handleLogout = () => {
    clearInvestorSession();
    navigate(`/share/${companySlug}/${roundCode}/memo`, { replace: true });
  };

  if (isAuthLoading || !investorSession || isLoading) {
    return null;
  }

  // Show splash screen first
  if (showSplash) {
    return <CircuitSplash onComplete={() => setShowSplash(false)} duration={2500} />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            {investorSession.companyLogo ? (
              <img src={investorSession.companyLogo} alt={investorSession.companyName} className="h-5 w-5 object-contain" />
            ) : (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="flex items-center gap-2 font-heading text-base font-medium">
              <span className="text-primary">{investorSession.companyName}</span>
              <span className="text-muted-foreground">Investment Commitment</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToMemo} className="gap-2 text-muted-foreground">
              Back to Memo
            </Button>
            <span className="text-sm text-muted-foreground">{investorSession.investorName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      {/* Centered Card Container */}
      <div className="flex justify-center py-8 px-4">
        <div className="bg-background rounded-xl shadow-sm border w-full max-w-4xl">
          <div className="flex">
            {/* Sidebar - Now part of the card */}
            <aside className="hidden lg:block w-56 flex-shrink-0 p-6 pr-0">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Investment Process
              </h2>
              <CommitmentSteps currentStep={currentStep} completedSteps={completedSteps} />
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 py-8 px-6 lg:px-8">
              <div className="max-w-lg">
                {currentStep === 'review-terms' && (
                  <ReviewTermsStep
                    terms={terms}
                    customTerms={customTerms}
                    instrumentType={instrumentType}
                    onContinue={handleReviewTermsContinue}
                  />
                )}

                {currentStep === 'your-details' && (
                  <InvestorDetailsStep
                    initialData={investorDetails}
                    onContinue={handleDetailsContinue}
                    onBack={() => goToStep('review-terms')}
                  />
                )}

                {currentStep === 'investment-amount' && (
                  <InvestmentAmountStep
                    initialAmount={investmentAmount}
                    minimumTicket={terms?.minimum_ticket || null}
                    onContinue={handleAmountContinue}
                    onBack={() => goToStep('your-details')}
                  />
                )}

                {currentStep === 'generate-document' && (
                  <GenerateDocumentStep
                    onComplete={handleDocumentGenerated}
                    investorDetails={investorDetails}
                    amount={investmentAmount}
                    companyName={investorSession.companyName || ''}
                    roundId={investorSession.roundId}
                    roundTerms={terms}
                  />
                )}

                {currentStep === 'sign-agreement' && (
                  <SignAgreementStep
                    documentHtml={documentHtml}
                    investorName={investorDetails.name}
                    companyName={investorSession.companyName || ''}
                    onSign={handleSign}
                    onBack={() => goToStep('investment-amount')}
                    isSubmitting={isSubmitting}
                  />
                )}

                {currentStep === 'confirmation' && (
                  <ConfirmationStep
                    amount={investmentAmount}
                    companyName={investorSession.companyName || ''}
                    wireInstructions={terms}
                    documentHtml={documentHtml}
                    onClose={handleClose}
                  />
                )}
              </div>
            </main>
          </div>
        </div>

        {/* Powered by Circuit Footer */}
        <PoweredByCircuit variant="footer" />
      </div>
    </div>
  );
}
