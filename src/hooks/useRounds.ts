import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useToast } from "@/hooks/use-toast";

export type RoundType = 'ff' | 'ps' | 's' | 'br' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  ff: 'Family & Friends',
  ps: 'Pre-Seed',
  s: 'Seed',
  br: 'Bridge',
  a: 'Series A',
  b: 'Series B',
  c: 'Series C',
  d: 'Series D',
  e: 'Series E',
  f: 'Series F',
};

export const ROUND_TYPES: RoundType[] = ['ff', 'ps', 's', 'br', 'a', 'b', 'c', 'd', 'e', 'f'];

export interface Round {
  id: string;
  slug: string;
  name: string;
  instrument_type: string;
  state: string;
  target_raise: number | null;
  created_at: string;
  round_type: RoundType;
  round_number: number;
  workspace_id: string;
}

// Helper to get the public URL code for a round
export function getRoundCode(round: Pick<Round, 'round_type' | 'round_number'>): string {
  return round.round_number > 1 
    ? `${round.round_type}${round.round_number}` 
    : round.round_type;
}

export function useRounds() {
  const { user } = useFounderAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userId = user?.id;
  
  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ["rounds", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Round[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // Consider fresh for 2 minutes
  });

  // Check if there's an active (open) round
  const hasOpenRound = rounds.some(r => r.state === "open");
  const openRound = rounds.find(r => r.state === "open");

  const createRound = useMutation({
    mutationFn: async (input: { 
      name: string; 
      slug: string; 
      instrument_type: string;
      target_raise?: number;
      round_type: RoundType;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if there's already an open round
      const openRounds = rounds.filter(r => r.state === "open");
      if (openRounds.length > 0) {
        throw new Error("You must close your current round before opening a new one");
      }

      // Calculate round_number based on existing rounds of same type
      const existingOfType = rounds.filter(r => r.round_type === input.round_type);
      const roundNumber = existingOfType.length + 1;

      // Create the round with "open" state
      const { data: round, error: roundError } = await supabase
        .from("rounds")
        .insert({
          name: input.name,
          slug: input.slug,
          instrument_type: input.instrument_type,
          target_raise: input.target_raise || null,
          workspace_id: user.id,
          created_by: user.id,
          round_type: input.round_type,
          round_number: roundNumber,
          state: "open",
        })
        .select()
        .single();

      if (roundError) throw roundError;

      // Create default round_terms
      const { error: termsError } = await supabase
        .from("round_terms")
        .insert({
          round_id: round.id,
        });

      if (termsError) throw termsError;

      // Create global memo
      const { error: memoError } = await supabase
        .from("memos")
        .insert({
          round_id: round.id,
          is_global: true,
          investor_id: null,
          created_by: user.id,
        });

      if (memoError) throw memoError;

      // Create global docket
      const { error: docketError } = await supabase
        .from("dockets")
        .insert({
          round_id: round.id,
          is_global: true,
          investor_id: null,
          created_by: user.id,
        });

      if (docketError) throw docketError;

      return round;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Round opened successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to open round",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRound = useMutation({
    mutationFn: async ({ roundId, name }: { roundId: string; name: string }) => {
      const { error } = await supabase
        .from("rounds")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", roundId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Round updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update round",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeRound = useMutation({
    mutationFn: async (roundId: string) => {
      const { error } = await supabase
        .from("rounds")
        .update({ state: "closed" })
        .eq("id", roundId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Round closed" });
    },
  });

  const reopenRound = useMutation({
    mutationFn: async (roundId: string) => {
      // Check if there's already an open round
      const openRounds = rounds.filter(r => r.state === "open");
      if (openRounds.length > 0) {
        throw new Error("You must close your current round before reopening another");
      }

      const { error } = await supabase
        .from("rounds")
        .update({ state: "open" })
        .eq("id", roundId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Round reopened" });
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot reopen round",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper to count rounds of a specific type
  const countRoundsOfType = (roundType: RoundType) => {
    return rounds.filter(r => r.round_type === roundType).length;
  };

  return {
    rounds,
    isLoading,
    hasOpenRound,
    openRound,
    createRound,
    updateRound,
    closeRound,
    reopenRound,
    countRoundsOfType,
  };
}
