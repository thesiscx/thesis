import { useState, useEffect } from "react";
import { Share2, Copy, Check, Link2, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { getRoundCode } from "@/hooks/useRounds";

interface ShareButtonProps {
  roundId?: string;
  roundSlug?: string;
  roundType?: string;
  roundNumber?: number;
  investorId?: string;
  investorSlug?: string;
  investorName?: string;
  tool?: 'memo' | 'docket';
}

export default function ShareButton({ 
  roundId,
  roundSlug, 
  roundType = 's',
  roundNumber = 1,
  investorId,
  investorSlug,
  investorName,
  tool = 'memo'
}: ShareButtonProps) {
  const { toast } = useToast();
  const { user } = useFounderAuth();
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [newInvestorName, setNewInvestorName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [companySlug, setCompanySlug] = useState<string | null>(null);

  // Fetch company slug from profile
  useEffect(() => {
    const fetchCompanySlug = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("company_slug")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data?.company_slug) {
        setCompanySlug(data.company_slug);
      }
    };

    fetchCompanySlug();
  }, [user]);

  const isGlobal = !investorId;
  const roundCode = getRoundCode({ round_type: roundType as any, round_number: roundNumber });
  
  // Generate the shareable link (uses /share/ prefix for public routes)
  const shareLink = companySlug 
    ? `https://thesis.run/share/${companySlug}/${roundCode}/${tool}${investorSlug ? `/${investorSlug}` : ""}`
    : null;

  const copyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyKey = async () => {
    if (!accessKey) return;
    await navigator.clipboard.writeText(accessKey);
    setKeyCopied(true);
    toast({ title: "Access key copied to clipboard" });
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const generateAccessKey = async () => {
    if (!investorId || !roundId) {
      toast({ 
        title: "Cannot generate key", 
        description: "Investor and round are required",
        variant: "destructive" 
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-access-key', {
        body: { investorId, roundId, tool }
      });

      if (error) throw error;

      setAccessKey(data.key);
      if (data.isExisting) {
        toast({ title: "Existing key retrieved" });
      } else {
        toast({ title: "Access key generated" });
      }
    } catch (error) {
      console.error("Error generating access key:", error);
      toast({ 
        title: "Failed to generate key", 
        description: "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateInvestorVariant = () => {
    if (!newInvestorName.trim()) return;
    
    // This will be implemented to create a new investor variant
    toast({ title: `Creating variant for ${newInvestorName}...` });
    setNewInvestorName("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">
              {isGlobal ? "Share this memo" : `Share with ${investorName || investorSlug}`}
            </h4>
            <p className="text-sm text-muted-foreground">
              {isGlobal 
                ? "Create investor-specific links below" 
                : "Share the link and access key with this investor"}
            </p>
          </div>

          {/* Share link section */}
          {!isGlobal && shareLink && (
            <>
              <div className="space-y-2">
                <Label>Share link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={shareLink} 
                    readOnly 
                    className="text-xs font-mono"
                  />
                  <Button size="icon" variant="outline" onClick={copyLink}>
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Access key</Label>
                {accessKey ? (
                  <div className="flex gap-2">
                    <Input 
                      value={accessKey} 
                      readOnly 
                      className="text-xs font-mono tracking-wider"
                    />
                    <Button size="icon" variant="outline" onClick={copyKey}>
                      {keyCopied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={generateAccessKey}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Generate access key
                      </>
                    )}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Investor needs both the link and key to access
                </p>
              </div>
            </>
          )}

          {/* Create new investor variant */}
          <div className="border-t pt-4 space-y-2">
            <Label>Create investor variant</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Investor name"
                value={newInvestorName}
                onChange={(e) => setNewInvestorName(e.target.value)}
              />
              <Button 
                size="sm" 
                onClick={handleCreateInvestorVariant}
                disabled={!newInvestorName.trim()}
              >
                <Link2 className="w-4 h-4 mr-1" />
                Create
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Creates a personalized {tool} variant for this investor
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
