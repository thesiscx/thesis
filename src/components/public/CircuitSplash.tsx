import { useEffect, useState } from "react";
import circuitSplashGif from "@/assets/circuit-splash-new.gif";

interface CircuitSplashProps {
  onComplete: () => void;
  duration?: number;
}

export function CircuitSplash({ onComplete, duration = 3000 }: CircuitSplashProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [gifKey] = useState(() => Date.now()); // Ensures GIF plays fresh

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
      <img 
        key={gifKey}
        src={`${circuitSplashGif}?t=${gifKey}`}
        alt="Circuit"
        className="h-32 w-auto"
      />
    </div>
  );
}
