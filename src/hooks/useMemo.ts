import { useState, useCallback, useEffect, useRef } from "react";
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

interface MemoVersion {
  id: string;
  version: number;
  created_at: string;
}

export function useMemo(roundSlug?: string, variantSlug?: string) {
  const { user } = useFounderAuth();
  const queryClient = useQueryClient();
  const [localContent, setLocalContent] = useState<Json | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const lastVersionTime = useRef<Date>(new Date());
  
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

  // Fetch versions
  const { data: versions = [] } = useQuery({
    queryKey: ["memo-versions", memo?.id],
    queryFn: async () => {
      if (!memo?.id) return [];

      const { data, error } = await supabase
        .from("memo_versions")
        .select("id, version, created_at")
        .eq("memo_id", memo.id)
        .order("version", { ascending: false });

      if (error) throw error;
      return data as MemoVersion[];
    },
    enabled: !!memo?.id,
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
    },
  });

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: async () => {
      if (!memo?.id || !localContent || !user?.id) return;

      const newVersion = (memo.version || 1) + 1;

      // Save current content as a version
      const { error: versionError } = await supabase
        .from("memo_versions")
        .insert({
          memo_id: memo.id,
          content: localContent,
          version: memo.version || 1,
          created_by: user.id,
        });

      if (versionError) throw versionError;

      // Update memo version number
      const { error: memoError } = await supabase
        .from("memos")
        .update({ version: newVersion })
        .eq("id", memo.id);

      if (memoError) throw memoError;
    },
    onSuccess: () => {
      lastVersionTime.current = new Date();
      queryClient.invalidateQueries({ queryKey: ["memo", roundSlug, variantSlug] });
      queryClient.invalidateQueries({ queryKey: ["memo-versions", memo?.id] });
    },
  });

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      if (!memo?.id) return;

      // Get the version content
      const { data: version, error: fetchError } = await supabase
        .from("memo_versions")
        .select("content")
        .eq("id", versionId)
        .single();

      if (fetchError) throw fetchError;

      // Update memo with version content
      const { error: updateError } = await supabase
        .from("memos")
        .update({ content: version.content })
        .eq("id", memo.id);

      if (updateError) throw updateError;

      return version.content;
    },
    onSuccess: (content) => {
      if (content) {
        setLocalContent(content as Json);
      }
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

  // Auto-create version every 5 minutes if content has changed
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastVersion = new Date().getTime() - lastVersionTime.current.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeSinceLastVersion >= fiveMinutes && localContent && memo?.id) {
        createVersionMutation.mutate();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [localContent, memo?.id]);

  const updateMemo = useCallback((content: Json, items: TocItem[]) => {
    setLocalContent(content);
    setTocItems(items);
  }, []);

  const saveVersion = useCallback(() => {
    createVersionMutation.mutate();
  }, [createVersionMutation]);

  const restoreVersion = useCallback((versionId: string) => {
    restoreVersionMutation.mutate(versionId);
  }, [restoreVersionMutation]);

  return {
    memo,
    tocItems,
    updateMemo,
    isSaving: saveMutation.isPending,
    lastSaved,
    isLoading,
    versions,
    saveVersion,
    restoreVersion,
    isRestoringVersion: restoreVersionMutation.isPending,
  };
}
