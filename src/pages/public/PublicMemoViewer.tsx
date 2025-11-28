import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import TipTapRenderer from "@/components/TipTapRenderer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, FileText, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function PublicMemoViewer() {
  const navigate = useNavigate();
  const { investorSession, clearInvestorSession } = useInvestorAuth();
  
  const [memoContent, setMemoContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  // Redirect if no session
  useEffect(() => {
    if (!investorSession) {
      navigate('/', { replace: true });
    }
  }, [investorSession, navigate]);

  // Fetch memo content
  useEffect(() => {
    const fetchMemo = async () => {
      if (!investorSession) return;

      try {
        setIsLoading(true);
        
        // First try to get investor-specific memo
        let { data: memo, error: memoError } = await supabase
          .from('memos')
          .select('content')
          .eq('round_id', investorSession.roundId)
          .eq('investor_id', investorSession.investorId)
          .eq('is_global', false)
          .maybeSingle();

        // If no investor-specific memo, get global memo
        if (!memo) {
          const { data: globalMemo, error: globalError } = await supabase
            .from('memos')
            .select('content')
            .eq('round_id', investorSession.roundId)
            .eq('is_global', true)
            .maybeSingle();

          if (globalError) throw globalError;
          memo = globalMemo;
        }

        if (memo?.content) {
          setMemoContent(memo.content);
          extractToc(memo.content);
        } else {
          setError('Memo content not found');
        }
      } catch (err) {
        console.error('Error fetching memo:', err);
        setError('Failed to load memo');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemo();
  }, [investorSession]);

  // Extract TOC from content
  const extractToc = (content: any) => {
    if (!content?.content) return;

    const items: TocItem[] = [];
    let headingIndex = 0;

    const traverse = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.type === 'heading' && (node.attrs?.level === 1 || node.attrs?.level === 2)) {
          const text = node.content
            ?.filter((n: any) => n.type === 'text')
            .map((n: any) => n.text)
            .join('') || '';

          if (text.trim()) {
            items.push({
              id: `heading-${headingIndex}`,
              text: text.trim(),
              level: node.attrs.level,
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
    setTocItems(items);
  };

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(id);
    }
  };

  const handleLogout = () => {
    clearInvestorSession();
    navigate('/', { replace: true });
  };

  if (!investorSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{investorSession.companyName}</span>
              <ChevronRight className="h-4 w-4" />
              <span>Investment Memo</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{investorSession.investorName}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* TOC Sidebar */}
        {tocItems.length > 0 && (
          <aside className="hidden lg:block w-64 border-r sticky top-14 h-[calc(100vh-3.5rem)]">
            <ScrollArea className="h-full py-6 px-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Contents
              </h3>
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className={`
                      block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors
                      ${item.level === 2 ? 'pl-4' : ''}
                      ${activeHeading === item.id 
                        ? 'bg-secondary text-foreground font-medium' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }
                    `}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-40 w-full mt-8" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">Unable to load memo</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : memoContent ? (
            <article className="prose-sm">
              <TipTapRenderer content={memoContent} />
            </article>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">No content yet</h2>
              <p className="text-muted-foreground">The memo is being prepared.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
