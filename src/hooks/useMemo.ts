import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Json } from "@/integrations/supabase/types";
import { logActivity } from "@/lib/activityLogger";

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

interface PendingContent {
  content: Json;
  memoId: string;
}

export function useMemo(roundSlug?: string, variantSlug?: string) {
  const { user } = useFounderAuth();
  const queryClient = useQueryClient();
  const [localContent, setLocalContent] = useState<Json | null>(null);
  const [pendingContent, setPendingContent] = useState<PendingContent | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const lastVersionTime = useRef<Date>(new Date());
  const hasInitializedContent = useRef(false);
  
  const debouncedPending = useDebounce(pendingContent, 1000);

  const isGlobal = !variantSlug || variantSlug === "global";

  // CRITICAL: Reset all state when switching rounds/variants
  useEffect(() => {
    console.log('[Memo] Round/variant changed, resetting state', { roundSlug, variantSlug });
    setPendingContent(null);
    setLocalContent(null);
    setTocItems([]);
    hasInitializedContent.current = false;
  }, [roundSlug, variantSlug]);

  // Track last known updated_at to detect external changes
  const lastUpdatedAt = useRef<string | null>(null);

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
        .select("id, content, round_id, investor_id, is_global, version, updated_at, created_at, created_by")
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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  // Track which memo ID we've initialized to detect memo changes
  const initializedMemoId = useRef<string | null>(null);

  // Extract TOC from content
  const extractTocFromContent = useCallback((content: Json) => {
    if (!content || typeof content !== 'object') return [];
    
    const jsonContent = content as { content?: any[] };
    if (!jsonContent.content) return [];
    
    const items: TocItem[] = [];
    let headingIndex = 0;
    
    const traverse = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.type === 'heading' && node.attrs?.level === 1) {
          const text = node.content
            ?.filter((n: any) => n.type === 'text')
            .map((n: any) => n.text)
            .join('') || '';
          
          if (text.trim()) {
            items.push({
              id: `heading-${headingIndex}`,
              label: text.trim(),
              level: 1,
            });
            headingIndex++;
          }
        }
        if (node.content) {
          traverse(node.content);
        }
      }
    };
    
    traverse(jsonContent.content);
    return items;
  }, []);
  
  // Sync local content with memo from DB - force update when updated_at changes (AI edits)
  useEffect(() => {
    if (memo?.content) {
      const isNewMemo = initializedMemoId.current !== memo.id;
      const isExternalUpdate = memo.updated_at !== lastUpdatedAt.current;
      
      // Force sync on: new memo, external update (AI edit), or initial load
      if (isNewMemo || isExternalUpdate) {
        initializedMemoId.current = memo.id;
        lastUpdatedAt.current = memo.updated_at;
        hasInitializedContent.current = true;
        setLocalContent(memo.content);
        
        // Extract TOC on initial load
        const extractedToc = extractTocFromContent(memo.content);
        if (extractedToc.length > 0) {
          setTocItems(extractedToc);
        }
        
        console.log('[Memo] Set content from DB', { isNewMemo, isExternalUpdate, memoId: memo.id, tocCount: extractedToc.length });
      }
    }
  }, [memo?.content, memo?.id, memo?.updated_at, extractTocFromContent]);

  // Save mutation with error handling
  const saveMutation = useMutation({
    mutationFn: async ({ content, memoId }: { content: Json; memoId: string }) => {
      const { error } = await supabase
        .from("memos")
        .update({ content })
        .eq("id", memoId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      setLastSaved(new Date());
      console.log('[Memo] Save successful');
      
      // Log activity
      if (user?.id) {
        logActivity({
          workspaceId: user.id,
          actionType: "memo_updated",
          memoId: variables.memoId,
        });
      }
    },
    onError: (error) => {
      console.error('[Memo] Save failed:', error);
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
      
      // Log activity
      if (user?.id && memo?.id) {
        logActivity({
          workspaceId: user.id,
          actionType: "memo_version_created",
          memoId: memo.id,
          metadata: { version: memo.version || 1 },
        });
      }
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

  // Auto-save with MEMO ID VALIDATION to prevent race conditions
  useEffect(() => {
    if (debouncedPending && memo?.id) {
      // CRITICAL: Only save if the content belongs to the current memo
      if (debouncedPending.memoId === memo.id) {
        saveMutation.mutate({ content: debouncedPending.content, memoId: debouncedPending.memoId });
      } else {
        console.warn('[Memo] Skipping stale save - memo ID mismatch', {
          contentMemoId: debouncedPending.memoId,
          currentMemoId: memo.id,
        });
      }
    }
  }, [debouncedPending, memo?.id]);

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
    // Only trigger save if content actually changed
    const contentChanged = JSON.stringify(content) !== JSON.stringify(localContent);
    
    if (memo?.id && contentChanged) {
      setPendingContent({ content, memoId: memo.id });
    }
    
    // Always update local state for UI responsiveness
    if (contentChanged) {
      setLocalContent(content);
    }
    setTocItems(items);
  }, [memo?.id, localContent]);

  const saveVersion = useCallback(() => {
    createVersionMutation.mutate();
  }, [createVersionMutation]);

  const restoreVersion = useCallback((versionId: string) => {
    restoreVersionMutation.mutate(versionId);
  }, [restoreVersionMutation]);

  return {
    memo,
    localContent,
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
