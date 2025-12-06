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
  Pencil,
  Globe,
  Building2,
  User,
  LayoutList,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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
  customDomain?: string | null;
  // Callbacks
  onRoundChange?: (round: Round) => void;
  onToolChange?: (tool: "pipeline" | "memo" | "docket") => void;
  onCreateRound?: () => void;
  onEditRound?: () => void;
  onCloseRound?: () => void;
  // Right side content
  rightContent?: React.ReactNode;
}

export default function CircuitHeader({
  rounds = [],
  activeRoundSlug,
  activeTool = "stage",
  customDomain,
  onRoundChange,
  onToolChange,
  onCreateRound,
  onEditRound,
  onCloseRound,
  rightContent,
}: CircuitHeaderProps) {
  const navigate = useNavigate();
  const { signOut, companyName, avatarUrl } = useFounderAuth();

  const activeRound = rounds.find(r => r.slug === activeRoundSlug);
  const openRounds = rounds.filter(r => r.state === "open");
  const closedRounds = rounds.filter(r => r.state === "closed");
  const isActiveRoundOpen = activeRound?.state === "open";

  const handleSignOut = async () => {
    await signOut();
    // Use full page refresh for Safari compatibility
    window.location.href = "/auth";
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case "pipeline": return <Users className="w-4 h-4" />;
      case "memo": return <FileText className="w-4 h-4" />;
      case "docket": return <FolderOpen className="w-4 h-4" />;
      default: return null;
    }
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
          <DropdownMenuContent align="start" className="w-64">
            {/* Header with logo and company name */}
            <div className="px-3 py-4 flex flex-col items-center gap-2 border-b mb-1">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-lg font-medium text-muted-foreground">
                  {companyName?.charAt(0)?.toUpperCase() || "C"}
                </div>
              )}
              <span className="font-medium text-sm">{companyName || "My Company"}</span>
            </div>

            {/* Subdomain box - copy only */}
            <div 
              className="mx-2 mb-1 px-2 py-1.5 rounded border bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                const domain = customDomain || "investor.company.com";
                navigator.clipboard.writeText(domain);
              }}
              title="Click to copy"
            >
              <span className="text-xs font-mono text-muted-foreground truncate">
                {customDomain || "investor.company.com"}
              </span>
              <Copy className="w-3 h-3 text-muted-foreground shrink-0 ml-2" />
            </div>

            <DropdownMenuItem onClick={() => navigate("/settings/domain")}>
              <Globe className="w-4 h-4 mr-2" />
              Custom Domain
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Building2 className="w-4 h-4 mr-2" />
              Company Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-muted-foreground/50">/</span>

        {/* Segment 2: Tool Selector (or Stage label) */}
        {activeTool === "stage" ? (
          <span className="text-sm text-muted-foreground pl-1">Stage</span>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 gap-1.5 capitalize">
                {getToolIcon(activeTool)}
                {activeTool}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
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
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Right side: Round Context Selector + rightContent */}
      <div className="flex items-center gap-2">
        {activeTool !== "stage" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 px-3 gap-1.5 text-sm font-medium">
                {activeRound?.name || "Select Round"}
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Open Rounds */}
              {openRounds.length > 0 && (
                <>
                  {openRounds.map((round) => (
                    <DropdownMenuItem
                      key={round.id}
                      onClick={() => onRoundChange?.(round)}
                      className={cn(round.slug === activeRoundSlug && "bg-accent")}
                    >
                      {round.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              
              {/* Closed Rounds */}
              {closedRounds.length > 0 && (
                <>
                  {openRounds.length > 0 && <DropdownMenuSeparator />}
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
              
              {/* Round Actions */}
              <DropdownMenuItem onClick={() => navigate("/settings/rounds")}>
                <LayoutList className="w-4 h-4 mr-2" />
                Rounds Overview
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {rightContent}
      </div>
    </header>
  );
}
