import { useMemo } from "react";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRounds } from "@/hooks/useRounds";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusLine } from "./StatusLine";

interface FinancingSummaryCardProps {
  roundId?: string;
}

export function FinancingSummaryCard({ roundId }: FinancingSummaryCardProps) {
  const { openRound, rounds } = useRounds();
  const activeRound = roundId 
    ? rounds.find(r => r.id === roundId) 
    : openRound;

  // Fetch funded dockets for this round
  const { data: dockets, isLoading } = useQuery({
    queryKey: ["dockets-summary", activeRound?.id],
    queryFn: async () => {
      if (!activeRound?.id) return [];
      
      const { data, error } = await supabase
        .from("dockets")
        .select("id, amount, status, investor_name, wire_received")
        .eq("round_id", activeRound.id)
        .eq("is_global", false);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeRound?.id,
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!dockets) return null;

    const fundedDockets = dockets.filter(d => d.status === "funded" || d.wire_received);
    const totalRaised = fundedDockets.reduce((sum, d) => sum + (d.amount || 0), 0);
    const investorCount = fundedDockets.length;
    const avgInvestment = investorCount > 0 ? totalRaised / investorCount : 0;
    const targetRaise = activeRound?.target_raise || 0;
    const allocationPercent = targetRaise > 0 ? (totalRaised / targetRaise) * 100 : 0;

    return {
      totalRaised,
      investorCount,
      avgInvestment,
      targetRaise,
      allocationPercent: Math.min(allocationPercent, 100),
      totalDockets: dockets.length,
    };
  }, [dockets, activeRound?.target_raise]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    } else if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  if (!activeRound) {
    return (
      <>
        <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Financing Summary</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              No active round
            </p>
          </div>
        </div>
        <StatusLine status="idle" idleText="No active round" />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Financing Summary</span>
          </div>
          <div className="p-4 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <StatusLine status="loading" idleText="Loading..." loadingText="Loading summary..." />
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Financing Summary</span>
        </div>
        
        <div className="p-4 space-y-5">
          {/* Total Raised - Hero Stat */}
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Total Raised
            </p>
            <p className="text-3xl font-semibold text-foreground">
              {formatCurrency(stats?.totalRaised || 0)}
            </p>
          </div>

          {/* Allocation Progress */}
          {stats?.targetRaise && stats.targetRaise > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Subscribed
                </span>
                <span className="font-medium">
                  {stats.allocationPercent.toFixed(0)}% of {formatCurrency(stats.targetRaise)}
                </span>
              </div>
              <Progress 
                value={stats.allocationPercent} 
                className="h-2"
              />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background/50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs">Investors</span>
              </div>
              <p className="text-lg font-semibold">{stats?.investorCount || 0}</p>
            </div>
            
            <div className="rounded-lg bg-background/50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-xs">Avg. Check</span>
              </div>
              <p className="text-lg font-semibold">
                {formatCurrency(stats?.avgInvestment || 0)}
              </p>
            </div>
          </div>

          {/* Docket Stats */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Dockets</span>
              <span className="font-medium">{stats?.totalDockets || 0}</span>
            </div>
          </div>
        </div>
      </div>
      
      <StatusLine 
        status="idle" 
        idleText={`${activeRound.name} · ${stats?.investorCount || 0} funded`} 
      />
    </>
  );
}
