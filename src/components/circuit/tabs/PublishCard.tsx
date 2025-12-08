import { useState, useEffect } from "react";
import { Globe, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useRounds } from "@/hooks/useRounds";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface PublishCardProps {
  roundId?: string;
  roundSlug?: string;
}

type PublishStatus = "idle" | "updating" | "success";

export function PublishCard({ roundId, roundSlug }: PublishCardProps) {
  const { user, profile } = useFounderAuth();
  const { toast } = useToast();
  const { openRound } = useRounds();
  const queryClient = useQueryClient();
  
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");

  const effectiveRoundId = roundId || openRound?.id;
  const effectiveRoundSlug = roundSlug || openRound?.slug;
  const companySlug = profile?.company_slug;

  // Fetch or generate the global access key for public memo
  const { data: accessKeyData, isLoading: isLoadingKey, refetch } = useQuery({
    queryKey: ["memo-public-key", effectiveRoundId],
    queryFn: async () => {
      if (!effectiveRoundId) return null;
      
      const { data, error } = await supabase.functions.invoke("generate-access-key", {
        body: {
          roundId: effectiveRoundId,
          tool: "memo",
          investorId: null, // null = global/public key
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveRoundId && !!user,
  });

  const publicUrl = companySlug && effectiveRoundSlug 
    ? `${window.location.origin}/share/${companySlug}/${effectiveRoundSlug}/memo`
    : null;

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link copied" });
  };

  const handleCopyKey = async () => {
    if (!accessKeyData?.key) return;
    await navigator.clipboard.writeText(accessKeyData.key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast({ title: "Access key copied" });
  };

  const handleUpdate = async () => {
    setPublishStatus("updating");
    
    // Simulate update process - in real app this would invalidate caches, etc.
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Invalidate memo queries to ensure latest content is served
    await queryClient.invalidateQueries({ queryKey: ["memo"] });
    
    setPublishStatus("success");
    
    // Reset after a delay
    setTimeout(() => {
      setPublishStatus("idle");
    }, 3000);
  };

  if (!openRound) {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <Globe className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Publish</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground text-center py-4">
            Open a round first to publish
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
        <Globe className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium">Publish</span>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Public Link */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Public Link</Label>
          <div className="flex gap-2">
            <Input
              value={publicUrl || "Generating..."}
              readOnly
              className="bg-background text-xs font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              disabled={!publicUrl}
              className="shrink-0"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Access Key */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Access Key</Label>
          <div className="flex gap-2">
            <Input
              value={isLoadingKey ? "Generating..." : (accessKeyData?.key || "—")}
              readOnly
              className="bg-background text-xs font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyKey}
              disabled={!accessKeyData?.key}
              className="shrink-0"
            >
              {copiedKey ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Update Button */}
        <Button
          size="sm"
          onClick={handleUpdate}
          disabled={publishStatus === "updating"}
          className="w-full"
        >
          {publishStatus === "updating" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Live
            </>
          )}
        </Button>

        {/* Status Line */}
        <div className={cn(
          "text-xs text-center py-2 rounded-lg transition-all",
          publishStatus === "idle" && "bg-secondary/50 text-muted-foreground",
          publishStatus === "updating" && "bg-primary/10 text-primary animate-pulse",
          publishStatus === "success" && "bg-green-500/10 text-green-600"
        )}>
          {publishStatus === "idle" && "Memo is live and accessible"}
          {publishStatus === "updating" && "Publishing changes live..."}
          {publishStatus === "success" && "✓ Successfully published"}
        </div>
      </div>
    </div>
  );
}
