import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import ThesisHeader from "./ThesisHeader";
import AssistantSidebar from "./AssistantSidebar";
import RoundSwitchSplash from "./RoundSwitchSplash";

interface Round {
  id: string;
  slug: string;
  name: string;
  state: string;
  round_type?: string;
  round_number?: number;
}

interface Investor {
  id: string;
  slug: string;
  name: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ThesisLayoutProps {
  children: ReactNode;
  rounds: Round[];
  investors: Investor[];
  onCreateRound: () => void;
  onUpdateMemoContent?: (content: any) => void;
  hasMemoContent?: boolean;
  currentMemoContent?: any;
  breadcrumb?: BreadcrumbItem;
  // Subpage context
  isSubpage?: boolean;
  investorSlug?: string;
  investorId?: string;
  investorName?: string;
  investorStatus?: string;
  accessKeyId?: string;
  docketId?: string;
}

export default function ThesisLayout({
  children,
  rounds,
  investors,
  onCreateRound,
  onUpdateMemoContent,
  hasMemoContent,
  currentMemoContent,
  breadcrumb,
  isSubpage = false,
  investorSlug,
  investorId,
  investorName,
  investorStatus,
  accessKeyId,
  docketId,
}: ThesisLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { roundSlug } = useParams();
  
  const [showSplash, setShowSplash] = useState(false);
  const [splashRoundName, setSplashRoundName] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const previousRoundSlugRef = useRef<string | undefined>(undefined);
  
  // Derive tool from pathname since it's not a route param
  const pathParts = location.pathname.split('/');
  // New URL structure: /:roundSlug/:tool or /:roundSlug/:tool/:variantSlug
  const toolFromPath = pathParts[2]; // /:roundSlug/:tool/:variantSlug
  const activeTool = toolFromPath && ["memo", "docket", "pipeline"].includes(toolFromPath) 
    ? (toolFromPath as "memo" | "docket" | "pipeline")
    : "pipeline";
  
  const activeRound = rounds.find(r => r.slug === roundSlug);

  // Track initial round slug
  useEffect(() => {
    if (previousRoundSlugRef.current === undefined && roundSlug) {
      previousRoundSlugRef.current = roundSlug;
    }
  }, [roundSlug]);

  const handleRoundChange = useCallback((round: Round) => {
    // Only show splash if actually switching to a different round
    if (round.slug !== roundSlug) {
      setSplashRoundName(round.name);
      setPendingNavigation(`/${round.slug}/${activeTool}`);
      setShowSplash(true);
    }
  }, [roundSlug, activeTool]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [navigate, pendingNavigation]);

  const handleToolChange = (newTool: "pipeline" | "memo" | "docket") => {
    navigate(`/${roundSlug}/${newTool}`);
  };

  return (
    <>
      {showSplash && (
        <RoundSwitchSplash 
          roundName={splashRoundName} 
          onComplete={handleSplashComplete} 
        />
      )}
      
      <div className="h-screen bg-[hsl(var(--canvas))] flex overflow-hidden p-3 pr-0">
        {/* Main content area - white rounded box */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background rounded-2xl shadow-sm">
          {/* Header - inside white box */}
          <ThesisHeader
            rounds={rounds}
            activeRoundSlug={roundSlug}
            activeTool={activeTool}
            breadcrumb={breadcrumb}
            onRoundChange={handleRoundChange}
            onToolChange={handleToolChange}
            onCreateRound={onCreateRound}
            onEditRound={() => navigate(`/settings`)}
            onCloseRound={() => {
              navigate(`/settings`);
            }}
          />

          {/* Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* Right Sidebar - all actions go through here */}
        <AssistantSidebar 
          pageKey={activeTool} 
          roundId={activeRound?.id}
          roundSlug={roundSlug}
          onOpenRound={onCreateRound}
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
    </>
  );
}
