import { useState, useEffect } from "react";
import { ExternalLink, Loader2, Check, Copy, Key, RotateCcw } from "lucide-react";
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

// Helper to add timeout to promises
const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeout]);
};

const EDGE_FUNCTION_TIMEOUT = 15000; // 15 seconds

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
  const { companySlug, profileLoaded } = useFounderAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [accessKeyId, setAccessKeyId] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isRevokingKey, setIsRevokingKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const isGlobal = !variantSlug || variantSlug === "global";

  // Fetch existing access key
  useEffect(() => {
    const fetchExistingKey = async () => {
      if (!roundId || !profileLoaded) return;

      let query = supabase
        .from("access_keys")
        .select("id, key")
        .eq("round_id", roundId)
        .eq("tool", tool)
        .eq("status", "active");

      if (isGlobal) {
        query = query.is("investor_id", null);
      } else if (investorId) {
        query = query.eq("investor_id", investorId);
      } else {
        return;
      }

      const { data } = await query.maybeSingle();
      
      if (data) {
        setAccessKey(data.key);
        setAccessKeyId(data.id);
      } else {
        setAccessKey(null);
        setAccessKeyId(null);
      }
    };

    fetchExistingKey();
  }, [roundId, investorId, tool, isGlobal, profileLoaded]);

  // Generate the public URL based on company slug and round code
  const roundCode = getRoundCode({ round_type: roundType as any, round_number: roundNumber });
  const publishedUrl = `thesis.run/${companySlug}/${roundCode}/${tool}${isGlobal ? "" : `/${variantSlug}`}`;

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
      console.log('[PublishButton] Generating access key...');
      const startTime = Date.now();
      
      const { data, error } = await withTimeout(
        supabase.functions.invoke('generate-access-key', {
          body: { investorId: isGlobal ? null : investorId, roundId, tool }
        }),
        EDGE_FUNCTION_TIMEOUT,
        'Request timed out'
      );

      console.log(`[PublishButton] Access key generated in ${Date.now() - startTime}ms`);

      if (error) throw error;
      setAccessKey(data.key);
      setAccessKeyId(data.id);
    } catch (error: any) {
      console.error("Error generating access key:", error);
      if (error.message === 'Request timed out') {
        toast({ 
          title: "Request timed out", 
          description: "The server took too long to respond. Please try again.",
          variant: "destructive" 
        });
      }
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const revokeAndRegenerateKey = async () => {
    if (!accessKeyId || !roundId) return;

    setIsRevokingKey(true);
    try {
      console.log('[PublishButton] Revoking and regenerating key...');
      const startTime = Date.now();
      
      // Delete existing key
      await supabase
        .from("access_keys")
        .delete()
        .eq("id", accessKeyId);

      // Generate new key with timeout
      const { data, error } = await withTimeout(
        supabase.functions.invoke('generate-access-key', {
          body: { investorId: isGlobal ? null : investorId, roundId, tool }
        }),
        EDGE_FUNCTION_TIMEOUT,
        'Request timed out'
      );

      console.log(`[PublishButton] Key regenerated in ${Date.now() - startTime}ms`);

      if (error) throw error;
      setAccessKey(data.key);
      setAccessKeyId(data.id);
      toast({ title: "Access key regenerated" });
    } catch (error: any) {
      console.error("Error regenerating access key:", error);
      if (error.message === 'Request timed out') {
        toast({ 
          title: "Request timed out", 
          description: "The server took too long to respond. Please try again.",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Failed to regenerate key", variant: "destructive" });
      }
    } finally {
      setIsRevokingKey(false);
    }
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
        {!profileLoaded ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
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
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-9 w-9 flex-shrink-0" 
                    onClick={() => window.open(`https://${publishedUrl}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Access Key Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Access Key</Label>
                  {accessKey && (
                    <button
                      onClick={revokeAndRegenerateKey}
                      disabled={isRevokingKey}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      {isRevokingKey ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      Regenerate
                    </button>
                  )}
                </div>
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
