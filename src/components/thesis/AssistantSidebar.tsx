import thesisLogo from "@/assets/thesis-logo.png";
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
  // Subpage props
  isSubpage?: boolean;
  investorSlug?: string;
  investorId?: string;
  investorName?: string;
  investorStatus?: string;
  accessKeyId?: string;
  docketId?: string;
}

export default function AssistantSidebar({ 
  pageKey = "stage", 
  roundId, 
  roundSlug,
  onOpenRound,
  onUpdateMemoContent,
  hasMemoContent,
  currentMemoContent,
  isSubpage = false,
  investorSlug,
  investorId,
  investorName,
  investorStatus,
  accessKeyId,
  docketId,
}: AssistantSidebarProps) {
  return (
    <aside className="w-96 h-screen bg-[hsl(var(--canvas))] flex flex-col shrink-0">
      {/* Header with Thesis logo - vertically aligned with main header */}
      <div className="h-14 flex items-center px-6 shrink-0">
        <img src={thesisLogo} alt="Thesis" className="h-5" />
      </div>

      {/* Content - ActionChatPanel already receives roundId */}
      <div className="flex-1 overflow-hidden">
        <ActionChatPanel 
          pageKey={pageKey} 
          roundId={roundId} 
          roundSlug={roundSlug}
          onOpenRound={onOpenRound}
          onUpdateMemoContent={onUpdateMemoContent}
          hasMemoContent={hasMemoContent}
          currentMemoContent={currentMemoContent}
          isSubpage={isSubpage}
          investorSlug={investorSlug}
          investorId={investorId}
          investorName={investorName}
          investorStatus={investorStatus}
          accessKeyId={accessKeyId}
          docketId={docketId}
        />
      </div>
    </aside>
  );
}
