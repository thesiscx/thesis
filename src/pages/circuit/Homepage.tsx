import { useNavigate } from "react-router-dom";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds } from "@/hooks/useRounds";
import CircuitHeader from "@/components/circuit/CircuitHeader";
import { ActivityFeed } from "@/components/circuit/ActivityFeed";
import { Users, FileText, FolderOpen, ArrowRight } from "lucide-react";
import circuitLogo from "@/assets/circuit-logo.png";

const tools = [
  {
    id: "pipeline",
    label: "Pipeline",
    description: "Track and manage your investor relationships",
    icon: Users,
  },
  {
    id: "memo",
    label: "Memo",
    description: "Create and publish your investment memo",
    icon: FileText,
  },
  {
    id: "docket",
    label: "Docket",
    description: "Execute agreements and close investments",
    icon: FolderOpen,
  },
];

export default function Homepage() {
  const navigate = useNavigate();
  const { profile } = useFounderAuth();
  const { openRound, rounds } = useRounds();

  // Get the first name from full_name
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Determine which round to navigate to
  const activeRound = openRound || rounds?.[0];

  const handleToolClick = (toolId: string) => {
    if (activeRound) {
      navigate(`/${activeRound.slug}/${toolId}`);
    }
  };

  return (
    <div className="h-screen bg-[hsl(var(--canvas))] flex overflow-hidden p-3 pr-0">
      {/* Main content area - white rounded box */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background rounded-2xl shadow-sm">
        {/* Header - inside white box */}
        <CircuitHeader
          activeTool="home"
          hideRoundPicker
        />

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-8">
            {/* Welcome message */}
            <div className="mb-10">
              <h1 className="font-heading text-2xl font-bold">
                Welcome back, {firstName}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Your fundraising workspace is ready.
              </p>
            </div>

            {/* Navigation Cards */}
            <div className="space-y-3 max-w-xl">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isDisabled = !activeRound;

                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                    disabled={isDisabled}
                    className={`
                      w-full group flex items-center gap-4 p-5 rounded-lg border border-border/50
                      text-left transition-all duration-200
                      ${isDisabled 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:border-border hover:bg-muted/30 hover:shadow-sm"
                      }
                    `}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{tool.label}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {tool.description}
                      </div>
                    </div>
                    <ArrowRight 
                      className={`
                        w-4 h-4 text-muted-foreground transition-transform duration-200
                        ${isDisabled ? "" : "group-hover:translate-x-1"}
                      `} 
                    />
                  </button>
                );
              })}
            </div>

            {!activeRound && (
              <p className="mt-6 text-sm text-muted-foreground">
                Create a round to get started with your fundraising tools.
              </p>
            )}
          </div>
        </main>
      </div>

      {/* Right Sidebar - Activity Feed (matches AssistantSidebar styling) */}
      <aside className="w-96 h-screen bg-[hsl(var(--canvas))] flex flex-col shrink-0">
        {/* Header with Circuit logo - vertically aligned with main header */}
        <div className="h-14 flex items-center px-6 shrink-0">
          <img src={circuitLogo} alt="Circuit" className="h-5" />
        </div>

        {/* Activity Feed Content */}
        <div className="flex-1 overflow-hidden">
          <ActivityFeed />
        </div>
      </aside>
    </div>
  );
}
