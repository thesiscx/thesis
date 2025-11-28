import { useState, useEffect } from "react";
import { ExternalLink, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  roundSlug?: string;
  roundType?: string;
  roundNumber?: number;
  variantSlug?: string;
  isPublished?: boolean;
}

export default function PublishButton({ 
  roundSlug, 
  roundType = 's',
  roundNumber = 1,
  variantSlug,
  isPublished = false 
}: PublishButtonProps) {
  const { toast } = useToast();
  const { user } = useFounderAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
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

  // Generate the public URL based on company slug and round code
  const roundCode = getRoundCode({ round_type: roundType as any, round_number: roundNumber });
  const isGlobal = !variantSlug || variantSlug === "global";
  
  const publishedUrl = companySlug 
    ? `thesis.run/${companySlug}/${roundCode}/memo${isGlobal ? "" : `/${variantSlug}`}`
    : null;

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishSuccess(false);
    
    // Simulate publish - this would be replaced with actual publish logic
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setPublishSuccess(true);
      toast({ title: isPublished ? "Memo updated" : "Memo published" });
      
      // Reset success state after a delay
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

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="min-w-[90px]">
          Publish
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {publishedUrl ? (
          <a
            href={`https://${publishedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border"
          >
            <span className="text-muted-foreground truncate font-mono text-xs">{publishedUrl}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
          </a>
        ) : (
          <div className="px-4 py-3 text-sm text-muted-foreground border-b border-border">
            Set your company slug in settings to enable publishing
          </div>
        )}
        
        <div className="px-4 py-3 border-b border-border">
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              toast({ title: "Custom domain settings coming soon" });
            }}
          >
            + Connect custom domain
          </button>
        </div>

        <div className="p-3">
          <Button
            size="sm"
            className="w-full"
            onClick={handlePublish}
            disabled={isPublishing || publishSuccess || !publishedUrl}
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
      </PopoverContent>
    </Popover>
  );
}
