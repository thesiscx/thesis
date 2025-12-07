import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CommitmentSteps, { CommitmentStep } from "@/components/public/CommitmentSteps";
import ReviewTermsStep from "@/components/public/steps/ReviewTermsStep";
import InvestorDetailsStep, { InvestorDetails } from "@/components/public/steps/InvestorDetailsStep";
import InvestmentAmountStep from "@/components/public/steps/InvestmentAmountStep";
import GenerateDocumentStep from "@/components/public/steps/GenerateDocumentStep";
import SignAgreementStep from "@/components/public/steps/SignAgreementStep";
import ExecuteStep from "@/components/public/steps/ExecuteStep";
import WireStep from "@/components/public/steps/WireStep";
import FinalizeStep from "@/components/public/steps/FinalizeStep";
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
  signatory_name: string | null;
  signatory_title: string | null;
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

// FlowState stored as JSON - using 'any' for Supabase Json compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlowStateJson = any;

export default function InvestorCommit() {
  const navigate = useNavigate();
  const { companySlug, roundCode, investorSlug } = useParams();
  const { investorSession, clearInvestorSession, isLoading: isAuthLoading } = useInvestorAuth();

  const [currentStep, setCurrentStep] = useState<CommitmentStep>('terms');
  const [completedSteps, setCompletedSteps] = useState<CommitmentStep[]>([]);
  const [terms, setTerms] = useState<RoundTerms | null>(null);
  const [customTerms, setCustomTerms] = useState<string | null>(null);
  const [instrumentType, setInstrumentType] = useState<string>('safe');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [docketId, setDocketId] = useState<string | null>(null);
  const [wireReceivedAt, setWireReceivedAt] = useState<string | null>(null);
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
  
  // Ref to track if state has been restored
  const stateRestored = useRef(false);

  // Save flow state to database
  const saveFlowState = useCallback(async (
    step: CommitmentStep,
    completed: CommitmentStep[],
    details: InvestorDetails,
    amount: number,
    html: string,
    existingDocketId?: string | null
  ) => {
    if (!investorSession?.roundId) return;

    const flowState: FlowStateJson = {
      current_step: step,
      completed_steps: completed,
      investor_details: details,
      investment_amount: amount,
      document_html: html,
    };

    try {
      // Use existing docketId or find/create one
      let targetDocketId = existingDocketId || docketId;

      if (!targetDocketId) {
        // Find existing docket by investor_id or access_key_id
        let existingDocket: { id: string; wire_received?: boolean | null; wire_received_at?: string | null } | null = null;
        
        if (investorSession.investorId) {
          const { data } = await supabase
            .from('dockets')
            .select('id, wire_received, wire_received_at')
            .eq('round_id', investorSession.roundId)
            .eq('investor_id', investorSession.investorId)
            .maybeSingle();
          existingDocket = data;
        } else if (investorSession.accessKeyId) {
          const { data } = await supabase
            .from('dockets')
            .select('id, wire_received, wire_received_at')
            .eq('round_id', investorSession.roundId)
            .eq('access_key_id', investorSession.accessKeyId)
            .maybeSingle();
          existingDocket = data;
        }

        if (existingDocket) {
          targetDocketId = existingDocket.id;
          setDocketId(existingDocket.id);
          if (existingDocket.wire_received_at) {
            setWireReceivedAt(existingDocket.wire_received_at);
          }
        } else {
          // Create new docket with flow state
          const { data: newDocket, error } = await supabase
            .from('dockets')
            .insert({
              round_id: investorSession.roundId,
              investor_id: investorSession.investorId || null,
              access_key_id: investorSession.accessKeyId || null,
              commitment_flow_state: flowState,
              commitment_status: 'in_progress',
              is_global: !investorSession.investorId,
            })
            .select('id')
            .single();

          if (error) {
            console.error('Error creating docket:', error);
            return;
          }
          targetDocketId = newDocket.id;
          setDocketId(newDocket.id);
        }
      }

      // Update the docket with flow state
      if (targetDocketId) {
        await supabase
          .from('dockets')
          .update({ commitment_flow_state: flowState })
          .eq('id', targetDocketId);
      }
    } catch (error) {
      console.error('Error saving flow state:', error);
    }
  }, [investorSession, docketId]);

  // Redirect if no session
  useEffect(() => {
    if (!isAuthLoading && !investorSession) {
      // Redirect to access page with investor slug if available
      const accessPath = investorSlug 
        ? `/share/${companySlug}/${roundCode}/docket/${investorSlug}`
        : `/share/${companySlug}/${roundCode}/docket`;
      navigate(accessPath, { replace: true });
    }
  }, [isAuthLoading, investorSession, companySlug, roundCode, investorSlug, navigate]);

  // Fetch terms and restore flow state
  useEffect(() => {
    const fetchData = async () => {
      if (!investorSession?.roundId || stateRestored.current) return;

      try {
        // Fetch round terms
        const { data: roundTerms } = await supabase
          .from('round_terms')
          .select('*')
          .eq('round_id', investorSession.roundId)
          .maybeSingle();

        if (roundTerms) {
          setTerms(roundTerms);
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

        // Find existing docket and restore state
        const query = supabase
          .from('dockets')
          .select('id, custom_terms, commitment_flow_state, wire_received, wire_received_at')
          .eq('round_id', investorSession.roundId);

        if (investorSession.investorId) {
          query.eq('investor_id', investorSession.investorId);
        } else if (investorSession.accessKeyId) {
          query.eq('access_key_id', investorSession.accessKeyId);
        }

        const { data: docket } = await query.maybeSingle();

        if (docket) {
          setDocketId(docket.id);
          if (docket.custom_terms) {
            setCustomTerms(docket.custom_terms);
          }
          if (docket.wire_received_at) {
            setWireReceivedAt(docket.wire_received_at);
          }

          // Restore flow state if exists
          const flowState = docket.commitment_flow_state as FlowStateJson;
          let restoredStep: CommitmentStep = 'terms';
          let restoredCompleted: CommitmentStep[] = [];
          
          if (flowState && flowState.current_step) {
            restoredStep = flowState.current_step as CommitmentStep;
            restoredCompleted = (flowState.completed_steps || []) as CommitmentStep[];
            
            if (flowState.investor_details) {
              setInvestorDetails(flowState.investor_details as InvestorDetails);
            }
            if (flowState.investment_amount) {
              setInvestmentAmount(flowState.investment_amount);
            }
            if (flowState.document_html) {
              setDocumentHtml(flowState.document_html);
            }
          }

          // CRITICAL: If wire_received is true and wire step was completed, force finalize
          // This overrides any stored current_step to ensure funded dockets go to finalize
          if (docket.wire_received && restoredCompleted.includes('wire')) {
            restoredStep = 'finalize';
            if (!restoredCompleted.includes('finalize')) {
              restoredCompleted = [...restoredCompleted, 'finalize'];
            }
          }
          
          setCurrentStep(restoredStep);
          setCompletedSteps(restoredCompleted);
        }

        // Set company info from session
        setCompanyInfo(prev => ({
          ...prev,
          name: investorSession.companyName || '',
          logo: investorSession.companyLogo || null,
        }));

        // Pre-fill investor details if available and not restored
        if (investorSession.investorName && !stateRestored.current) {
          setInvestorDetails(prev => ({
            ...prev,
            name: prev.name || investorSession.investorName || '',
          }));
        }

        stateRestored.current = true;
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load terms');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [investorSession]);

  // Realtime subscription for wire_received updates
  useEffect(() => {
    if (!docketId || currentStep !== 'wire') return;

    const channel = supabase
      .channel(`docket-${docketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dockets',
          filter: `id=eq.${docketId}`,
        },
        (payload) => {
          const newData = payload.new as { wire_received?: boolean; wire_received_at?: string };
          if (newData.wire_received) {
            setWireReceivedAt(newData.wire_received_at || new Date().toISOString());
            // Auto-advance to finalize
            const newCompleted = [...completedSteps];
            if (!newCompleted.includes('wire')) {
              newCompleted.push('wire');
            }
            setCompletedSteps(newCompleted);
            setCurrentStep('finalize');
            toast.success('Wire transfer confirmed!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [docketId, currentStep, completedSteps]);

  const markStepComplete = useCallback((step: CommitmentStep) => {
    setCompletedSteps(prev => {
      if (!prev.includes(step)) {
        return [...prev, step];
      }
      return prev;
    });
  }, []);

  const goToStep = useCallback((step: CommitmentStep) => {
    setCurrentStep(step);
  }, []);

  // Step handlers with state persistence
  const handleTermsContinue = () => {
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('terms')) {
      newCompleted.push('terms');
    }
    setCompletedSteps(newCompleted);
    setCurrentStep('details');
    saveFlowState('details', newCompleted, investorDetails, investmentAmount, documentHtml);
  };

  const handleDetailsContinue = (details: InvestorDetails) => {
    setInvestorDetails(details);
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('details')) {
      newCompleted.push('details');
    }
    setCompletedSteps(newCompleted);
    setCurrentStep('amount');
    saveFlowState('amount', newCompleted, details, investmentAmount, documentHtml);
  };

  const handleAmountContinue = (amount: number) => {
    setInvestmentAmount(amount);
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('amount')) {
      newCompleted.push('amount');
    }
    setCompletedSteps(newCompleted);
    setCurrentStep('generate');
    saveFlowState('generate', newCompleted, investorDetails, amount, documentHtml);
  };

  const handleDocumentGenerated = useCallback((html: string) => {
    setDocumentHtml(html);
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('generate')) {
      newCompleted.push('generate');
    }
    setCompletedSteps(newCompleted);
    setCurrentStep('sign');
    saveFlowState('sign', newCompleted, investorDetails, investmentAmount, html);
  }, [completedSteps, investorDetails, investmentAmount, saveFlowState]);

  const handleSign = async (signature: string) => {
    if (!investorSession) return;

    setIsSubmitting(true);
    try {
      // Create or update docket with investor details
      const docketData = {
        round_id: investorSession.roundId,
        investor_id: investorSession.investorId,
        access_key_id: investorSession.accessKeyId || null,
        amount: investmentAmount,
        status: 'investor_signed',
        commitment_status: 'signed',
        investor_name: investorDetails.entityType === 'entity' ? investorDetails.entityName : investorDetails.name,
        investor_email: investorDetails.email,
        investor_phone: investorDetails.phone,
        investor_address: investorDetails.address,
        investor_entity_name: investorDetails.entityType === 'entity' ? investorDetails.entityName : null,
        investor_entity_type: investorDetails.entityType,
        is_global: !investorSession.investorId,
      };

      let targetDocketId = docketId;

      if (targetDocketId) {
        // Update existing docket
        const { error } = await supabase
          .from('dockets')
          .update(docketData)
          .eq('id', targetDocketId);

        if (error) throw error;
      } else {
        // Check if docket exists
        const query = supabase
          .from('dockets')
          .select('id')
          .eq('round_id', investorSession.roundId);

        if (investorSession.investorId) {
          query.eq('investor_id', investorSession.investorId);
        } else if (investorSession.accessKeyId) {
          query.eq('access_key_id', investorSession.accessKeyId);
        }

        const { data: existingDocket } = await query.maybeSingle();

        if (existingDocket) {
          // Update existing docket
          const { error } = await supabase
            .from('dockets')
            .update(docketData)
            .eq('id', existingDocket.id);

          if (error) throw error;
          targetDocketId = existingDocket.id;
          setDocketId(existingDocket.id);
        } else {
          // Create new docket
          const { data: newDocket, error } = await supabase
            .from('dockets')
            .insert(docketData)
            .select('id')
            .single();

          if (error) throw error;
          targetDocketId = newDocket.id;
          setDocketId(newDocket.id);
        }
      }

      // Record signature
      const { error: sigError } = await supabase
        .from('signatures')
        .insert({
          docket_id: targetDocketId!,
          signer_type: 'investor',
          signer_name: signature,
          signer_email: investorDetails.email,
          signer_title: investorDetails.entityType === 'entity' ? 'Authorized Signatory' : null,
          signature_data: signature,
        });

      if (sigError) throw sigError;

      const newCompleted = [...completedSteps];
      if (!newCompleted.includes('sign')) {
        newCompleted.push('sign');
      }
      setCompletedSteps(newCompleted);
      setCurrentStep('execute');
      saveFlowState('execute', newCompleted, investorDetails, investmentAmount, documentHtml, targetDocketId);
      toast.success('Agreement signed successfully');
    } catch (error) {
      console.error('Error signing agreement:', error);
      toast.error('Failed to sign agreement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteComplete = useCallback(() => {
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('execute')) {
      newCompleted.push('execute');
    }
    setCompletedSteps(newCompleted);
    setCurrentStep('wire');
    saveFlowState('wire', newCompleted, investorDetails, investmentAmount, documentHtml);
  }, [completedSteps, investorDetails, investmentAmount, documentHtml, saveFlowState]);

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
    return <CircuitSplash onComplete={() => setShowSplash(false)} />;
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

      {/* Company Logo - Top Right */}
      {companyInfo.logo && (
        <div className="absolute top-4 right-4 z-50">
          <img 
            src={companyInfo.logo} 
            alt={companyInfo.name} 
            className="h-8 w-auto object-contain"
          />
        </div>
      )}

      {/* Centered Card Container - Cut off at bottom */}
      <div className="flex-1 flex items-start justify-center pt-16 pb-0 px-8">
        <div className="bg-background rounded-t-xl shadow-sm border border-b-0 w-full max-w-5xl flex min-h-[600px] overflow-hidden">
          {/* Sidebar - No border-r, PoweredByCircuit at absolute bottom */}
          <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 p-6 pr-0">
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

          {/* Main Content - bg-muted to connect with active step */}
          <main className="flex-1 min-w-0 py-8 px-6 lg:px-10 overflow-y-auto max-h-[calc(100vh-6rem)] bg-muted">
            <div className="max-w-2xl pb-8">
              {currentStep === 'terms' && (
                <ReviewTermsStep
                  terms={terms}
                  customTerms={customTerms}
                  instrumentType={instrumentType}
                  companyInfo={companyInfo}
                  roundInfo={roundInfo}
                  onContinue={handleTermsContinue}
                />
              )}

              {currentStep === 'details' && (
                <InvestorDetailsStep
                  initialData={investorDetails}
                  onContinue={handleDetailsContinue}
                  onBack={() => goToStep('terms')}
                />
              )}

              {currentStep === 'amount' && (
                <InvestmentAmountStep
                  initialAmount={investmentAmount}
                  minimumTicket={terms?.minimum_ticket || null}
                  onContinue={handleAmountContinue}
                  onBack={() => goToStep('details')}
                />
              )}

              {currentStep === 'generate' && (
                <GenerateDocumentStep
                  onComplete={handleDocumentGenerated}
                  investorDetails={investorDetails}
                  amount={investmentAmount}
                  companyName={investorSession.companyName || ''}
                  roundId={investorSession.roundId}
                  roundTerms={terms}
                />
              )}

              {currentStep === 'sign' && (
                <SignAgreementStep
                  documentHtml={documentHtml}
                  investorName={investorDetails.name}
                  companyName={investorSession.companyName || ''}
                  onSign={handleSign}
                  onBack={() => goToStep('amount')}
                  isSubmitting={isSubmitting}
                />
              )}

              {currentStep === 'execute' && (
                <ExecuteStep
                  onComplete={handleExecuteComplete}
                  companyName={investorSession.companyName || ''}
                  signatoryName={terms?.signatory_name || undefined}
                />
              )}

              {currentStep === 'wire' && (
                <WireStep
                  amount={investmentAmount}
                  companyName={investorSession.companyName || ''}
                  wireInstructions={terms}
                  docketId={docketId}
                />
              )}

              {currentStep === 'finalize' && (
                <FinalizeStep
                  amount={investmentAmount}
                  companyName={investorSession.companyName || ''}
                  documentHtml={documentHtml}
                  signatoryName={terms?.signatory_name || undefined}
                  wireReceivedAt={wireReceivedAt}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
