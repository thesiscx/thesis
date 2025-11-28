import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Json } from "@/integrations/supabase/types";

interface TocItem {
  id: string;
  label: string;
  level: number;
}

export function useMemo(roundSlug?: string, variantSlug?: string) {
  const { user } = useFounderAuth();
  const queryClient = useQueryClient();
  const [localContent, setLocalContent] = useState<Json | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  
  const debouncedContent = useDebounce(localContent, 1000);

  const isGlobal = variantSlug === "global";

  // Fetch memo
  const { data: memo, isLoading } = useQuery({
    queryKey: ["memo", roundSlug, variantSlug, user?.id],
    queryFn: async () => {
      if (!user?.id || !roundSlug) return null;

      // First get the round
      const { data: round, error: roundError } = await supabase
        .from("rounds")
        .select("id")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .single();

      if (roundError) throw roundError;

      // Then get the memo
      let query = supabase
        .from("memos")
        .select("*")
        .eq("round_id", round.id);

      if (isGlobal) {
        query = query.eq("is_global", true);
      } else {
        // Get investor-specific memo
        const { data: investor } = await supabase
          .from("investors")
          .select("id")
          .eq("slug", variantSlug)
          .eq("workspace_id", user.id)
          .single();

        if (investor) {
          query = query.eq("investor_id", investor.id);
        }
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      
      return data;
    },
    enabled: !!user?.id && !!roundSlug,
  });

  // Set local content when memo loads
  useEffect(() => {
    if (memo?.content) {
      setLocalContent(memo.content);
    }
  }, [memo?.content]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (content: Json) => {
      if (!memo?.id) return;

      const { error } = await supabase
        .from("memos")
        .update({ content })
        .eq("id", memo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["memo", roundSlug, variantSlug] });
    },
  });

  // Auto-save when debounced content changes
  useEffect(() => {
    if (debouncedContent && memo?.id && debouncedContent !== memo.content) {
      saveMutation.mutate(debouncedContent);
    }
  }, [debouncedContent, memo?.id]);

  const updateMemo = useCallback((content: Json, items: TocItem[]) => {
    setLocalContent(content);
    setTocItems(items);
  }, []);

  return {
    memo,
    tocItems,
    updateMemo,
    isSaving: saveMutation.isPending,
    lastSaved,
    isLoading,
  };
}
