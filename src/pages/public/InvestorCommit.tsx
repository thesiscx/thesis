import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Building2, X } from "lucide-react";
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
  entity_type: string | null;
  registered_address: string | null;
  wire_bank_name: string | null;
  wire_account_name: string | null;
  wire_account_number: string | null;
  wire_routing_number: string | null;
  wire_swift_code: string | null;
  wire_bank_address: string | null;
  wire_reference: string | null;
}

interface CompanyInfo {
  name: string;
  logo: string | null;
  entityType: string | null;
  address: string | null;
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
  const [roundInfo, setRoundInfo] = useState<{ name: string; targetRaise: number | null }>({
    name: '',
    targetRaise: null,
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    logo: null,
    entityType: null,
    address: null,
  });

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
          // Set company info from terms
          setCompanyInfo(prev => ({
            ...prev,
            entityType: roundTerms.entity_type,
            address: roundTerms.registered_address,
          }));
        }

        // Fetch round for instrument type and details
        const { data: round } = await supabase
          .from('rounds')
          .select('instrument_type, name, target_raise')
          .eq('id', investorSession.roundId)
          .maybeSingle();

        if (round) {
          setInstrumentType(round.instrument_type);
          setRoundInfo({
            name: round.name,
            targetRaise: round.target_raise,
          });
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

        // Set company info from session
        setCompanyInfo(prev => ({
          ...prev,
          name: investorSession.companyName || '',
          logo: investorSession.companyLogo || null,
        }));

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
    <div className="h-screen bg-muted/30 overflow-hidden flex flex-col">
      {/* Close Terms Button - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClose} 
          className="gap-2 rounded-full px-4 bg-background hover:bg-muted"
        >
          <X className="h-4 w-4" />
          Close Terms
        </Button>
      </div>

      {/* Centered Card Container - Intentionally extends past viewport bottom */}
      <div className="flex-1 flex items-start justify-center pt-12 pb-0 px-8">
        <div className="bg-background rounded-xl shadow-sm border w-full max-w-4xl flex min-h-[600px]">
          {/* Sidebar - Now part of the card with PoweredByCircuit at bottom */}
          <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 p-6 pr-0 border-r border-border/50">
            <div className="flex-1">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Investment Process
              </h2>
              <CommitmentSteps currentStep={currentStep} completedSteps={completedSteps} />
            </div>
            
            {/* PoweredByCircuit at bottom of sidebar */}
            <div className="pt-4 pr-6">
              <PoweredByCircuit variant="inline" />
            </div>
          </aside>

          {/* Main Content - Always scrollable to ensure buttons are accessible */}
          <main className="flex-1 min-w-0 py-8 px-6 lg:px-8 overflow-y-auto max-h-[calc(100vh-6rem)]">
            <div className="max-w-lg pb-8">
              {currentStep === 'review-terms' && (
                <ReviewTermsStep
                  terms={terms}
                  customTerms={customTerms}
                  instrumentType={instrumentType}
                  companyInfo={companyInfo}
                  roundInfo={roundInfo}
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
    </div>
  );
}
