import { useState } from "react";
import { Globe, ExternalLink, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useToast } from "@/hooks/use-toast";
import { StatusLine } from "./StatusLine";

export function SubdomainCard() {
  const { profile } = useFounderAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const companySlug = profile?.company_slug;
  const currentSubdomain = companySlug ? `${companySlug}.circuit.cx` : null;

  const handleCopy = async () => {
    if (!currentSubdomain) return;
    await navigator.clipboard.writeText(`https://${currentSubdomain}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "URL copied" });
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Globe className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Custom Domain</span>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Current Subdomain */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Your Circuit URL</Label>
            {currentSubdomain ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-transparent px-3 py-2 rounded border border-border">
                  https://{currentSubdomain}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0 h-8 w-8 p-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://${currentSubdomain}`, "_blank")}
                  className="shrink-0 h-8 w-8 p-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Set a company slug in your profile to get a subdomain.
              </p>
            )}
          </div>

          {/* Custom Domain Info */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  To connect a custom domain (e.g., invest.yourcompany.com), 
                  add these DNS records at your registrar:
                </p>
                <div className="bg-transparent border border-border rounded p-2 font-mono text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>@ or subdomain</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value:</span>
                    <span>185.158.133.1</span>
                  </div>
                </div>
                <div className="bg-transparent border border-border rounded p-2 font-mono text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>TXT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>_lovable</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value:</span>
                    <span>lovable_verify=...</span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => window.open("https://docs.lovable.dev/features/custom-domain", "_blank")}
            >
              <ExternalLink className="w-3 h-3 mr-1.5" />
              View Full Setup Guide
            </Button>
          </div>
        </div>
      </div>
      
      <StatusLine 
        status="idle" 
        idleText={currentSubdomain || "No subdomain configured"} 
      />
    </>
  );
}
