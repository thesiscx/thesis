import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFounderAuth } from '@/contexts/FounderAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PetitionEditor } from '@/components/editor/PetitionEditor';
import { EditorErrorBoundary } from '@/components/editor/EditorErrorBoundary';
import EditorDocumentationLayout from '@/components/editor/EditorDocumentationLayout';
import { useToast } from '@/hooks/use-toast';

interface TocItem {
  id: string;
  label: string;
  level: number;
}

interface Version {
  id: string;
  version: number;
  created_at: string;
}

const Editor = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useFounderAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState<any>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionSaveRef = useRef<Date>(new Date());

  // Check admin role directly in Editor page
  const { data: isAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ['adminRole', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Cache content with React Query - fetch ONLY the draft (not published)
  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ['editorContent'],
    queryFn: async () => {
      // Get the draft row (is_draft: true, is_published: false)
      const { data: draftData } = await supabase
        .from('petition_content')
        .select('*')
        .eq('is_draft', true)
        .eq('is_published', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draftData) {
        return {
          content: draftData.content,
          contentId: draftData.id,
          version: draftData.version,
          lastSaved: new Date(draftData.updated_at),
        };
      }

      // No draft exists - create one
      const { data: newDraft } = await supabase
        .from('petition_content')
        .insert({
          content: { type: 'doc', content: [] },
          is_draft: true,
          is_published: false,
          version: 1,
          created_by: user?.id,
        })
        .select()
        .single();

      if (newDraft) {
        return {
          content: newDraft.content,
          contentId: newDraft.id,
          version: 1,
          lastSaved: null,
        };
      }

      return null;
    },
    enabled: isAdmin === true,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });

  // Check published content and compare with draft to determine initial state
  const { data: publishedData } = useQuery({
    queryKey: ['publishedContent'],
    queryFn: async () => {
      const { data } = await supabase
        .from('petition_content')
        .select('id, content')
        .eq('is_published', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: isAdmin === true,
    staleTime: 1000 * 60 * 5,
  });

  const hasPublishedContent = !!publishedData;

  // Cache versions with React Query
  const { data: versions = [] } = useQuery({
    queryKey: ['editorVersions', contentData?.contentId],
    queryFn: async () => {
      if (!contentData?.contentId) return [];
      
      const { data } = await supabase
        .from('petition_content_versions')
        .select('id, version, created_at')
        .eq('content_id', contentData.contentId)
        .order('version', { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: !!contentData?.contentId,
    staleTime: 1000 * 60 * 5,
  });

  const contentId = contentData?.contentId || null;

  // Move content sync to useEffect (not during render)
  useEffect(() => {
    if (contentData && content === null) {
      setContent(contentData.content);
      setCurrentVersion(contentData.version);
      if (contentData.lastSaved) {
        setLastSaved(contentData.lastSaved);
      }
    }
  }, [contentData, content]);

  // Determine initial publish state by comparing draft and published content
  useEffect(() => {
    if (contentData && publishedData) {
      const draftJson = JSON.stringify(contentData.content);
      const publishedJson = JSON.stringify(publishedData.content);
      const contentMatches = draftJson === publishedJson;
      
      if (contentMatches) {
        setHasUnpublishedChanges(false);
        setPublishSuccess(true);
      } else {
        setHasUnpublishedChanges(true);
        setPublishSuccess(false);
      }
    } else if (contentData && !publishedData) {
      // Draft exists but no published content yet
      setHasUnpublishedChanges(true);
      setPublishSuccess(false);
    }
  }, [contentData, publishedData]);

  // Handle redirects in useEffect, not during render
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/editor/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Only redirect when we have CONFIRMED non-admin status
  useEffect(() => {
    if (!isCheckingAdmin && isAdmin === false && user) {
      toast({
        title: 'Access denied',
        description: 'You need admin privileges to access the editor.',
        variant: 'destructive',
      });
      navigate('/editor/login', { replace: true });
    }
  }, [isCheckingAdmin, isAdmin, user, navigate, toast]);

  const saveContent = useCallback(async (newContent: any, createVersion = false) => {
    if (!contentId || !user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('petition_content')
        .update({
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contentId);

      if (error) throw error;

      const now = new Date();
      const minutesSinceLastVersion = (now.getTime() - lastVersionSaveRef.current.getTime()) / 60000;
      
      if (createVersion || minutesSinceLastVersion >= 5) {
        const newVersion = currentVersion + 1;
        
        await supabase
          .from('petition_content_versions')
          .insert({
            content_id: contentId,
            content: newContent,
            version: newVersion,
            created_by: user.id,
          });

        await supabase
          .from('petition_content')
          .update({ version: newVersion })
          .eq('id', contentId);

        setCurrentVersion(newVersion);
        lastVersionSaveRef.current = now;
        queryClient.invalidateQueries({ queryKey: ['editorVersions', contentId] });
      }

      setLastSaved(now);
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save content',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [contentId, user, currentVersion, toast, queryClient]);

  const handleContentChange = useCallback((newContent: any) => {
    setContent(newContent);
    setHasUnpublishedChanges(true);
    setPublishSuccess(false);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 2000);
  }, [saveContent]);

  const handleTocChange = useCallback((toc: TocItem[]) => {
    setTocItems(toc);
  }, []);

  const handlePublish = async () => {
    if (!contentId || !user || !content) return;

    setIsPublishing(true);

    try {
      // Find existing published row (is_draft: false, is_published: true)
      const { data: existingPublished } = await supabase
        .from('petition_content')
        .select('id')
        .eq('is_draft', false)
        .limit(1)
        .maybeSingle();

      if (existingPublished) {
        // Update existing published row with draft content
        const { error } = await supabase
          .from('petition_content')
          .update({
            content: content,
            is_published: true,
            published_at: new Date().toISOString(),
            published_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPublished.id);

        if (error) throw error;
      } else {
        // Create new published row by copying draft content
        const { error } = await supabase
          .from('petition_content')
          .insert({
            content: content,
            is_draft: false,
            is_published: true,
            published_at: new Date().toISOString(),
            published_by: user.id,
            version: currentVersion,
            created_by: user.id,
          });

        if (error) throw error;
      }

      // Create version snapshot directly (without triggering auto-save indicator)
      const newVersion = currentVersion + 1;
      await supabase
        .from('petition_content_versions')
        .insert({
          content_id: contentId,
          content: content,
          version: newVersion,
          created_by: user.id,
        });

      await supabase
        .from('petition_content')
        .update({ version: newVersion })
        .eq('id', contentId);

      setCurrentVersion(newVersion);
      queryClient.invalidateQueries({ queryKey: ['editorVersions', contentId] });
      queryClient.invalidateQueries({ queryKey: ['publishedContent'] });

      // Update state after successful publish
      setPublishSuccess(true);
      setHasUnpublishedChanges(false);

      toast({
        title: 'Published!',
        description: 'Your changes are now live.',
      });
    } catch (error: any) {
      toast({
        title: 'Publish failed',
        description: error.message || 'Failed to publish content',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      const { data: versionData, error } = await supabase
        .from('petition_content_versions')
        .select('content, version')
        .eq('id', versionId)
        .single();

      if (error || !versionData) throw error;

      setContent(versionData.content);
      await saveContent(versionData.content, true);

      toast({
        title: 'Version restored',
        description: `Restored to version ${versionData.version}`,
      });
    } catch (error: any) {
      toast({
        title: 'Restore failed',
        description: error.message || 'Failed to restore version',
        variant: 'destructive',
      });
    }
  };

  const handleEditorReset = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['editorContent'] });
  }, [queryClient]);

  // Show nothing while loading or redirecting
  if (authLoading || isCheckingAdmin || !user || isAdmin === false || contentLoading || content === null) {
    return null;
  }

  return (
    <EditorDocumentationLayout
      tocItems={tocItems}
      lastSaved={lastSaved}
      isSaving={isSaving}
      onPublish={handlePublish}
      isPublishing={isPublishing}
      versions={versions}
      onRestoreVersion={handleRestoreVersion}
      hasPublishedContent={hasPublishedContent}
      hasUnpublishedChanges={hasUnpublishedChanges}
      publishSuccess={publishSuccess}
    >
      <EditorErrorBoundary onReset={handleEditorReset}>
        <PetitionEditor
          content={content}
          onContentChange={handleContentChange}
          onTocChange={handleTocChange}
        />
      </EditorErrorBoundary>
    </EditorDocumentationLayout>
  );
};

export default Editor;
