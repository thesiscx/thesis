import { ReactNode, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ChevronsUpDown,
  Plus, 
  Archive, 
  Search,
  Settings,
  LogOut,
  Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { cn } from "@/lib/utils";
import ShareButton from "./ShareButton";
import PublishButton from "./PublishButton";
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
  recentInvestors?: Investor[];
  onCreateRound: () => void;
}

export default function CircuitLayout({
  children,
  rounds,
  investors,
  recentInvestors = [],
  onCreateRound,
}: CircuitLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { roundSlug, variantSlug } = useParams();
  const { signOut, companyName, profileLoaded } = useFounderAuth();
  
  const [investorSearchOpen, setInvestorSearchOpen] = useState(false);
  const [investorSearch, setInvestorSearch] = useState("");
  
  // Derive tool from pathname since it's not a route param
  const pathParts = location.pathname.split('/');
  const toolFromPath = pathParts[3]; // /circuit/:roundSlug/:tool/:variantSlug
  const activeTool = toolFromPath && ["memo", "docket", "pipeline"].includes(toolFromPath) 
    ? toolFromPath 
    : "memo";
  
  const activeRound = rounds.find(r => r.slug === roundSlug);
  const activeVariant = variantSlug || "global";
  
  const activeInvestor = investors.find(i => i.slug === activeVariant);
  const isGlobal = activeVariant === "global";

  const handleRoundChange = (round: Round) => {
    navigate(`/circuit/${round.slug}/${activeTool}/global`);
  };

  const handleToolChange = (newTool: "pipeline" | "memo" | "docket") => {
    navigate(`/circuit/${roundSlug}/${newTool}/${activeVariant}`);
  };

  const handleVariantChange = (investorSlug: string) => {
    navigate(`/circuit/${roundSlug}/${activeTool}/${investorSlug}`);
    setInvestorSearchOpen(false);
    setInvestorSearch("");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const filteredInvestors = investors.filter(i => 
    i.name.toLowerCase().includes(investorSearch.toLowerCase())
  );

  const closedRounds = rounds.filter(r => r.state === "closed");
  const openRounds = rounds.filter(r => r.state === "open");

  return (
    <div className="h-screen bg-background flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - 4 Segment Navigation */}
          <header className="h-14 border-b border-border bg-background sticky top-0 z-50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-1">
          {/* Segment 1: Company Name/Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 gap-1.5 max-w-[180px]">
                <span className="truncate font-medium">{companyName || "My Company"}</span>
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/circuit")}>
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/circuit/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Workspace Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-muted-foreground/50">/</span>

          {/* Segment 2: Round Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 gap-1.5">
                {activeRound?.name || "Select Round"}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {openRounds.map((round) => (
                <DropdownMenuItem
                  key={round.id}
                  onClick={() => handleRoundChange(round)}
                  className={cn(round.slug === roundSlug && "bg-accent")}
                >
                  {round.name}
                </DropdownMenuItem>
              ))}
              
              {closedRounds.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    <Archive className="w-3 h-3 mr-2" />
                    Closed
                  </DropdownMenuItem>
                  {closedRounds.map((round) => (
                    <DropdownMenuItem
                      key={round.id}
                      onClick={() => handleRoundChange(round)}
                      className="text-muted-foreground"
                    >
                      {round.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCreateRound}>
                <Plus className="w-4 h-4 mr-2" />
                Create new raise
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-muted-foreground/50">/</span>

          {/* Segment 3: Tool Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 gap-1.5 capitalize">
                {activeTool}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              <DropdownMenuItem
                onClick={() => handleToolChange("memo")}
                className={cn(activeTool === "memo" && "bg-accent")}
              >
                Memo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleToolChange("docket")}
                className={cn(activeTool === "docket" && "bg-accent")}
              >
                Docket
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleToolChange("pipeline")}
                className={cn(activeTool === "pipeline" && "bg-accent")}
              >
                Pipeline
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-muted-foreground">
                Registry
                <span className="ml-auto text-[10px]">Soon</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Segment 4: Variant Selector (only show for memo/docket) */}
          {(activeTool === "memo" || activeTool === "docket") && (
            <>
              <span className="text-muted-foreground/50">/</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 px-2 gap-1.5">
                    {isGlobal ? "Global" : activeInvestor?.name || activeVariant}
                    <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-0">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search investors..."
                        value={investorSearch}
                        onChange={(e) => setInvestorSearch(e.target.value)}
                        className="pl-8 h-8"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto p-1">
                    <DropdownMenuItem
                      onClick={() => handleVariantChange("global")}
                      className={cn(isGlobal && "bg-accent")}
                    >
                      Global
                    </DropdownMenuItem>
                    
                    {recentInvestors.length > 0 && investorSearch === "" && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1 text-xs text-muted-foreground">Recent</div>
                        {recentInvestors.slice(0, 5).map((investor) => (
                          <DropdownMenuItem
                            key={investor.id}
                            onClick={() => handleVariantChange(investor.slug)}
                            className={cn(investor.slug === activeVariant && "bg-accent")}
                          >
                            {investor.name}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}

                    {investorSearch && (
                      <>
                        {filteredInvestors.map((investor) => (
                          <DropdownMenuItem
                            key={investor.id}
                            onClick={() => handleVariantChange(investor.slug)}
                            className={cn(investor.slug === activeVariant && "bg-accent")}
                          >
                            {investor.name}
                          </DropdownMenuItem>
                        ))}
                        {filteredInvestors.length === 0 && (
                          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            No investors found
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="p-1 border-t border-border">
                    <DropdownMenuItem onClick={() => setInvestorSearchOpen(true)}>
                      View all investors...
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Right side - Share + Publish (only for memo/docket) */}
        {(activeTool === "memo" || activeTool === "docket") && (
          <div className="flex items-center gap-2">
            <ShareButton 
              roundId={activeRound?.id}
              roundSlug={roundSlug}
              roundType={activeRound?.round_type}
              roundNumber={activeRound?.round_number}
              investorId={activeInvestor?.id}
              investorSlug={activeInvestor?.slug}
              investorName={activeInvestor?.name}
              tool={activeTool as 'memo' | 'docket'}
            />
            <PublishButton 
              roundId={activeRound?.id}
              roundSlug={roundSlug}
              roundType={activeRound?.round_type}
              roundNumber={activeRound?.round_number}
              variantSlug={activeVariant}
              investorId={activeInvestor?.id}
              tool={activeTool as 'memo' | 'docket'}
              isPublished={false} 
            />
          </div>
        )}
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>

        {/* Right Sidebar */}
        <AssistantSidebar />

      {/* All Investors Modal */}
      <Dialog open={investorSearchOpen} onOpenChange={setInvestorSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>All Investors</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search investors..."
                value={investorSearch}
                onChange={(e) => setInvestorSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {filteredInvestors.map((investor) => (
                <Button
                  key={investor.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleVariantChange(investor.slug)}
                >
                  {investor.name}
                </Button>
              ))}
              {filteredInvestors.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No investors found
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
