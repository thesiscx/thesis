import { Check, Loader2 } from 'lucide-react';

export interface LoadingStage {
  label: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
}

interface LoadingTerminalProps {
  stages: LoadingStage[];
}

export function LoadingTerminal({ stages }: LoadingTerminalProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="space-y-3 font-mono text-sm">
        {stages.map((stage, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-3 transition-opacity duration-300 ${
              stage.status === 'pending' ? 'opacity-40' : 'opacity-100'
            }`}
          >
            {/* Status indicator */}
            <div className="w-5 h-5 flex items-center justify-center">
              {stage.status === 'complete' && (
                <Check className="w-4 h-4 text-green-600" />
              )}
              {stage.status === 'loading' && (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              )}
              {stage.status === 'pending' && (
                <span className="text-muted-foreground/50">○</span>
              )}
              {stage.status === 'error' && (
                <span className="text-destructive">✕</span>
              )}
            </div>

            {/* Stage label */}
            <span className={`${
              stage.status === 'complete' ? 'text-foreground' :
              stage.status === 'loading' ? 'text-muted-foreground' :
              stage.status === 'error' ? 'text-destructive' :
              'text-muted-foreground/50'
            }`}>
              {stage.status === 'loading' ? `${stage.label}...` : stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
