import { useState, useEffect } from "react";
import { ExternalLink, Loader2, Check, Copy, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { getRoundCode } from "@/hooks/useRounds";

interface PublishButtonProps {
  roundId?: string;
  roundSlug?: string;
  roundType?: string;
  roundNumber?: number;
  variantSlug?: string;
  investorId?: string;
  tool?: 'memo' | 'docket';
  isPublished?: boolean;
}

export default function PublishButton({ 
  roundId,
  roundSlug, 
  roundType = 's',
  roundNumber = 1,
  variantSlug,
  investorId,
  tool = 'memo',
  isPublished = false 
}: PublishButtonProps) {
  const { toast } = useToast();
  const { user } = useFounderAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const isGlobal = !variantSlug || variantSlug === "global";

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

  // Generate the public URL based on company slug and round code
  const roundCode = getRoundCode({ round_type: roundType as any, round_number: roundNumber });
  
  const publishedUrl = companySlug 
    ? `thesis.run/${companySlug}/${roundCode}/${tool}${isGlobal ? "" : `/${variantSlug}`}`
    : null;

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishSuccess(false);
    
    try {
      // If on investor variant, also generate access key
      if (!isGlobal && investorId && roundId && !accessKey) {
        await generateAccessKey();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      setPublishSuccess(true);
      toast({ title: isPublished ? "Updated" : "Published" });
      
      setTimeout(() => {
        setPublishSuccess(false);
      }, 3000);
    } catch (error) {
      toast({ 
        title: "Failed to publish", 
        description: "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const generateAccessKey = async () => {
    if (!roundId) return;

    setIsGeneratingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-access-key', {
        body: { investorId: isGlobal ? null : investorId, roundId, tool }
      });

      if (error) throw error;
      setAccessKey(data.key);
    } catch (error) {
      console.error("Error generating access key:", error);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyUrl = async () => {
    if (!publishedUrl) return;
    await navigator.clipboard.writeText(`https://${publishedUrl}`);
    setUrlCopied(true);
    toast({ title: "URL copied" });
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const copyKey = async () => {
    if (!accessKey) return;
    await navigator.clipboard.writeText(accessKey);
    setKeyCopied(true);
    toast({ title: "Access key copied" });
    setTimeout(() => setKeyCopied(false), 2000);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="min-w-[90px]">
          Publish
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {publishedUrl ? (
          <div className="p-4 space-y-4">
            {/* URL Section */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Public URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={`https://${publishedUrl}`} 
                  readOnly 
                  className="text-xs font-mono h-9"
                />
                <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={copyUrl}>
                  {urlCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Access Key Section */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Access Key</Label>
              {accessKey ? (
                <div className="flex gap-2">
                  <Input 
                    value={accessKey} 
                    readOnly 
                    className="text-xs font-mono tracking-wider h-9"
                  />
                  <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={copyKey}>
                    {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full" 
                  onClick={generateAccessKey}
                  disabled={isGeneratingKey || !roundId || (!isGlobal && !investorId)}
                >
                  {isGeneratingKey ? (
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
                {isGlobal ? "Share URL and key with anyone" : "Share both URL and key with the investor"}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Set your company URL slug to enable publishing
            </p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setPopoverOpen(false);
                window.location.href = '/thesis/settings';
              }}
            >
              Go to Settings
            </Button>
          </div>
        )}
        
        {publishedUrl && (
          <>
            <div className="px-4 py-2 border-t border-border">
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  toast({ title: "Custom domain settings coming soon" });
                }}
              >
                + Connect custom domain
              </button>
            </div>

            <div className="p-3 border-t border-border">
              <Button
                size="sm"
                className="w-full"
                onClick={handlePublish}
                disabled={isPublishing || publishSuccess}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    {isPublished ? "Updating..." : "Publishing..."}
                  </>
                ) : publishSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    {isPublished ? "Updated" : "Published"}
                  </>
                ) : isPublished ? (
                  "Update"
                ) : (
                  "Publish"
                )}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
