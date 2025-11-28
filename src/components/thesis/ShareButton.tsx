import { useState } from "react";
import { Share2, Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  roundSlug?: string;
  variantSlug?: string;
}

export default function ShareButton({ roundSlug, variantSlug }: ShareButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [permissions, setPermissions] = useState<"view" | "invest">("view");
  const [newInvestorName, setNewInvestorName] = useState("");

  // Generate a shareable link (placeholder for now)
  const shareLink = `${window.location.origin}/invest/${roundSlug}/${variantSlug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
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
            <h4 className="font-medium mb-2">Share this memo</h4>
            <p className="text-sm text-muted-foreground">
              Generate a link for investors to view or invest
            </p>
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <Select value={permissions} onValueChange={(v: "view" | "invest") => setPermissions(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View only</SelectItem>
                <SelectItem value="invest">View and invest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Share link</Label>
            <div className="flex gap-2">
              <Input 
                value={shareLink} 
                readOnly 
                className="text-xs"
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
              Creates a personalized memo variant for this investor
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
