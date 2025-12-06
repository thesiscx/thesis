import circuitLogo from "@/assets/circuit-logo.png";
import ActionChatPanel from "./ActionChatPanel";

type PageKey = "stage" | "memo" | "docket" | "pipeline";

interface AssistantSidebarProps {
  pageKey?: PageKey;
  roundId?: string;
  roundSlug?: string;
  onOpenRound?: () => void;
  onUpdateMemoContent?: (content: any) => void;
}

export default function AssistantSidebar({ 
  pageKey = "stage", 
  roundId, 
  roundSlug,
  onOpenRound,
  onUpdateMemoContent,
}: AssistantSidebarProps) {
  return (
    <aside className="w-96 h-screen border-l border-border/50 bg-[hsl(var(--assistant-bg))] flex flex-col shrink-0">
      {/* Header with Circuit logo - no bottom border for cleaner look */}
      <div className="h-14 flex items-center px-6 shrink-0">
        <img src={circuitLogo} alt="Circuit" className="h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ActionChatPanel 
          pageKey={pageKey} 
          roundId={roundId} 
          roundSlug={roundSlug}
          onOpenRound={onOpenRound}
          onUpdateMemoContent={onUpdateMemoContent}
        />
      </div>
    </aside>
  );
}
