import { ReactNode, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, History, ChevronDown, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

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

interface EditorDocumentationLayoutProps {
  children: ReactNode;
  tocItems: TocItem[];
  lastSaved: Date | null;
  isSaving: boolean;
  onPublish: () => void;
  isPublishing: boolean;
  versions: Version[];
  onRestoreVersion: (versionId: string) => void;
  hasPublishedContent?: boolean;
  hasUnpublishedChanges?: boolean;
  publishSuccess?: boolean;
}

export default function EditorDocumentationLayout({
  children,
  tocItems,
  lastSaved,
  isSaving,
  onPublish,
  isPublishing,
  versions,
  onRestoreVersion,
  hasPublishedContent = false,
  hasUnpublishedChanges = false,
  publishSuccess = false,
}: EditorDocumentationLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useFounderAuth();
  const [activeSection, setActiveSection] = useState<string>("");
  const [publishPopoverOpen, setPublishPopoverOpen] = useState(false);
  const isScrollingRef = useRef(false);

  const publishedUrl = "rmpetition.lovable.app";

  // Scroll-spy: update active section based on scroll position
  useEffect(() => {
    // Find the actual scroll container - PetitionEditor's wrapper has overflow-y-auto
    const proseMirror = document.querySelector('.ProseMirror');
    const scrollContainer = proseMirror?.closest('.overflow-y-auto');
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Skip scroll-spy during programmatic scrolling
      if (isScrollingRef.current) return;

      if (!proseMirror) return;

      const h1Headings = proseMirror.querySelectorAll('h1');
      if (h1Headings.length === 0) return;

      const toolbarHeight = 150;
      let currentSection = '';

      h1Headings.forEach((heading, index) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= toolbarHeight) {
          currentSection = `h1-${index}`;
        }
      });

      if (currentSection && currentSection !== activeSection) {
        setActiveSection(currentSection);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [activeSection, tocItems]);

  const handleExit = async () => {
    await signOut('/editor/login');
  };

  const handlePublishClick = () => {
    onPublish();
    // Don't close popover - keep it open to show progress
  };

  const scrollToSection = (id: string) => {
    // Disable scroll-spy during programmatic scroll
    isScrollingRef.current = true;
    setActiveSection(id);
    
    // Extract the H1 index from the id (e.g., "h1-0" -> 0)
    const match = id.match(/h1-(\d+)/);
    if (!match) {
      isScrollingRef.current = false;
      return;
    }
    
    const h1Index = parseInt(match[1], 10);
    
    // Find only H1 headings in the ProseMirror editor content
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
    
    // Scroll the heading into view with offset for sticky toolbar
    const toolbarHeight = 70;
    const editorWrapper = targetHeading.closest('.overflow-y-auto') || document.querySelector('main');
    
    if (editorWrapper) {
      const wrapperRect = editorWrapper.getBoundingClientRect();
      const headingRect = targetHeading.getBoundingClientRect();
      const currentScroll = editorWrapper.scrollTop;
      const targetScroll = currentScroll + (headingRect.top - wrapperRect.top) - toolbarHeight;
      editorWrapper.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
    
    // Re-enable scroll-spy after scroll animation completes
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-background sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {/* Editor Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-amber-600">Editor</span>
          </div>
          
          <span className="text-muted-foreground">/</span>
          
          <span className="text-sm text-muted-foreground">Robomart Petition</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Status */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="w-4 h-4 text-muted-foreground" />
                <span>Saved {format(lastSaved, 'h:mm a')}</span>
              </>
            ) : (
              <span>Not saved yet</span>
            )}
          </div>

          <Popover open={publishPopoverOpen} onOpenChange={setPublishPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" className="min-w-[100px]">
                Publish
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              <a
                href={`https://${publishedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border"
              >
                <span className="text-muted-foreground">{publishedUrl}</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
              <div className="p-3">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handlePublishClick}
                  disabled={isPublishing || publishSuccess}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Updating...
                    </>
                  ) : publishSuccess ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Updated
                    </>
                  ) : hasPublishedContent ? (
                    'Update'
                  ) : (
                    'Publish'
                  )}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Dynamic TOC */}
        <aside className="w-72 flex flex-col border-r border-border sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="flex-1 p-6 pt-12 overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Document Outline
            </h3>
            
            {tocItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Add headings to see the document outline
              </p>
            ) : (
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left text-sm py-1.5 transition-colors ${
                      activeSection === item.id
                        ? "text-foreground font-medium opacity-100"
                        : "text-foreground/80 hover:text-foreground"
                    }`}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {/* Version History */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    <span>Version History</span>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {versions.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No previous versions
                  </DropdownMenuItem>
                ) : (
                  versions.map((version) => (
                    <DropdownMenuItem
                      key={version.id}
                      onClick={() => onRestoreVersion(version.id)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">Version {version.version}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main content - Editor */}
        <main className="flex-1 overflow-y-auto flex flex-col h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
