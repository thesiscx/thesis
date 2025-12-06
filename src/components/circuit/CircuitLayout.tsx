import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import CircuitHeader from "./CircuitHeader";
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

interface CircuitLayoutProps {
  children: ReactNode;
  rounds: Round[];
  investors: Investor[];
  onCreateRound: () => void;
  onUpdateMemoContent?: (content: any) => void;
  hasMemoContent?: boolean;
  currentMemoContent?: any;
}

export default function CircuitLayout({
  children,
  rounds,
  investors,
  onCreateRound,
  onUpdateMemoContent,
  hasMemoContent,
  currentMemoContent,
}: CircuitLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { roundSlug } = useParams();
  
  const [showSplash, setShowSplash] = useState(false);
  const [splashRoundName, setSplashRoundName] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const previousRoundSlugRef = useRef<string | undefined>(undefined);
  
  // Derive tool from pathname since it's not a route param
  const pathParts = location.pathname.split('/');
  const toolFromPath = pathParts[3]; // /circuit/:roundSlug/:tool/:variantSlug
  const activeTool = toolFromPath && ["memo", "docket", "pipeline"].includes(toolFromPath) 
    ? (toolFromPath as "memo" | "docket" | "pipeline")
    : "memo";
  
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
      setPendingNavigation(`/circuit/${round.slug}/${activeTool}/global`);
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
    navigate(`/circuit/${roundSlug}/${newTool}/global`);
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
          <CircuitHeader
            rounds={rounds}
            activeRoundSlug={roundSlug}
            activeTool={activeTool}
            onRoundChange={handleRoundChange}
            onToolChange={handleToolChange}
            onCreateRound={onCreateRound}
            onEditRound={() => navigate(`/circuit/settings`)}
            onCloseRound={() => {
              navigate(`/circuit/settings`);
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
        />
      </div>
    </>
  );
}
