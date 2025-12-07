import { useEffect, useState } from "react";
import circuitSplashGif from "@/assets/circuit-splash-new.gif";

interface CircuitSplashProps {
  onComplete: () => void;
}

export function CircuitSplash({ onComplete }: CircuitSplashProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [gifKey] = useState(() => Date.now());
  
  // GIF duration ~2.2s + 300ms buffer before fade
  const GIF_DURATION = 2200;
  const FADE_DURATION = 400;

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, GIF_DURATION);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, GIF_DURATION + FADE_DURATION);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-background flex items-center justify-center transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img 
        key={gifKey}
        src={`${circuitSplashGif}?t=${gifKey}`}
        alt=""
        className="h-32 w-auto"
      />
    </div>
  );
}
