import { useEffect, useState } from "react";
import { Loader2, FileText, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  pro_rata_enabled: boolean | null;
  mfn_enabled: boolean | null;
  company_name: string | null;
}

interface GenerateDocumentStepProps {
  onComplete: (documentHtml: string) => void;
  investorDetails: {
    name: string;
    email: string;
    address: string;
    entityType: 'individual' | 'entity';
    entityName: string;
  };
  amount: number;
  companyName: string;
  roundId: string;
  roundTerms: RoundTerms | null;
}

const steps = [
  { label: 'Loading YC SAFE template', delay: 600 },
  { label: 'Populating investor details', delay: 500 },
  { label: 'Applying round terms', delay: 400 },
  { label: 'Generating agreement with AI', delay: 800 },
  { label: 'Finalizing document', delay: 300 },
];

export default function GenerateDocumentStep({ 
  onComplete, 
  investorDetails, 
  amount, 
  companyName,
  roundId,
  roundTerms,
}: GenerateDocumentStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runSteps = async () => {
      // Run visual steps up to AI generation
      for (let i = 0; i < 3; i++) {
        if (cancelled) return;
        setCurrentStep(i);
        await new Promise(resolve => setTimeout(resolve, steps[i].delay));
        if (cancelled) return;
        setCompletedSteps(prev => [...prev, i]);
      }

      // AI generation step
      if (cancelled) return;
      setCurrentStep(3);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-safe-document', {
          body: {
            investorDetails,
            amount,
            companyName,
            roundTerms: roundTerms || {
              valuation_cap: null,
              discount_rate: null,
              pro_rata_enabled: false,
              mfn_enabled: false,
              company_name: companyName,
            },
          },
        });

        if (fnError) throw fnError;
        if (cancelled) return;

        setCompletedSteps(prev => [...prev, 3]);
        
        // Final step
        setCurrentStep(4);
        await new Promise(resolve => setTimeout(resolve, steps[4].delay));
        if (cancelled) return;
        setCompletedSteps(prev => [...prev, 4]);

        // Complete with the generated document
        onComplete(data.documentHtml);
      } catch (err) {
        console.error('Error generating document:', err);
        if (!cancelled) {
          setError('Failed to generate document. Please try again.');
        }
      }
    };

    runSteps();

    return () => {
      cancelled = true;
    };
  }, [investorDetails, amount, companyName, roundId, roundTerms, onComplete]);

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">
            Generation Failed
          </h1>
          <p className="text-muted-foreground mt-2">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Generating Agreement
        </h1>
        <p className="text-muted-foreground mt-2">
          Preparing your SAFE agreement using the YC template...
        </p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index && !isCompleted;
          const isPending = index > currentStep;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 py-2 transition-opacity ${
                isPending ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {isCompleted ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>
              <span className={`text-sm ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
