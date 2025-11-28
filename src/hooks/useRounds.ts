import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useToast } from "@/hooks/use-toast";

interface Round {
  id: string;
  slug: string;
  name: string;
  instrument_type: string;
  state: string;
  target_raise: number | null;
  created_at: string;
}

export function useRounds() {
  const { user } = useFounderAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ["rounds", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("rounds")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Round[];
    },
    enabled: !!user?.id,
  });

  const createRound = useMutation({
    mutationFn: async (input: { 
      name: string; 
      slug: string; 
      instrument_type: string;
      target_raise?: number;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create the round
      const { data: round, error: roundError } = await supabase
        .from("rounds")
        .insert({
          name: input.name,
          slug: input.slug,
          instrument_type: input.instrument_type,
          target_raise: input.target_raise || null,
          workspace_id: user.id, // Using user_id as workspace_id for now
          created_by: user.id,
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
      toast({ title: "Round created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create round",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archiveRound = useMutation({
    mutationFn: async (roundId: string) => {
      const { error } = await supabase
        .from("rounds")
        .update({ state: "archived" })
        .eq("id", roundId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rounds"] });
      toast({ title: "Round archived" });
    },
  });

  return {
    rounds,
    isLoading,
    createRound,
    archiveRound,
  };
}
