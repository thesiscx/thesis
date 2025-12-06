import circuitLogo from "@/assets/circuit-logo.png";
import ActionChatPanel from "./ActionChatPanel";

type PageKey = "stage" | "memo" | "docket" | "pipeline";

interface AssistantSidebarProps {
  pageKey?: PageKey;
  roundId?: string;
  roundSlug?: string;
}

export default function AssistantSidebar({ 
  pageKey = "stage", 
  roundId, 
  roundSlug 
}: AssistantSidebarProps) {
  return (
    <aside className="w-96 h-screen border-l border-border bg-background flex flex-col shrink-0">
      {/* Header with Circuit logo */}
      <div className="h-14 border-b border-border flex items-center px-5 shrink-0">
        <img src={circuitLogo} alt="Circuit" className="h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ActionChatPanel pageKey={pageKey} roundId={roundId} roundSlug={roundSlug} />
      </div>
    </aside>
  );
}
