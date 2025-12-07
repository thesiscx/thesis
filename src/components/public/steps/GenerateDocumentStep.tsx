import { useEffect, useState } from "react";
import { Loader2, FileText, Check } from "lucide-react";

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
}

const steps = [
  { label: 'Preparing agreement template', delay: 800 },
  { label: 'Populating investor details', delay: 600 },
  { label: 'Calculating investment terms', delay: 500 },
  { label: 'Generating document', delay: 700 },
  { label: 'Finalizing agreement', delay: 400 },
];

export default function GenerateDocumentStep({ 
  onComplete, 
  investorDetails, 
  amount, 
  companyName,
  roundId 
}: GenerateDocumentStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

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

      // Generate the document HTML (in real app, this would call an edge function)
      if (!cancelled) {
        const documentHtml = generateSafeDocument({
          investorDetails,
          amount,
          companyName,
        });
        onComplete(documentHtml);
      }
    };

    runSteps();

    return () => {
      cancelled = true;
    };
  }, [investorDetails, amount, companyName, roundId, onComplete]);

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
          Preparing your SAFE agreement...
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

// Simple SAFE document generator (in production, this would be an edge function)
function generateSafeDocument({
  investorDetails,
  amount,
  companyName,
}: {
  investorDetails: {
    name: string;
    email: string;
    address: string;
    entityType: 'individual' | 'entity';
    entityName: string;
  };
  amount: number;
  companyName: string;
}): string {
  const investorName = investorDetails.entityType === 'entity' 
    ? investorDetails.entityName 
    : investorDetails.name;
  
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div class="safe-document">
      <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 8px;">
        SAFE
      </h1>
      <h2 style="text-align: center; font-size: 14px; color: #666; margin-bottom: 32px;">
        (Simple Agreement for Future Equity)
      </h2>
      
      <p style="margin-bottom: 16px;">
        THIS INSTRUMENT AND ANY SECURITIES ISSUABLE PURSUANT HERETO HAVE NOT BEEN REGISTERED 
        UNDER THE SECURITIES ACT OF 1933, AS AMENDED (THE "SECURITIES ACT"), OR UNDER THE 
        SECURITIES LAWS OF CERTAIN STATES.
      </p>
      
      <p style="margin-bottom: 24px;">
        <strong>${companyName}</strong> (the "Company"), hereby certifies that in exchange for 
        the payment by <strong>${investorName}</strong> (the "Investor") of <strong>${formattedAmount}</strong> 
        (the "Purchase Amount") on or about ${currentDate}, the Company issues to the Investor 
        the right to certain shares of the Company's Capital Stock, subject to the terms 
        described below.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 24px; margin-bottom: 12px;">
        1. Events
      </h3>
      
      <p style="margin-bottom: 16px;">
        <strong>(a) Equity Financing.</strong> If there is an Equity Financing before the 
        termination of this Safe, on the initial closing of such Equity Financing, this Safe 
        will automatically convert into the number of shares of Safe Preferred Stock equal to 
        the Purchase Amount divided by the Conversion Price.
      </p>

      <p style="margin-bottom: 16px;">
        <strong>(b) Liquidity Event.</strong> If there is a Liquidity Event before the 
        termination of this Safe, this Safe will automatically be entitled to receive a portion 
        of Proceeds, due and payable to the Investor immediately prior to, or concurrent with, 
        the consummation of such Liquidity Event.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 24px; margin-bottom: 12px;">
        2. Definitions
      </h3>
      
      <p style="margin-bottom: 16px;">
        "Capital Stock" means the capital stock of the Company, including, without limitation, 
        the "Common Stock" and the "Preferred Stock."
      </p>

      <p style="margin-bottom: 16px;">
        "Conversion Price" means the price per share of the Safe Preferred Stock.
      </p>

      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">
          Signatures
        </h3>
        
        <div style="display: flex; gap: 48px; margin-top: 24px;">
          <div style="flex: 1;">
            <p style="font-weight: bold; margin-bottom: 8px;">COMPANY:</p>
            <p>${companyName}</p>
            <div style="border-bottom: 1px solid #000; margin-top: 32px; margin-bottom: 4px;"></div>
            <p style="font-size: 12px; color: #666;">By: Authorized Signatory</p>
          </div>
          
          <div style="flex: 1;">
            <p style="font-weight: bold; margin-bottom: 8px;">INVESTOR:</p>
            <p>${investorName}</p>
            <div style="border-bottom: 1px solid #000; margin-top: 32px; margin-bottom: 4px;"></div>
            <p style="font-size: 12px; color: #666;">By: ${investorDetails.name}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}