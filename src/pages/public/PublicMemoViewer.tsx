import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import TipTapRenderer from "@/components/TipTapRenderer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut } from "lucide-react";
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
    
    // Set first item as active by default
    if (items.length > 0) {
      setActiveHeading(items[0].id);
    }
  };

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(id);
    }
  };

  // Track scroll position to update active heading
  useEffect(() => {
    const handleScroll = () => {
      const headings = tocItems.map(item => ({
        id: item.id,
        element: document.getElementById(item.id)
      })).filter(h => h.element);

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading.element) {
          const rect = heading.element.getBoundingClientRect();
          if (rect.top <= 100) {
            setActiveHeading(heading.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

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
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-heading text-sm font-medium">
              <span className="text-primary">{investorSession.companyName}</span>
              <span className="text-muted-foreground">Investment Memo</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{investorSession.investorName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* TOC Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="py-10 pl-8 pr-6">
            {tocItems.length > 0 && (
              <ul className="space-y-2">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToHeading(item.id)}
                      className={`
                        block w-full text-left text-sm transition-colors py-1
                        ${item.level === 2 ? 'pl-4' : ''}
                        ${activeHeading === item.id 
                          ? 'text-foreground font-medium' 
                          : 'text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 border-l">
          <div className="max-w-3xl py-10 px-12 lg:px-16">
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-48 w-full mt-8" />
              </div>
            ) : error ? (
              <div className="py-12">
                <h2 className="text-lg font-heading font-medium text-foreground mb-2">Unable to load memo</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
            ) : memoContent ? (
              <article>
                <TipTapRenderer content={memoContent} />
              </article>
            ) : (
              <div className="py-12">
                <h2 className="text-lg font-heading font-medium text-foreground mb-2">No content yet</h2>
                <p className="text-muted-foreground">The memo is being prepared.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
