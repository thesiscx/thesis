import { useEffect, useState, useRef } from "react";
import circuitSplashGif from "@/assets/circuit-splash-new.gif";

interface CircuitSplashProps {
  onComplete: () => void;
}

export function CircuitSplash({ onComplete }: CircuitSplashProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const gifKey = useRef(Date.now());
  
  // GIF duration ~2.2s + buffer before fade
  const GIF_DURATION = 2200;
  const FADE_DURATION = 400;

  // Preload the GIF
  useEffect(() => {
    const img = new Image();
    img.src = `${circuitSplashGif}?t=${gifKey.current}`;
    img.onload = () => setIsLoaded(true);
  }, []);

  // Only start timers after GIF is loaded
  useEffect(() => {
    if (!isLoaded) return;
    
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
  }, [isLoaded, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-background flex items-center justify-center transition-opacity duration-400 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img 
        src={`${circuitSplashGif}?t=${gifKey.current}`}
        alt=""
        className={`h-32 w-auto transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
