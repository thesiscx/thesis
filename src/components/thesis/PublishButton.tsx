import { useState } from "react";
import { ExternalLink, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface PublishButtonProps {
  roundSlug?: string;
  isPublished?: boolean;
}

export default function PublishButton({ roundSlug, isPublished = false }: PublishButtonProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Generate the published URL based on round
  const publishedUrl = `${roundSlug}.thesis.run`;

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
      <PopoverContent align="end" className="w-72 p-0">
        <a
          href={`https://${publishedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border"
        >
          <span className="text-muted-foreground truncate">{publishedUrl}</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
        </a>
        
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
      </PopoverContent>
    </Popover>
  );
}
