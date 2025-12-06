import { useNavigate } from "react-router-dom";
import { 
  ChevronsUpDown,
  Plus, 
  Archive, 
  Settings,
  LogOut,
  Home,
  Users,
  FileText,
  FolderOpen,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { cn } from "@/lib/utils";

interface Round {
  id: string;
  slug: string;
  name: string;
  state: string;
  round_type?: string;
  round_number?: number;
}

interface CircuitHeaderProps {
  // Navigation context
  rounds?: Round[];
  activeRoundSlug?: string;
  activeTool?: "pipeline" | "memo" | "docket" | "stage";
  // Callbacks
  onRoundChange?: (round: Round) => void;
  onToolChange?: (tool: "pipeline" | "memo" | "docket") => void;
  onCreateRound?: () => void;
  // Right side content
  rightContent?: React.ReactNode;
}

export default function CircuitHeader({
  rounds = [],
  activeRoundSlug,
  activeTool = "stage",
  onRoundChange,
  onToolChange,
  onCreateRound,
  rightContent,
}: CircuitHeaderProps) {
  const navigate = useNavigate();
  const { signOut, companyName, avatarUrl } = useFounderAuth();

  const activeRound = rounds.find(r => r.slug === activeRoundSlug);
  const openRounds = rounds.filter(r => r.state === "open");
  const closedRounds = rounds.filter(r => r.state === "closed");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="h-14 bg-background sticky top-0 z-50 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-1">
        {/* Segment 1: Company Logo + Name */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 gap-1.5 max-w-[180px]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-5 w-5 rounded-sm object-cover" />
              ) : (
                <div className="h-5 w-5 rounded-sm bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                  {companyName?.charAt(0)?.toUpperCase() || "C"}
                </div>
              )}
              <span className="truncate font-medium">{companyName || "My Company"}</span>
              <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/circuit")}>
              <Home className="w-4 h-4 mr-2" />
              Stage
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

        {/* Segment 2: Round Selector or Stage label */}
        {activeTool === "stage" ? (
          <span className="text-sm text-muted-foreground pl-1">Stage</span>
        ) : (
          <>
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
                    onClick={() => onRoundChange?.(round)}
                    className={cn(round.slug === activeRoundSlug && "bg-accent")}
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
                        onClick={() => onRoundChange?.(round)}
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
                  onClick={() => onToolChange?.("pipeline")}
                  className={cn(activeTool === "pipeline" && "bg-accent")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Pipeline
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToolChange?.("memo")}
                  className={cn(activeTool === "memo" && "bg-accent")}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Memo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToolChange?.("docket")}
                  className={cn(activeTool === "docket" && "bg-accent")}
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Docket
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-muted-foreground">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Registry
                  <span className="ml-auto text-[10px]">Soon</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Right side content */}
      {rightContent}
    </header>
  );
}
