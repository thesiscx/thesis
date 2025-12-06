import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds, Round } from "@/hooks/useRounds";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import CloseRoundDialog from "@/components/circuit/CloseRoundDialog";
import AssistantSidebar from "@/components/circuit/AssistantSidebar";
import {
  Plus,
  Users,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  Lock,
  Unlock,
  ChevronsUpDown,
  Home,
  MoreHorizontal,
  Pencil,
  ChevronRight,
  ChevronDown,
  BookOpen,
} from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, signOut, companyName } = useFounderAuth();
  const { rounds, isLoading: roundsLoading, hasOpenRound, reopenRound } = useRounds();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [editTargetRaise, setEditTargetRaise] = useState("");
  const [editInstrumentType, setEditInstrumentType] = useState("");
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  // Fetch profile for full name
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch memo and docket counts per round
  const { data: roundStats } = useQuery({
    queryKey: ["round-stats", rounds?.map((r) => r.id)],
    queryFn: async () => {
      if (!rounds || rounds.length === 0) return {};

      const stats: Record<string, { memoCount: number; docketCount: number; investorCount: number }> = {};

      for (const round of rounds) {
        const [memoRes, docketRes, investorRes] = await Promise.all([
          supabase.from("memos").select("*", { count: "exact", head: true }).eq("round_id", round.id),
          supabase.from("dockets").select("*", { count: "exact", head: true }).eq("round_id", round.id),
          supabase.from("investors").select("*", { count: "exact", head: true }).eq("workspace_id", round.workspace_id),
        ]);

        stats[round.id] = {
          memoCount: memoRes.count || 0,
          docketCount: docketRes.count || 0,
          investorCount: investorRes.count || 0,
        };
      }

      return stats;
    },
    enabled: !!rounds && rounds.length > 0,
  });

  // Auto-expand open rounds
  useState(() => {
    if (rounds) {
      const openRoundIds = rounds.filter(r => r.state === "open").map(r => r.id);
      setExpandedRounds(new Set(openRoundIds));
    }
  });

  const toggleRoundExpanded = (roundId: string) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleEditRound = (round: Round) => {
    setSelectedRound(round);
    setEditTargetRaise(round.target_raise?.toString() || "");
    setEditInstrumentType(round.instrument_type || "safe");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRound) return;
    
    const { error } = await supabase
      .from("rounds")
      .update({
        target_raise: editTargetRaise ? Number(editTargetRaise) : null,
        instrument_type: editInstrumentType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedRound.id);

    if (error) {
      toast({ title: "Failed to update round", description: error.message, variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["rounds"] });
    toast({ title: "Round updated" });
    setEditDialogOpen(false);
    setSelectedRound(null);
  };


  const handleCloseRound = (round: Round) => {
    setSelectedRound(round);
    setCloseDialogOpen(true);
  };

  const confirmCloseRound = async (reason: string, notes: string) => {
    if (!selectedRound) return;
    
    const { error } = await supabase
      .from("rounds")
      .update({
        state: "closed",
        closure_reason: reason,
        closure_notes: notes || null,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedRound.id);

    if (error) {
      toast({ title: "Failed to close round", description: error.message, variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["rounds"] });
    toast({ title: "Round closed" });
    setCloseDialogOpen(false);
    setSelectedRound(null);
  };

  const handleReopenRound = async (round: Round) => {
    if (hasOpenRound) {
      toast({
        title: "Cannot reopen round",
        description: "You must close your current round before reopening another.",
        variant: "destructive",
      });
      return;
    }
    await reopenRound.mutateAsync(round.id);
  };

  const handleOpenNewRound = () => {
    if (hasOpenRound) {
      toast({
        title: "Cannot open new round",
        description: "You must close your current round before opening a new one.",
        variant: "destructive",
      });
      return;
    }
    setCreateRoundOpen(true);
  };

  if (authLoading || roundsLoading) {
    return (
      <div className="h-screen bg-background flex">
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-border px-6 flex items-center">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-8 w-64 mb-8" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
          </div>
        </div>
        <div className="w-96 border-l border-border" />
      </div>
    );
  }

  const openRounds = rounds?.filter((r) => r.state === "open") || [];
  const closedRounds = rounds?.filter((r) => r.state === "closed") || [];

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const tools = [
    { key: "memo", label: "Memo", icon: FileText, countKey: "memoCount" as const, countLabel: "variants" },
    { key: "docket", label: "Docket", icon: FolderOpen, countKey: "docketCount" as const, countLabel: "docs" },
    { key: "pipeline", label: "Pipeline", icon: Users, countKey: "investorCount" as const, countLabel: "investors" },
    { key: "registry", label: "Registry", icon: BookOpen, disabled: true },
  ];

  const RoundTree = ({ round, isOpen }: { round: Round; isOpen: boolean }) => {
    const stats = roundStats?.[round.id];
    const isExpanded = expandedRounds.has(round.id);

    return (
      <div className="select-none">
        {/* Round row */}
        <div
          className={cn(
            "group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer",
            "hover:bg-muted/50 transition-colors",
            isOpen && "bg-primary/5"
          )}
        >
          <button
            onClick={() => toggleRoundExpanded(round.id)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className={cn("font-medium truncate", !isOpen && "text-muted-foreground")}>
              {round.name}
            </span>
            {isOpen && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">
                Open
              </span>
            )}
            <span className="text-xs text-muted-foreground shrink-0">
              {round.instrument_type?.toUpperCase()}
              {round.target_raise && ` · $${Number(round.target_raise).toLocaleString()}`}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOpen ? (
                <>
                  <DropdownMenuItem onClick={() => handleEditRound(round)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Terms
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleCloseRound(round)}>
                    <Lock className="w-4 h-4 mr-2" />
                    Close Round
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate(`/circuit/${round.slug}/memo/global`)}>
                    View
                  </DropdownMenuItem>
                  {!hasOpenRound && (
                    <DropdownMenuItem onClick={() => handleReopenRound(round)}>
                      <Unlock className="w-4 h-4 mr-2" />
                      Reopen Round
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tool children */}
        {isExpanded && (
          <div className="ml-5 border-l border-border">
            {tools.map((tool) => (
              <button
                key={tool.key}
                onClick={() => !tool.disabled && navigate(`/circuit/${round.slug}/${tool.key}/global`)}
                disabled={tool.disabled}
                className={cn(
                  "w-full flex items-center gap-2 py-1.5 px-3 text-left",
                  "hover:bg-muted/50 transition-colors rounded-r-md",
                  tool.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <tool.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{tool.label}</span>
                {tool.disabled ? (
                  <span className="text-[10px] text-muted-foreground ml-auto">Coming soon</span>
                ) : tool.countKey && stats?.[tool.countKey] !== undefined ? (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {stats[tool.countKey]} {tool.countLabel}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center px-6 shrink-0">
          <div className="flex items-center gap-1">
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
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-heading text-2xl font-bold">Hello, {firstName}</h1>
                {companyName && (
                  <p className="text-muted-foreground mt-1">{companyName}</p>
                )}
              </div>
              <Button 
                onClick={handleOpenNewRound} 
                className="gap-2"
                disabled={hasOpenRound}
              >
                <Plus className="w-4 h-4" />
                Open New Round
              </Button>
            </div>

            {/* Empty State */}
            {openRounds.length === 0 && closedRounds.length === 0 && (
              <div className="border border-dashed border-border rounded-lg p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">No rounds yet</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Open your first fundraising round to get started.
                </p>
                <Button onClick={handleOpenNewRound} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Open New Round
                </Button>
              </div>
            )}

            {/* Tree View */}
            {(openRounds.length > 0 || closedRounds.length > 0) && (
              <div className="space-y-6">
                {/* Open Rounds */}
                {openRounds.length > 0 && (
                  <div>
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Unlock className="w-3.5 h-3.5" />
                      Open Round
                    </h2>
                    <div className="space-y-1">
                      {openRounds.map((round) => (
                        <RoundTree key={round.id} round={round} isOpen />
                      ))}
                    </div>
                  </div>
                )}

                {/* Closed Rounds */}
                {closedRounds.length > 0 && (
                  <div>
                    <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      Closed Rounds
                    </h2>
                    <div className="space-y-1">
                      {closedRounds.map((round) => (
                        <RoundTree key={round.id} round={round} isOpen={false} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <CreateRoundDialog open={createRoundOpen} onOpenChange={setCreateRoundOpen} />

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {selectedRound?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Instrument type</Label>
                <Select value={editInstrumentType} onValueChange={setEditInstrumentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe">SAFE</SelectItem>
                    <SelectItem value="note">Convertible Note</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target raise ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1000000"
                  value={editTargetRaise}
                  onChange={(e) => setEditTargetRaise(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CloseRoundDialog
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          roundName={selectedRound?.name || ""}
          onConfirm={confirmCloseRound}
        />
      </div>

      {/* Right Sidebar */}
      <AssistantSidebar />
    </div>
  );
}
