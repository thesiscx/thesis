import { Shield } from "lucide-react";
import circuitLogo from "@/assets/circuit-logo-new.png";

interface PoweredByCircuitProps {
  variant?: 'footer' | 'badge' | 'inline';
}

export function PoweredByCircuit({ variant = 'footer' }: PoweredByCircuitProps) {
  if (variant === 'badge') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
        <Shield className="w-4 h-4 text-primary" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">Secured by Circuit</span>
          <span className="text-[10px] text-muted-foreground">E-Sign Act & UETA compliant</span>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="group relative flex flex-col gap-1 overflow-hidden rounded-md px-2 py-1.5 cursor-pointer">
        {/* Shine overlay */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        
        <a 
          href="https://circuit.cx" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <span className="text-[11px] text-muted-foreground/50">Powered by</span>
          <img src={circuitLogo} alt="Circuit" className="h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col items-center gap-1 py-6 overflow-hidden cursor-pointer">
      {/* Shine overlay */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      
      <a 
        href="https://circuit.cx" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="text-xs text-muted-foreground/60">Powered by</span>
        <img src={circuitLogo} alt="Circuit" className="h-4" />
      </a>
      <span className="text-[10px] text-muted-foreground/70">Secure Investment Platform</span>
    </div>
  );
}
