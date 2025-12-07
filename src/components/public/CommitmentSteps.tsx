import { Check, FileText, User, DollarSign, FileSignature, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CommitmentStep = 
  | 'review-terms' 
  | 'your-details' 
  | 'investment-amount' 
  | 'generate-document' 
  | 'sign-agreement' 
  | 'confirmation';

interface Step {
  id: CommitmentStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { id: 'review-terms', label: 'Review Terms', icon: FileText },
  { id: 'your-details', label: 'Your Details', icon: User },
  { id: 'investment-amount', label: 'Amount', icon: DollarSign },
  { id: 'generate-document', label: 'Generate', icon: Sparkles },
  { id: 'sign-agreement', label: 'Sign', icon: FileSignature },
  { id: 'confirmation', label: 'Done', icon: CheckCircle2 },
];

interface CommitmentStepsProps {
  currentStep: CommitmentStep;
  completedSteps: CommitmentStep[];
}

export default function CommitmentSteps({ currentStep, completedSteps }: CommitmentStepsProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <nav className="space-y-0.5">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;
        const isPast = index < currentIndex;
        const Icon = step.icon;

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors",
              isCurrent && "bg-primary/10 text-primary",
              !isCurrent && !isCompleted && "text-muted-foreground",
              (isCompleted || isPast) && !isCurrent && "text-muted-foreground"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium",
                isCurrent && "bg-primary text-primary-foreground",
                isCompleted && !isCurrent && "bg-primary/20 text-primary",
                !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted && !isCurrent ? (
                <Check className="w-3 h-3" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
            </div>
            <span className={cn(
              "text-sm",
              isCurrent && "text-primary font-medium",
              !isCurrent && "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
