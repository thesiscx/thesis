import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TipTapRenderer from "@/components/circuit/TipTapRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function MemoPreview() {
  const { token } = useParams();
  
  const [memoContent, setMemoContent] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  // Fetch memo content via preview token
  useEffect(() => {
    const fetchMemo = async () => {
      if (!token) {
        setError('Invalid preview link');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get share_link by token
        const { data: shareLink, error: shareLinkError } = await supabase
          .from('share_links')
          .select('memo_id, permissions')
          .eq('token', token)
          .maybeSingle();

        if (shareLinkError || !shareLink) {
          setError('Preview link not found or expired');
          setIsLoading(false);
          return;
        }

        // Check if this is a preview link
        if (shareLink.permissions !== 'preview') {
          setError('Invalid preview link');
          setIsLoading(false);
          return;
        }

        if (!shareLink.memo_id) {
          setError('Memo not found');
          setIsLoading(false);
          return;
        }

        // Fetch memo content and round info
        const { data: memo, error: memoError } = await supabase
          .from('memos')
          .select('content, round_id')
          .eq('id', shareLink.memo_id)
          .maybeSingle();

        if (memoError || !memo) {
          setError('Unable to load memo');
          setIsLoading(false);
          return;
        }

        // Get company info from round
        const { data: round } = await supabase
          .from('rounds')
          .select('created_by')
          .eq('id', memo.round_id)
          .maybeSingle();

        if (round?.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_name, avatar_url')
            .eq('id', round.created_by)
            .maybeSingle();

          if (profile) {
            setCompanyName(profile.company_name);
            setCompanyLogo(profile.avatar_url);
          }
        }

        if (memo.content) {
          setMemoContent(memo.content);
          extractToc(memo.content);
        } else {
          setError('Memo content not found');
        }
      } catch (err) {
        console.error('Error fetching memo preview:', err);
        setError('Failed to load memo');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemo();
  }, [token]);

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
    
    if (items.length > 0) {
      setActiveHeading(items[0].id);
    }
  };

  // Scroll to heading
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 56 + 40;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveHeading(id);
    }
  };

  // Track scroll position
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-lg font-heading font-medium text-foreground mb-2">Unable to load preview</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between pl-12 pr-6">
          <div className="flex items-center gap-2.5">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName || 'Company'} className="h-5 w-5 object-contain" />
            ) : (
              <div className="h-5 w-5 rounded bg-muted" />
            )}
            <div className="flex items-center gap-2 font-heading text-base font-medium">
              <span className="text-primary">{companyName || 'Preview'}</span>
              <span className="text-muted-foreground">Investment Memo</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Preview Mode</span>
          </div>
        </div>
      </header>

      <div className="flex pl-12 pr-6">
        {/* TOC Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto pt-14">
          <nav className="pr-6">
            {tocItems.length > 0 && (
              <ul className="space-y-1">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToHeading(item.id)}
                      className={`
                        block w-full text-left text-sm transition-colors py-0.5
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
        <main className="flex-1 min-w-0 pt-8">
          <div className="max-w-[45rem] pb-10">
            {isLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-48 w-full mt-8" />
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
