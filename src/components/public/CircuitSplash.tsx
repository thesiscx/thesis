import { useEffect, useState } from "react";
import circuitSplashGif from "@/assets/circuit-splash.gif";

interface CircuitSplashProps {
  onComplete: () => void;
  duration?: number;
}

export function CircuitSplash({ onComplete, duration = 2500 }: CircuitSplashProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation slightly before duration ends
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 500);

    // Complete after full duration
    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-background flex items-center justify-center transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        {/* GIF plays once naturally - no loop */}
        <img 
          src={`${circuitSplashGif}?t=${Date.now()}`}
          alt="Circuit"
          className="w-16 h-16"
          style={{ imageRendering: 'auto' }}
        />
        <span className="text-xs text-muted-foreground font-medium tracking-wide">
          CIRCUIT
        </span>
      </div>
    </div>
  );
}
