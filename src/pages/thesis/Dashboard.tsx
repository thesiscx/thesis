import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds, Round } from "@/hooks/useRounds";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CreateRoundDialog from "@/components/thesis/CreateRoundDialog";
const thesisLogo = "/thesis-logo.png";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, signOut, companyName } = useFounderAuth();
  const { rounds, isLoading: roundsLoading, hasOpenRound, closeRound, reopenRound } = useRounds();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [editTargetRaise, setEditTargetRaise] = useState("");
  const [editInstrumentType, setEditInstrumentType] = useState("");

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
    setCloseConfirmOpen(true);
  };

  const confirmCloseRound = async () => {
    if (!selectedRound) return;
    await closeRound.mutateAsync(selectedRound.id);
    setCloseConfirmOpen(false);
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
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b border-border px-6 flex items-center">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const openRounds = rounds?.filter((r) => r.state === "open") || [];
  const closedRounds = rounds?.filter((r) => r.state === "closed") || [];

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Breadcrumb style matching ThesisLayout */}
      <header className="h-14 border-b border-border bg-background sticky top-0 z-50 flex items-center px-6">
        <div className="flex items-center gap-1">
          {/* Thesis Logo/Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-2 gap-1.5">
                <img src={thesisLogo} alt="Thesis" className="h-4" />
                <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/thesis")}>
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </DropdownMenuItem>
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

          <span className="text-sm text-muted-foreground">Dashboard</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
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

        {/* Open Rounds */}
        {openRounds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Unlock className="w-4 h-4" />
              Open Round
            </h2>
            <div className="grid gap-4">
              {openRounds.map((round) => {
                const stats = roundStats?.[round.id];
                return (
                  <div
                    key={round.id}
                    className="border-2 border-primary/30 rounded-lg p-6 bg-card"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-heading text-lg font-semibold">{round.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {round.instrument_type?.toUpperCase() || "SAFE"}
                          {round.target_raise && ` · $${Number(round.target_raise).toLocaleString()} target`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                          Open
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRound(round)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Terms
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleCloseRound(round)}>
                              <Lock className="w-4 h-4 mr-2" />
                              Close Round
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => navigate(`/thesis/${round.slug}/circuit/global`)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                      >
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Circuit</span>
                        <span className="text-xs text-muted-foreground">
                          {stats?.investorCount || 0} investors
                        </span>
                      </button>

                      <button
                        onClick={() => navigate(`/thesis/${round.slug}/memo/global`)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Memo</span>
                        <span className="text-xs text-muted-foreground">
                          {stats?.memoCount || 0} variants
                        </span>
                      </button>

                      <button
                        onClick={() => navigate(`/thesis/${round.slug}/docket/global`)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                      >
                        <FolderOpen className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Docket</span>
                        <span className="text-xs text-muted-foreground">
                          {stats?.docketCount || 0} docs
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Closed Rounds */}
        {closedRounds.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Closed Rounds
            </h2>
            <div className="grid gap-4">
              {closedRounds.map((round) => (
                <div
                  key={round.id}
                  className="border border-border rounded-lg p-4 bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-muted-foreground">{round.name}</h3>
                      <p className="text-sm text-muted-foreground/70">
                        {round.instrument_type?.toUpperCase() || "SAFE"}
                        {round.target_raise && ` · $${Number(round.target_raise).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        Closed
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/thesis/${round.slug}/memo/global`)}
                      >
                        View
                      </Button>
                      {!hasOpenRound && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReopenRound(round)}
                          className="gap-1.5"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateRoundDialog open={createRoundOpen} onOpenChange={setCreateRoundOpen} />

      {/* Edit Dialog - Target Raise & Instrument Type only */}
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
              <Label>Target raise (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={editTargetRaise}
                  onChange={(e) => setEditTargetRaise(e.target.value)}
                  placeholder="1,000,000"
                  className="pl-7"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Round Confirmation */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {selectedRound?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing this round will mark it as complete. You can reopen it later if needed.
              This allows you to open a new fundraising round.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseRound}>
              Close Round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { Dashboard };
