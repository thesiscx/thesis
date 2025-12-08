import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusState = "idle" | "loading" | "success" | "error";

interface StatusLineProps {
  status: StatusState;
  idleText: string;
  loadingText?: string;
  successText?: string;
  errorText?: string;
}

export function StatusLine({ 
  status, 
  idleText, 
  loadingText = "Processing...",
  successText = "Done",
  errorText = "Something went wrong"
}: StatusLineProps) {
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
      {status === "idle" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
          <span>{idleText}</span>
        </>
      )}
      {status === "loading" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="animate-pulse">{loadingText}</span>
        </>
      )}
      {status === "success" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
          <span className="text-green-600">{successText}</span>
        </>
      )}
      {status === "error" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
          <span className="text-destructive">{errorText}</span>
        </>
      )}
    </div>
  );
}
