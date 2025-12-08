import { useState, useEffect } from "react";
import { Link2, Copy, Check, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds } from "@/hooks/useRounds";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { StatusLine, StatusState } from "./StatusLine";

interface ShareLinksCardProps {
  roundId?: string;
  roundSlug?: string;
}

interface InvestorLink {
  investorId: string;
  investorName: string;
  investorSlug: string;
  accessKey: string;
  url: string;
}

export function ShareLinksCard({ roundId, roundSlug }: ShareLinksCardProps) {
  const { user, profile } = useFounderAuth();
  const { toast } = useToast();
  const { openRound } = useRounds();
  const navigate = useNavigate();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [investorLinks, setInvestorLinks] = useState<InvestorLink[]>([]);
  const [status, setStatus] = useState<StatusState>("idle");

  const effectiveRoundId = roundId || openRound?.id;
  const effectiveRoundSlug = roundSlug || openRound?.slug;
  const companySlug = profile?.company_slug;

  // Fetch all investors for this workspace
  const { data: investors = [], isLoading: isLoadingInvestors } = useQuery({
    queryKey: ["investors", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("investors")
        .select("id, name, slug")
        .eq("workspace_id", user.id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch existing access keys for memo tool
  const { data: existingKeys = [], isLoading: isLoadingKeys, refetch: refetchKeys } = useQuery({
    queryKey: ["memo-access-keys", effectiveRoundId],
    queryFn: async () => {
      if (!effectiveRoundId) return [];
      
      const { data, error } = await supabase
        .from("access_keys")
        .select("id, key, investor_id")
        .eq("round_id", effectiveRoundId)
        .eq("tool", "memo")
        .not("investor_id", "is", null);

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveRoundId,
  });

  // Build investor links from existing keys
  useEffect(() => {
    if (!investors.length || !companySlug || !effectiveRoundSlug) return;

    const links: InvestorLink[] = [];
    
    for (const investor of investors) {
      const existingKey = existingKeys.find(k => k.investor_id === investor.id);
      if (existingKey) {
        links.push({
          investorId: investor.id,
          investorName: investor.name,
          investorSlug: investor.slug,
          accessKey: existingKey.key,
          url: `${window.location.origin}/share/${companySlug}/${effectiveRoundSlug}/memo/${investor.slug}`,
        });
      }
    }

    setInvestorLinks(links);
  }, [investors, existingKeys, companySlug, effectiveRoundSlug]);

  // Generate links for investors who don't have them yet
  const generateNewLinks = async () => {
    if (!effectiveRoundId || !investors.length) return;
    
    setIsGenerating(true);
    setStatus("loading");

    try {
      const investorsNeedingKeys = investors.filter(
        inv => !existingKeys.some(k => k.investor_id === inv.id)
      );

      if (investorsNeedingKeys.length === 0) {
        toast({ title: "All investors already have links" });
        setIsGenerating(false);
        setStatus("idle");
        return;
      }

      for (const investor of investorsNeedingKeys) {
        await supabase.functions.invoke("generate-access-key", {
          body: {
            roundId: effectiveRoundId,
            tool: "memo",
            investorId: investor.id,
          },
        });
      }

      await refetchKeys();
      toast({ title: `Generated ${investorsNeedingKeys.length} new link(s)` });
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      console.error("Generate links error:", error);
      toast({
        title: "Failed to generate links",
        variant: "destructive",
      });
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on mount if there are investors without keys
  useEffect(() => {
    if (
      !isLoadingInvestors && 
      !isLoadingKeys && 
      investors.length > 0 && 
      effectiveRoundId &&
      !isGenerating
    ) {
      const investorsNeedingKeys = investors.filter(
        inv => !existingKeys.some(k => k.investor_id === inv.id)
      );
      
      if (investorsNeedingKeys.length > 0) {
        generateNewLinks();
      }
    }
  }, [isLoadingInvestors, isLoadingKeys, investors.length, existingKeys.length, effectiveRoundId]);

  const handleCopyKey = async (key: string, name: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: `Key for ${name} copied` });
  };

  const handleNavigateToInvestor = (investorSlug: string) => {
    if (effectiveRoundSlug) {
      navigate(`/${effectiveRoundSlug}/memo/${investorSlug}`);
    }
  };

  if (!openRound) {
    return (
      <>
        <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Share Links</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              Open a round first to share
            </p>
          </div>
        </div>
        <StatusLine status="idle" idleText="No active round" />
      </>
    );
  }

  const isLoading = isLoadingInvestors || isLoadingKeys || isGenerating;

  return (
    <>
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Share Links</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={generateNewLinks}
            disabled={isLoading}
            className="h-7 px-2"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        
        <div className="p-4">
          {isLoading && investorLinks.length === 0 ? (
            <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating links...</span>
            </div>
          ) : investorLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No investors in pipeline yet
            </p>
          ) : (
            <div className="space-y-2">
              {investorLinks.map((link) => (
                <div
                  key={link.investorId}
                  onClick={() => handleNavigateToInvestor(link.investorSlug)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border border-border bg-background",
                    "cursor-pointer hover:bg-secondary/50 transition-colors"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{link.investorName}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyKey(link.accessKey, link.investorName);
                    }}
                    className="h-7 px-2 shrink-0"
                  >
                    {copiedKey === link.accessKey ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Status Line - Outside Card */}
      <StatusLine 
        status={status}
        idleText={investorLinks.length > 0 ? `${investorLinks.length} investor link(s) ready` : "Add investors to generate links"}
        loadingText="Generating links..."
        successText="Links generated successfully"
        errorText="Failed to generate links"
      />
    </>
  );
}
