import { useState } from "react";
import { 
  Sparkles, 
  Calendar, 
  UserPlus,
  FileEdit,
  Link2,
  Globe,
  FolderPlus,
  TrendingUp,
  Loader2,
  Activity,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { cn } from "@/lib/utils";

// Import tab cards
import { 
  BulletinCard, 
  AgendaCard, 
  AddInvestorCard,
  PublishCard,
  EditMemoCard,
  ShareLinksCard,
  FinancingSummaryCard,
  CreateDocketCard,
  VoidCard,
  ManageInvestorCard,
  AccessLogsCard,
  DocketStatusCard,
  PipelineActivityCard
} from "./tabs";

type PageKey = "stage" | "memo" | "docket" | "pipeline";

// Tab definitions per page
type PipelineTab = "bulletin" | "agenda" | "add-investor";
type MemoTab = "publish" | "edit" | "share";
type DocketTab = "summary" | "create";

// Subpage tab definitions
type MemoSubpageTab = "status" | "void";
type DocketSubpageTab = "status" | "void";
type PipelineSubpageTab = "status" | "manage";

interface ActionChatPanelProps {
  pageKey: PageKey;
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
  accessKeyId?: string;
  docketId?: string;
}

const PIPELINE_TABS = [
  { key: "bulletin" as const, label: "Bulletin", icon: Sparkles },
  { key: "agenda" as const, label: "Agenda", icon: Calendar },
  { key: "add-investor" as const, label: "Add", icon: UserPlus },
];

const MEMO_TABS = [
  { key: "publish" as const, label: "Publish", icon: Globe },
  { key: "edit" as const, label: "Edit", icon: FileEdit },
  { key: "share" as const, label: "Share", icon: Link2 },
];

const DOCKET_TABS = [
  { key: "summary" as const, label: "Summary", icon: TrendingUp },
  { key: "create" as const, label: "Create", icon: FolderPlus },
];

// Subpage tabs
const MEMO_SUBPAGE_TABS = [
  { key: "status" as const, label: "Status", icon: Activity },
  { key: "void" as const, label: "Void", icon: AlertTriangle },
];

const DOCKET_SUBPAGE_TABS = [
  { key: "status" as const, label: "Status", icon: Activity },
  { key: "void" as const, label: "Void", icon: AlertTriangle },
];

const PIPELINE_SUBPAGE_TABS = [
  { key: "status" as const, label: "Status", icon: Activity },
  { key: "manage" as const, label: "Manage", icon: Trash2 },
];

export default function ActionChatPanel({
  pageKey,
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
  accessKeyId,
  docketId,
}: ActionChatPanelProps) {
  const { user, isLoading: authLoading } = useFounderAuth();
  
  // Tab state per page
  const [pipelineTab, setPipelineTab] = useState<PipelineTab>("bulletin");
  const [memoTab, setMemoTab] = useState<MemoTab>("publish");
  const [docketTab, setDocketTab] = useState<DocketTab>("summary");
  
  // Subpage tab state
  const [memoSubpageTab, setMemoSubpageTab] = useState<MemoSubpageTab>("status");
  const [docketSubpageTab, setDocketSubpageTab] = useState<DocketSubpageTab>("status");
  const [pipelineSubpageTab, setPipelineSubpageTab] = useState<PipelineSubpageTab>("status");

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

  // Render Memo subpage tabs
  if (isSubpage && pageKey === "memo") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {memoSubpageTab === "status" && (
            <AccessLogsCard accessKeyId={accessKeyId} investorName={investorName} />
          )}
          {memoSubpageTab === "void" && (
            <VoidCard 
              accessKeyId={accessKeyId} 
              investorName={investorName}
              roundSlug={roundSlug}
              tool="memo"
            />
          )}
        </div>
        
        <div className="px-6 pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {MEMO_SUBPAGE_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                onClick={() => setMemoSubpageTab(tab.key)}
                className={cn(
                  "h-8 text-xs gap-1.5 transition-all rounded-md",
                  memoSubpageTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90 tab-button-shine border border-border/80"
                    : "bg-[hsl(var(--canvas))] text-foreground border border-border/80 hover:bg-muted/50 tab-button-shine-muted"
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

  // Render Docket subpage tabs
  if (isSubpage && pageKey === "docket") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {docketSubpageTab === "status" && (
            <DocketStatusCard docketId={docketId} investorName={investorName} />
          )}
          {docketSubpageTab === "void" && (
            <VoidCard 
              accessKeyId={accessKeyId} 
              investorName={investorName}
              roundSlug={roundSlug}
              tool="docket"
            />
          )}
        </div>
        
        <div className="px-6 pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {DOCKET_SUBPAGE_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                onClick={() => setDocketSubpageTab(tab.key)}
                className={cn(
                  "h-8 text-xs gap-1.5 transition-all rounded-md",
                  docketSubpageTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90 tab-button-shine border border-border/80"
                    : "bg-[hsl(var(--canvas))] text-foreground border border-border/80 hover:bg-muted/50 tab-button-shine-muted"
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

  // Render Pipeline subpage tabs
  if (isSubpage && pageKey === "pipeline") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {pipelineSubpageTab === "status" && (
            <PipelineActivityCard 
              investorId={investorId} 
              investorName={investorName}
            />
          )}
          {pipelineSubpageTab === "manage" && (
            <ManageInvestorCard 
              investorId={investorId}
              investorName={investorName}
              roundSlug={roundSlug}
            />
          )}
        </div>
        
        <div className="px-6 pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {PIPELINE_SUBPAGE_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                onClick={() => setPipelineSubpageTab(tab.key)}
                className={cn(
                  "h-8 text-xs gap-1.5 transition-all rounded-md",
                  pipelineSubpageTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90 tab-button-shine border border-border/80"
                    : "bg-[hsl(var(--canvas))] text-foreground border border-border/80 hover:bg-muted/50 tab-button-shine-muted"
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

  // Render Pipeline page tabs
  if (pageKey === "pipeline") {
    return (
      <div className="flex flex-col h-full">
        {/* Card content area */}
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {pipelineTab === "bulletin" && <BulletinCard roundId={roundId} />}
          {pipelineTab === "agenda" && <AgendaCard roundId={roundId} />}
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
                  "h-8 text-xs gap-1.5 transition-all rounded-md",
                  pipelineTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90 tab-button-shine border border-border/80"
                    : "bg-[hsl(var(--canvas))] text-foreground border border-border/80 hover:bg-muted/50 tab-button-shine-muted"
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
                  "h-8 text-xs gap-1.5 transition-all rounded-md",
                  memoTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90 tab-button-shine border border-border/80"
                    : "bg-[hsl(var(--canvas))] text-foreground border border-border/80 hover:bg-muted/50 tab-button-shine-muted"
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

  // Render Docket page tabs
  if (pageKey === "docket") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {docketTab === "summary" && (
            <FinancingSummaryCard roundId={roundId} />
          )}
          {docketTab === "create" && (
            <CreateDocketCard 
              roundId={roundId} 
              roundSlug={roundSlug}
              onSuccess={() => setDocketTab("summary")} 
            />
          )}
        </div>
        
        <div className="px-6 pb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {DOCKET_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                onClick={() => setDocketTab(tab.key)}
                className={cn(
                  "h-8 text-xs gap-1.5 transition-all rounded-md",
                  docketTab === tab.key 
                    ? "bg-foreground text-background hover:bg-foreground/90 tab-button-shine border border-border/80" 
                    : "bg-[hsl(var(--canvas))] text-foreground border border-border/80 hover:bg-muted/50 tab-button-shine-muted"
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
        <div className="rounded-xl border border-border bg-transparent p-6">
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
