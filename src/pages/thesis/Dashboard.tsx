import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import CreateRoundDialog from "@/components/thesis/CreateRoundDialog";
import thesisLogo from "@/assets/thesis-logo.png";
import {
  Plus,
  Users,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  Archive,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signOut, companyName } = useFounderAuth();
  const { rounds, isLoading: roundsLoading } = useRounds();
  const { investors } = useInvestors();
  const [createRoundOpen, setCreateRoundOpen] = useState(false);

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
        // Get memo count
        const { count: memoCount } = await supabase
          .from("memos")
          .select("*", { count: "exact", head: true })
          .eq("round_id", round.id);

        // Get docket count
        const { count: docketCount } = await supabase
          .from("dockets")
          .select("*", { count: "exact", head: true })
          .eq("round_id", round.id);

        // Get investor count for this workspace
        const { count: investorCount } = await supabase
          .from("investors")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", round.workspace_id);

        stats[round.id] = {
          memoCount: memoCount || 0,
          docketCount: docketCount || 0,
          investorCount: investorCount || 0,
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
      {/* Header */}
      <header className="h-14 border-b border-border bg-background sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <img src={thesisLogo} alt="Thesis" className="h-5" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm">{firstName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/thesis/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
                        {round.state}
                      </span>
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/thesis/${round.slug}/memo/global`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateRoundDialog open={createRoundOpen} onOpenChange={setCreateRoundOpen} />
    </div>
  );
}
