import { format } from "date-fns";
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
  const now = new Date();
  
  return (
    <aside className="w-96 h-screen border-l border-border bg-background flex flex-col shrink-0">
      {/* Header - monospace style like reference */}
      <div className="h-14 border-b border-border flex items-center justify-between px-5 shrink-0">
        <span className="text-sm font-medium tracking-wide uppercase">Circuit</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ActionChatPanel pageKey={pageKey} roundId={roundId} roundSlug={roundSlug} />
      </div>
    </aside>
  );
}
