import { useState, useRef } from "react";
import { Check, History, Pencil, Eye, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface MemoSidebarProps {
  tocItems: TocItem[];
  lastSaved: Date | null;
  isSaving: boolean;
  versions?: MemoVersion[];
  onRestoreVersion?: (versionId: string) => void;
  isRestoringVersion?: boolean;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  memoId?: string | null;
}

export default function MemoSidebar({
  tocItems,
  lastSaved,
  isSaving,
  versions = [],
  onRestoreVersion,
  isRestoringVersion,
  isEditing = false,
  onToggleEdit,
  memoId,
}: MemoSidebarProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const isScrollingRef = useRef(false);

  // Generate or get existing preview link
  const handlePreview = async () => {
    if (!memoId) {
      toast.error("Save the memo first to preview it");
      return;
    }

    setIsGeneratingPreview(true);
    
    try {
      // Check if preview link already exists
      const { data: existingLink, error: fetchError } = await supabase
        .from('share_links')
        .select('token')
        .eq('memo_id', memoId)
        .eq('permissions', 'preview')
        .maybeSingle();

      if (fetchError) throw fetchError;

      let token: string;

      if (existingLink) {
        token = existingLink.token;
      } else {
        // Generate new preview token (long random string)
        token = crypto.randomUUID() + '-' + crypto.randomUUID();
        
        const { error: insertError } = await supabase
          .from('share_links')
          .insert({
            memo_id: memoId,
            token,
            permissions: 'preview',
          });

        if (insertError) throw insertError;
      }

      // Open preview in new tab
      const previewUrl = `${window.location.origin}/preview/memo/${token}`;
      window.open(previewUrl, '_blank');
    } catch (error) {
      console.error('Error generating preview link:', error);
      toast.error("Failed to generate preview link");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const scrollToSection = (id: string) => {
    isScrollingRef.current = true;
    setActiveSection(id);
    
    const match = id.match(/h1-(\d+)/);
    if (!match) {
      isScrollingRef.current = false;
      return;
    }
    
    const h1Index = parseInt(match[1], 10);
    const proseMirror = document.querySelector('.ProseMirror');
    if (!proseMirror) {
      isScrollingRef.current = false;
      return;
    }
    
    const h1Headings = proseMirror.querySelectorAll('h1');
    const targetHeading = h1Headings[h1Index] as HTMLElement;
    
    if (!targetHeading) {
      isScrollingRef.current = false;
      return;
    }
    
    const toolbarHeight = 70;
    const editorWrapper = targetHeading.closest('.overflow-y-auto') || document.querySelector('main');
    
    if (editorWrapper) {
      const wrapperRect = editorWrapper.getBoundingClientRect();
      const headingRect = targetHeading.getBoundingClientRect();
      const currentScroll = editorWrapper.scrollTop;
      const targetScroll = currentScroll + (headingRect.top - wrapperRect.top) - toolbarHeight;
      editorWrapper.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
    
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);
  };

  return (
    <aside className="w-72 flex flex-col h-full overflow-y-auto bg-background">
      <div className="flex-1 p-6 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold">
            Memo
          </h1>
          <div className="flex items-center gap-1">
            {onToggleEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={onToggleEdit}
                  >
                    {isEditing ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isEditing ? 'View' : 'Edit'}
                </TooltipContent>
              </Tooltip>
            )}
            {memoId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={handlePreview}
                    disabled={isGeneratingPreview}
                  >
                    {isGeneratingPreview ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Preview
                </TooltipContent>
              </Tooltip>
            )}
            {versions.length > 0 && onRestoreVersion && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <History className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Version History
                  </div>
                  <ScrollArea className="max-h-64">
                    {versions.map((version) => (
                      <DropdownMenuItem
                        key={version.id}
                        onClick={() => onRestoreVersion(version.id)}
                        disabled={isRestoringVersion}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">Version {version.version}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(version.created_at), "MMM d, h:mm a")}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Always visible timestamp section - fixed height to prevent shift */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 h-4">
          {isSaving ? (
            <>
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="w-3 h-3 shrink-0" />
              <span>Last saved {format(lastSaved, 'h:mm a')}</span>
            </>
          ) : (
            <span className="opacity-50">Not saved yet</span>
          )}
        </div>
        
        {tocItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add headings to see the outline
          </p>
        ) : (
          <nav className="space-y-1">
            {tocItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors",
                  activeSection === item.id
                    ? "text-foreground bg-muted font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
