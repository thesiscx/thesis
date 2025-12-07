import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
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
  const [logoLoaded, setLogoLoaded] = useState(false);
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

  // Preload company logo when available
  useEffect(() => {
    if (investorSession?.companyLogo) {
      const img = new Image();
      img.onload = () => setLogoLoaded(true);
      img.onerror = () => setLogoLoaded(true);
      img.src = investorSession.companyLogo;
    } else {
      setLogoLoaded(true);
    }
  }, [investorSession?.companyLogo]);

  // Form data
  const [investorDetails, setInvestorDetails] = useState<InvestorDetails>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
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

      // Update the docket with flow state via edge function (bypasses RLS)
      if (targetDocketId && investorSession?.roundId) {
        try {
          await supabase.functions.invoke('update-investor-docket', {
            body: {
              docketId: targetDocketId,
              roundId: investorSession.roundId,
              updateType: 'flow_state',
              data: { flowState },
            },
          });
        } catch (err) {
          console.error('Failed to update flow state:', err);
        }
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
          .select('id, amount, custom_terms, commitment_flow_state, wire_received, wire_received_at, investor_email')
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
            // Use flow state amount or fall back to docket amount
            if (flowState.investment_amount) {
              setInvestmentAmount(flowState.investment_amount);
            } else if (docket.amount) {
              setInvestmentAmount(Number(docket.amount));
            }
            if (flowState.document_html) {
              setDocumentHtml(flowState.document_html);
            }
          } else if (docket.amount) {
            // No flow state but docket has amount
            setInvestmentAmount(Number(docket.amount));
          }

          // CRITICAL: If wire_received is true and execute step was completed, force finalize
          // This handles the case where founder marks wire_received externally
          if (docket.wire_received && restoredCompleted.includes('execute')) {
            restoredStep = 'finalize';
            // Ensure wire step is marked complete
            if (!restoredCompleted.includes('wire')) {
              restoredCompleted = [...restoredCompleted, 'wire'];
            }
            if (!restoredCompleted.includes('finalize')) {
              restoredCompleted = [...restoredCompleted, 'finalize'];
            }
            // Save the corrected state to database
            await saveFlowState(
              'finalize',
              restoredCompleted,
              investorDetails,
              investmentAmount,
              documentHtml
            );
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
        if (!stateRestored.current) {
          setInvestorDetails(prev => ({
            ...prev,
            name: prev.name || investorSession.investorName || '',
            // Email will be pre-filled from docket.investor_email if available
            email: prev.email || docket?.investor_email || '',
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
  const handleTermsContinue = async () => {
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('terms')) {
      newCompleted.push('terms');
    }
    setCompletedSteps(newCompleted);
    setCurrentStep('details');
    saveFlowState('details', newCompleted, investorDetails, investmentAmount, documentHtml);
    
    // Update docket status to 'viewed' via edge function (bypasses RLS)
    if (investorSession?.roundId) {
      try {
        await supabase.functions.invoke('update-investor-docket', {
          body: {
            docketId,
            investorId: investorSession.investorId,
            accessKeyId: investorSession.accessKeyId,
            roundId: investorSession.roundId,
            updateType: 'viewed',
          },
        });
      } catch (err) {
        console.error('Failed to update docket status:', err);
      }
    }
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
        // Update existing docket via edge function (bypasses RLS)
        const { error } = await supabase.functions.invoke('update-investor-docket', {
          body: {
            docketId: targetDocketId,
            roundId: investorSession.roundId,
            updateType: 'signed',
            data: {
              amount: investmentAmount,
              investorName: investorDetails.entityType === 'entity' ? investorDetails.entityName : investorDetails.name,
              investorEmail: investorDetails.email,
              investorPhone: investorDetails.phone,
              investorAddress: investorDetails.address,
              entityName: investorDetails.entityType === 'entity' ? investorDetails.entityName : null,
              entityType: investorDetails.entityType,
            },
          },
        });

        if (error) throw new Error(error.message || 'Failed to update docket');
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
          // Update existing docket via edge function
          const { error } = await supabase.functions.invoke('update-investor-docket', {
            body: {
              docketId: existingDocket.id,
              roundId: investorSession.roundId,
              updateType: 'signed',
              data: {
                amount: investmentAmount,
                investorName: investorDetails.entityType === 'entity' ? investorDetails.entityName : investorDetails.name,
                investorEmail: investorDetails.email,
                investorPhone: investorDetails.phone,
                investorAddress: investorDetails.address,
                entityName: investorDetails.entityType === 'entity' ? investorDetails.entityName : null,
                entityType: investorDetails.entityType,
              },
            },
          });

          if (error) throw new Error(error.message || 'Failed to update docket');
          targetDocketId = existingDocket.id;
          setDocketId(existingDocket.id);
        } else {
          // Create new docket - this still needs direct insert for creation
          // but the edge function should handle updates after
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

      // Log investor_signed activity
      if (targetDocketId) {
        try {
          await supabase.functions.invoke('log-investor-activity', {
            body: {
              actionType: 'investor_signed',
              docketId: targetDocketId,
              roundId: investorSession.roundId,
              investorId: investorSession.investorId,
              metadata: {
                investor_name: investorDetails.name,
                amount: investmentAmount,
              },
            },
          });
        } catch (logError) {
          console.error('Failed to log activity:', logError);
        }
      }

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

  const handleExecuteComplete = useCallback(async () => {
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('execute')) {
      newCompleted.push('execute');
    }
    setCompletedSteps(newCompleted);
    setCurrentStep('wire');
    saveFlowState('wire', newCompleted, investorDetails, investmentAmount, documentHtml);

    // Log deal_executed activity
    if (docketId && investorSession?.roundId) {
      try {
        await supabase.functions.invoke('log-investor-activity', {
          body: {
            actionType: 'deal_executed',
            docketId: docketId,
            roundId: investorSession.roundId,
            investorId: investorSession.investorId,
            metadata: {
              investor_name: investorDetails.name,
              amount: investmentAmount,
            },
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }
  }, [completedSteps, investorDetails, investmentAmount, documentHtml, saveFlowState, docketId, investorSession]);

  const handleClose = () => {
    clearInvestorSession();
    navigate(`/share/${companySlug}/${roundCode}/docket/${investorSlug}`, { replace: true });
  };

  const handleLogout = () => {
    clearInvestorSession();
    navigate(`/share/${companySlug}/${roundCode}/memo`, { replace: true });
  };

  // Show splash screen immediately - covers loading time
  if (showSplash) {
    return <CircuitSplash onComplete={() => setShowSplash(false)} />;
  }

  if (isAuthLoading || !investorSession || isLoading) {
    return null;
  }

  return (
    <div className="h-screen bg-muted/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-14 bg-muted/30 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          {companyInfo.logo && logoLoaded ? (
            <img 
              src={companyInfo.logo} 
              alt={companyInfo.name} 
              className="h-5 w-auto object-contain"
            />
          ) : companyInfo.logo ? (
            <div className="h-5 w-5 bg-muted/50 rounded animate-pulse" />
          ) : null}
          <span className="text-sm font-medium">{companyInfo.name} Investment Docket</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{investorDetails.name || investorSession?.investorName || 'Investor'}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClose} 
            className="gap-2"
          >
            Exit
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Centered Card Container - extends to bottom */}
      <div className="flex-1 flex items-stretch justify-center px-8 pb-0 overflow-hidden pt-8">
        <div className="bg-background rounded-t-xl shadow-sm border border-b-0 w-full max-w-5xl flex overflow-hidden mt-4">
          {/* Sidebar - No border-r, PoweredByCircuit at absolute bottom */}
          <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 p-6 pr-0">
            <div className="flex-1">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Investment Process
              </h2>
              <CommitmentSteps currentStep={currentStep} completedSteps={completedSteps} />
            </div>
            
            {/* PoweredByCircuit at bottom of sidebar */}
            <div className="pr-6 mt-12">
              <PoweredByCircuit variant="inline" />
            </div>
          </aside>

          {/* Main Content - bg-muted to connect with active step */}
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-muted">
            <div className="flex-1 overflow-y-auto py-8 px-6 lg:px-10">
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
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
