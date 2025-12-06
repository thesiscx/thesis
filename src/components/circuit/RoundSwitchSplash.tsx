import { useEffect, useState } from "react";

interface RoundSwitchSplashProps {
  roundName: string;
  onComplete: () => void;
}

const steps = [
  "Switching environment",
  "Loading Pipeline",
  "Loading Memo",
  "Loading Docket",
  "Ready",
];

export default function RoundSwitchSplash({ roundName, onComplete }: RoundSwitchSplashProps) {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Start with first step
    setVisibleSteps([0]);
    setCurrentStep(1);

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length) {
          clearInterval(interval);
          // Complete after showing all steps
          setTimeout(onComplete, 300);
          return prev;
        }

        setVisibleSteps((items) => [...items, prev]);
        return prev + 1;
      });
    }, 180); // Quick timing

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="flex flex-col items-center">
        {/* Round name */}
        <div className="text-2xl font-heading font-bold mb-8 animate-fade-in">
          {roundName}
        </div>

        {/* Steps stream */}
        <div className="h-32 overflow-hidden relative flex flex-col items-center justify-end">
          {/* Top fade */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-10" />

          <div className="flex flex-col items-center justify-end pb-2">
            {visibleSteps.map((stepIndex, i) => {
              const isNewest = i === visibleSteps.length - 1;
              const opacity = isNewest ? 1 : Math.max(0.15, 1 - (visibleSteps.length - 1 - i) * 0.25);

              return (
                <div
                  key={stepIndex}
                  className="text-sm text-muted-foreground transition-all duration-300 ease-out py-1"
                  style={{
                    opacity,
                    animation: isNewest ? "fade-in 0.3s ease-out" : undefined,
                  }}
                >
                  {steps[stepIndex]}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
