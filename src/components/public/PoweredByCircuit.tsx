import { Zap, Shield } from "lucide-react";

interface PoweredByCircuitProps {
  variant?: 'footer' | 'badge';
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

  return (
    <div className="flex flex-col items-center gap-1 py-6">
      <a 
        href="https://circuit.cx" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Zap className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Powered by Circuit</span>
      </a>
      <span className="text-[10px] text-muted-foreground/70">Secure Investment Platform</span>
    </div>
  );
}
