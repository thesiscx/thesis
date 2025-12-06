import { ReactNode } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import CircuitHeader from "./CircuitHeader";
import AssistantSidebar from "./AssistantSidebar";

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
}

export default function CircuitLayout({
  children,
  rounds,
  investors,
  onCreateRound,
  onUpdateMemoContent,
}: CircuitLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { roundSlug } = useParams();
  
  // Derive tool from pathname since it's not a route param
  const pathParts = location.pathname.split('/');
  const toolFromPath = pathParts[3]; // /circuit/:roundSlug/:tool/:variantSlug
  const activeTool = toolFromPath && ["memo", "docket", "pipeline"].includes(toolFromPath) 
    ? (toolFromPath as "memo" | "docket" | "pipeline")
    : "memo";
  
  const activeRound = rounds.find(r => r.slug === roundSlug);

  const handleRoundChange = (round: Round) => {
    navigate(`/circuit/${round.slug}/${activeTool}/global`);
  };

  const handleToolChange = (newTool: "pipeline" | "memo" | "docket") => {
    navigate(`/circuit/${roundSlug}/${newTool}/global`);
  };

  return (
    <div className="h-screen bg-[hsl(var(--canvas))] flex overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - on cream background */}
        <div className="px-3 pt-3">
          <CircuitHeader
            rounds={rounds}
            activeRoundSlug={roundSlug}
            activeTool={activeTool}
            onRoundChange={handleRoundChange}
            onToolChange={handleToolChange}
            onCreateRound={onCreateRound}
          />
        </div>

        {/* White rounded content box */}
        <div className="flex-1 overflow-hidden p-3 pt-2">
          <main className="h-full bg-background rounded-2xl overflow-auto shadow-sm">
            {children}
          </main>
        </div>
      </div>

      {/* Right Sidebar - all actions go through here */}
      <AssistantSidebar 
        pageKey={activeTool} 
        roundId={activeRound?.id}
        roundSlug={roundSlug}
        onOpenRound={onCreateRound}
        onUpdateMemoContent={onUpdateMemoContent}
      />
    </div>
  );
}
