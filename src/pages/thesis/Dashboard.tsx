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
  Archive,
  ChevronsUpDown,
  Home,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArchiveRestore,
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
  const { rounds, isLoading: roundsLoading, archiveRound, unarchiveRound, deleteRound } = useRounds();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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


  const handleArchiveRound = async (round: Round) => {
    if (round.state === "archived") {
      await unarchiveRound.mutateAsync(round.id);
    } else {
      await archiveRound.mutateAsync(round.id);
    }
  };

  const handleDeleteRound = (round: Round) => {
    setSelectedRound(round);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRound) return;
    await deleteRound.mutateAsync(selectedRound.id);
    setDeleteConfirmOpen(false);
    setSelectedRound(null);
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

  const activeRounds = rounds?.filter((r) => r.state !== "archived") || [];
  const archivedRounds = rounds?.filter((r) => r.state === "archived") || [];

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
          <Button onClick={() => setCreateRoundOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Round
          </Button>
        </div>

        {/* Empty State */}
        {activeRounds.length === 0 && archivedRounds.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">No rounds yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Create your first fundraising round to get started.
            </p>
            <Button onClick={() => setCreateRoundOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Round
            </Button>
          </div>
        )}

        {/* Active Rounds */}
        {activeRounds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Active Rounds
            </h2>
            <div className="grid gap-4">
              {activeRounds.map((round) => {
                const stats = roundStats?.[round.id];
                return (
                  <div
                    key={round.id}
                    className="border border-border rounded-lg p-6 bg-card hover:border-muted-foreground/30 transition-colors"
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
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                          {round.state}
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
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchiveRound(round)}>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRound(round)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

        {/* Archived Rounds */}
        {archivedRounds.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Archived
            </h2>
            <div className="grid gap-4">
              {archivedRounds.map((round) => (
                <div
                  key={round.id}
                  className="border border-border rounded-lg p-4 bg-muted/30 opacity-70"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{round.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {round.instrument_type?.toUpperCase() || "SAFE"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/thesis/${round.slug}/memo/global`)}
                      >
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleArchiveRound(round)}>
                            <ArchiveRestore className="w-4 h-4 mr-2" />
                            Unarchive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteRound(round)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Round?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedRound?.name}" and all associated memos, dockets, and investor data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
