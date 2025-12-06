import { useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import circuitLogo from "@/assets/circuit-logo.png";
import AIChatPanel from "./AIChatPanel";
import { cn } from "@/lib/utils";

interface AssistantSidebarProps {
  className?: string;
}

export default function AssistantSidebar({ className }: AssistantSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-full border-l border-border bg-background flex flex-col transition-all duration-200",
        isCollapsed ? "w-12" : "w-80",
        className
      )}
    >
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-3 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <img src={circuitLogo} alt="Circuit" className="h-4" />
            <span className="text-sm font-medium text-muted-foreground">Assistant</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <PanelRightOpen className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      {isCollapsed ? (
        <div className="flex-1 flex flex-col items-center pt-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCollapsed(false)}
          >
            <img src={circuitLogo} alt="Circuit" className="h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <AIChatPanel />
        </div>
      )}
    </aside>
  );
}