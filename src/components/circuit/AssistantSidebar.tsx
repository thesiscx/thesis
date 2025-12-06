import circuitLogo from "@/assets/circuit-logo.png";
import ActionChatPanel from "./ActionChatPanel";

type PageKey = "stage" | "memo" | "docket" | "pipeline";

interface AssistantSidebarProps {
  pageKey?: PageKey;
  roundId?: string;
  roundSlug?: string;
  onOpenRound?: () => void;
  onUpdateMemoContent?: (content: any) => void;
  hasMemoContent?: boolean;
  currentMemoContent?: any;
}

export default function AssistantSidebar({ 
  pageKey = "stage", 
  roundId, 
  roundSlug,
  onOpenRound,
  onUpdateMemoContent,
  hasMemoContent,
  currentMemoContent,
}: AssistantSidebarProps) {
  return (
    <aside className="w-96 h-screen bg-[hsl(var(--canvas))] flex flex-col shrink-0">
      {/* Header with Circuit logo - aligned with main header */}
      <div className="h-14 flex items-center px-6 shrink-0 pt-3">
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
          hasMemoContent={hasMemoContent}
          currentMemoContent={currentMemoContent}
        />
      </div>
    </aside>
  );
}
