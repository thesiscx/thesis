import { useState } from "react";
import { 
  Sparkles, 
  Calendar, 
  History, 
  UserPlus,
  FileEdit,
  Link2,
  Globe,
  FolderOpen,
  Settings,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { cn } from "@/lib/utils";

// Import tab cards
import { 
  BulletinCard, 
  AgendaCard, 
  RecapCard, 
  AddInvestorCard,
  PublishCard,
  EditMemoCard,
  ShareLinksCard
} from "./tabs";

type PageKey = "stage" | "memo" | "docket" | "pipeline";

// Tab definitions per page
type PipelineTab = "bulletin" | "agenda" | "recap" | "add-investor";
type MemoTab = "publish" | "edit" | "share";
type DocketTab = "add-docket" | "terms";

interface ActionChatPanelProps {
  pageKey: PageKey;
  roundId?: string;
  roundSlug?: string;
  onOpenRound?: () => void;
  onUpdateMemoContent?: (content: any) => void;
  hasMemoContent?: boolean;
  currentMemoContent?: any;
}

const PIPELINE_TABS = [
  { key: "bulletin" as const, label: "Bulletin", icon: Sparkles },
  { key: "agenda" as const, label: "Agenda", icon: Calendar },
  { key: "recap" as const, label: "Recap", icon: History },
  { key: "add-investor" as const, label: "Add Investor", icon: UserPlus },
];

const MEMO_TABS = [
  { key: "publish" as const, label: "Publish", icon: Globe },
  { key: "edit" as const, label: "Edit Memo", icon: FileEdit },
  { key: "share" as const, label: "Share Links", icon: Link2 },
];

const DOCKET_TABS = [
  { key: "add-docket" as const, label: "Add Docket", icon: FolderOpen },
  { key: "terms" as const, label: "Terms", icon: Settings },
];

export default function ActionChatPanel({
  pageKey,
  roundId,
  roundSlug,
  onOpenRound,
  onUpdateMemoContent,
  hasMemoContent,
  currentMemoContent,
}: ActionChatPanelProps) {
  const { user, isLoading: authLoading } = useFounderAuth();
  
  // Tab state per page
  const [pipelineTab, setPipelineTab] = useState<PipelineTab>("bulletin");
  const [memoTab, setMemoTab] = useState<MemoTab>("publish");
  const [docketTab, setDocketTab] = useState<DocketTab>("add-docket");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
        <p className="text-sm font-medium mb-1">Circuit</p>
        <p className="text-xs text-muted-foreground">Sign in to continue</p>
      </div>
    );
  }

  // Render Pipeline page tabs
  if (pageKey === "pipeline") {
    return (
      <div className="flex flex-col h-full">
        {/* Card content area */}
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {pipelineTab === "bulletin" && <BulletinCard roundId={roundId} />}
          {pipelineTab === "agenda" && <AgendaCard roundId={roundId} />}
          {pipelineTab === "recap" && <RecapCard roundId={roundId} />}
          {pipelineTab === "add-investor" && (
            <AddInvestorCard 
              roundId={roundId} 
              onSuccess={() => setPipelineTab("bulletin")} 
            />
          )}
        </div>
        
        {/* Tab bar */}
        <div className="px-6 pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {PIPELINE_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                onClick={() => setPipelineTab(tab.key)}
                className={cn(
                  "h-8 text-xs gap-1.5 transition-all",
                  pipelineTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90" 
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render Memo page tabs
  if (pageKey === "memo") {
    return (
      <div className="flex flex-col h-full">
        {/* Card content area */}
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {memoTab === "publish" && (
            <PublishCard roundId={roundId} roundSlug={roundSlug} />
          )}
          {memoTab === "edit" && (
            <EditMemoCard 
              roundId={roundId} 
              roundSlug={roundSlug}
              onUpdateMemoContent={onUpdateMemoContent}
              currentMemoContent={currentMemoContent}
            />
          )}
          {memoTab === "share" && (
            <ShareLinksCard roundId={roundId} roundSlug={roundSlug} />
          )}
        </div>
        
        {/* Tab bar */}
        <div className="px-6 pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {MEMO_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                onClick={() => setMemoTab(tab.key)}
                className={cn(
                  "h-8 text-xs gap-1.5 transition-all",
                  memoTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90" 
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render Docket page tabs (placeholder for now - will implement in next phase)
  if (pageKey === "docket") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          <div className="rounded-xl border border-border bg-secondary/50 p-6">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {docketTab === "add-docket" && "Create a new investor docket"}
                {docketTab === "terms" && "Configure deal terms"}
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-6 pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {DOCKET_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                onClick={() => setDocketTab(tab.key)}
                className={cn(
                  "h-8 text-xs gap-1.5 transition-all",
                  docketTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90" 
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Stage/Homepage - no tabs, just welcome
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="rounded-xl border border-border bg-secondary/50 p-6">
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Welcome to Circuit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
