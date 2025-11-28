import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TipTapRenderer from "@/components/TipTapRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentationLayout from "@/components/DocumentationLayout";

interface PetitionContent {
  id: string;
  content: any;
  is_published: boolean;
  published_at: string | null;
}

interface TocItem {
  id: string;
  label: string;
  level: number;
}

const PETITION_CACHE_KEY = 'petition_content_cache';

// Extract headings from TipTap JSON content
function extractHeadingsFromContent(content: any): TocItem[] {
  const headings: TocItem[] = [];
  
  if (!content || !content.content) return headings;
  
  let headingIndex = 0;
  
  const traverse = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === 'heading' && node.content) {
        const text = node.content
          .filter((n: any) => n.type === 'text')
          .map((n: any) => n.text)
          .join('');
        
        if (text.trim()) {
          headings.push({
            id: `heading-${headingIndex}`,
            label: text,
            level: node.attrs?.level || 1,
          });
          headingIndex++;
        }
      }
      
      if (node.content) {
        traverse(node.content);
      }
    }
  };
  
  traverse(content.content);
  return headings;
}

// Load cached content from localStorage
function getCachedContent(): PetitionContent | null {
  try {
    const cached = localStorage.getItem(PETITION_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

// Save content to localStorage cache
function setCachedContent(content: PetitionContent) {
  try {
    localStorage.setItem(PETITION_CACHE_KEY, JSON.stringify(content));
  } catch {
    // Ignore storage errors
  }
}

export default function Petition() {
  // Load cached content immediately on mount (no loading state)
  const [cachedContent] = useState<PetitionContent | null>(getCachedContent);

  // Fetch fresh content with React Query
  const { data: freshContent, isLoading, error } = useQuery({
    queryKey: ['petition-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('petition_content')
        .select('id, content, is_published, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Update cache when fresh data arrives
      if (data) {
        setCachedContent(data);
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use fresh content if available, otherwise use cached
  const content = freshContent ?? cachedContent;

  // Extract TOC from content (H1 only)
  const tocItems = useMemo(() => {
    if (!content?.content) return [];
    return extractHeadingsFromContent(content.content).filter(item => item.level === 1);
  }, [content]);

  // Only show skeleton if NO cached content AND still loading
  if (!content && isLoading) {
    return (
      <DocumentationLayout tocItems={[]}>
        <div className="space-y-6 pb-12">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </DocumentationLayout>
    );
  }

  // Show error only if no cached content to fall back on
  if (error && !content) {
    return (
      <DocumentationLayout tocItems={[]}>
        <div className="py-12 text-center">
          <p className="text-destructive">Failed to load content: {(error as Error).message}</p>
        </div>
      </DocumentationLayout>
    );
  }

  if (!content) {
    return (
      <DocumentationLayout tocItems={[]}>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No published content available yet.</p>
        </div>
      </DocumentationLayout>
    );
  }

  return (
    <DocumentationLayout tocItems={tocItems}>
      <div className="pb-12">
        <TipTapRenderer content={content.content} />
      </div>
    </DocumentationLayout>
  );
}
