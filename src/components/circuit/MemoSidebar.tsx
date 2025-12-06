import { useState, useRef } from "react";
import { Check, History } from "lucide-react";
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
}

export default function MemoSidebar({
  tocItems,
  lastSaved,
  isSaving,
  versions = [],
  onRestoreVersion,
  isRestoringVersion,
}: MemoSidebarProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const isScrollingRef = useRef(false);

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
          <h3 className="text-sm font-medium">
            Memo
          </h3>
          <div className="flex items-center gap-2">
            {versions.length > 0 && onRestoreVersion && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-1.5">
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSaving ? (
                <>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>{format(lastSaved, 'h:mm a')}</span>
                </>
              ) : null}
            </div>
          </div>
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
