import { ReactNode, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ChevronsUpDown, 
  Plus, 
  Archive, 
  Search,
  Settings,
  LogOut
} from "lucide-react";
import thesisLogo from "@/assets/thesis-logo.png";
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

interface Round {
  id: string;
  slug: string;
  name: string;
  state: string;
}

interface Investor {
  id: string;
  slug: string;
  name: string;
}

interface ThesisLayoutProps {
  children: ReactNode;
  rounds: Round[];
  investors: Investor[];
  recentInvestors?: Investor[];
  onCreateRound: () => void;
}

export default function ThesisLayout({
  children,
  rounds,
  investors,
  recentInvestors = [],
  onCreateRound,
}: ThesisLayoutProps) {
  const navigate = useNavigate();
  const { roundSlug, tool, variantSlug } = useParams();
  const { signOut, user } = useFounderAuth();
  
  const [investorSearchOpen, setInvestorSearchOpen] = useState(false);
  const [investorSearch, setInvestorSearch] = useState("");
  
  const activeRound = rounds.find(r => r.slug === roundSlug);
  const activeTool = tool || "memo";
  const activeVariant = variantSlug || "global";
  
  const activeInvestor = investors.find(i => i.slug === activeVariant);
  const isGlobal = activeVariant === "global";

  const handleRoundChange = (round: Round) => {
    navigate(`/thesis/${round.slug}/${activeTool}/global`);
  };

  const handleToolChange = (newTool: "memo" | "docket") => {
    navigate(`/thesis/${roundSlug}/${newTool}/${activeVariant}`);
  };

  const handleVariantChange = (investorSlug: string) => {
    navigate(`/thesis/${roundSlug}/${activeTool}/${investorSlug}`);
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

  const archivedRounds = rounds.filter(r => r.state === "archived");
  const activeRounds = rounds.filter(r => r.state !== "archived");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - 4 Segment Navigation */}
      <header className="h-14 border-b border-border bg-background sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-1">
          {/* Segment 1: Thesis Logo/Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 gap-1.5">
                <img src={thesisLogo} alt="Thesis" className="h-4" />
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/thesis/settings")}>
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
              {activeRounds.map((round) => (
                <DropdownMenuItem
                  key={round.id}
                  onClick={() => handleRoundChange(round)}
                  className={cn(round.slug === roundSlug && "bg-accent")}
                >
                  {round.name}
                </DropdownMenuItem>
              ))}
              
              {archivedRounds.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    <Archive className="w-3 h-3 mr-2" />
                    Archived
                  </DropdownMenuItem>
                  {archivedRounds.map((round) => (
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
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-muted-foreground/50">/</span>

          {/* Segment 4: Variant Selector */}
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
        </div>

        {/* Right side - Share + Publish */}
        <div className="flex items-center gap-2">
          <ShareButton roundSlug={roundSlug} variantSlug={activeVariant} />
          <PublishButton roundSlug={roundSlug} isPublished={false} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

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
