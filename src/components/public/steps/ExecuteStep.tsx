import { useEffect, useState } from "react";
import { Loader2, Stamp, Check, AlertCircle, Shield } from "lucide-react";

interface ExecuteStepProps {
  onComplete: () => void;
  companyName: string;
  signatoryName?: string;
}

const steps = [
  { label: 'Validating investor signature', delay: 700 },
  { label: 'Applying pre-authorized counter-signature', delay: 900 },
  { label: 'Generating audit trail', delay: 600 },
  { label: 'Preparing executed agreement', delay: 500 },
  { label: 'Finalizing document', delay: 400 },
];

export default function ExecuteStep({ 
  onComplete, 
  companyName,
  signatoryName,
}: ExecuteStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;
        setCurrentStep(i);
        await new Promise(resolve => setTimeout(resolve, steps[i].delay));
        if (cancelled) return;
        setCompletedSteps(prev => [...prev, i]);
      }

      // Small delay before completing
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!cancelled) {
        onComplete();
      }
    };

    runSteps();

    return () => {
      cancelled = true;
    };
  }, [onComplete]);

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">
            Execution Failed
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
          <Stamp className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Executing Agreement
        </h1>
        <p className="text-muted-foreground mt-2">
          Applying {signatoryName ? `${signatoryName}'s` : companyName + "'s"} counter-signature...
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

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span>E-Sign Act & UETA Compliant</span>
      </div>
    </div>
  );
}
