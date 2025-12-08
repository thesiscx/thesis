import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRounds } from "@/hooks/useRounds";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { StatusLine, StatusState } from "./StatusLine";

interface CreateDocketCardProps {
  roundId?: string;
  roundSlug?: string;
  onSuccess?: () => void;
}

export function CreateDocketCard({ roundId, roundSlug, onSuccess }: CreateDocketCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openRound } = useRounds();
  const { user } = useFounderAuth();
  
  const [status, setStatus] = useState<StatusState>("idle");
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const activeRound = roundId 
    ? { id: roundId, slug: roundSlug }
    : openRound;

  const handleSubmit = async () => {
    if (!formData.name.trim() || !activeRound || !user) return;
    
    setStatus("loading");
    
    try {
      // Generate investor slug
      const investorSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 30);

      // First, check if investor already exists or create new
      let investorId: string;
      
      const { data: existingInvestor } = await supabase
        .from("investors")
        .select("id")
        .eq("workspace_id", user.id)
        .eq("slug", investorSlug)
        .maybeSingle();

      if (existingInvestor) {
        investorId = existingInvestor.id;
      } else {
        const { data: newInvestor, error: investorError } = await supabase
          .from("investors")
          .insert({
            name: formData.name.trim(),
            slug: investorSlug,
            email: formData.email?.trim() || null,
            workspace_id: user.id,
          })
          .select("id")
          .single();

        if (investorError) throw investorError;
        investorId = newInvestor.id;
      }

      // Generate access key
      const accessKey = crypto.randomUUID().split("-").slice(0, 2).join("-");
      
      const { data: accessKeyData, error: accessKeyError } = await supabase
        .from("access_keys")
        .insert({
          key: accessKey,
          investor_id: investorId,
          round_id: activeRound.id,
          workspace_id: user.id,
          created_by: user.id,
          status: "active",
          tool: "docket",
        })
        .select("id")
        .single();

      if (accessKeyError) throw accessKeyError;

      // Create docket
      const { error: docketError } = await supabase
        .from("dockets")
        .insert({
          round_id: activeRound.id,
          investor_id: investorId,
          investor_name: formData.name.trim(),
          investor_email: formData.email?.trim() || null,
          access_key_id: accessKeyData.id,
          is_global: false,
          status: "draft",
          created_by: user.id,
        });

      if (docketError) throw docketError;

      setCreatedName(formData.name);
      setStatus("success");
      queryClient.invalidateQueries({ queryKey: ["dockets"] });
      queryClient.invalidateQueries({ queryKey: ["dockets-summary"] });
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      toast({ title: "Docket created" });
      onSuccess?.();
      
      // Reset form after brief delay
      setTimeout(() => {
        setFormData({ name: "", email: "" });
        setStatus("idle");
        setCreatedName(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to create docket:", error);
      toast({ 
        title: "Failed to create docket", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (!activeRound) {
    return (
      <>
        <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Create Docket</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              Open a round first to create dockets
            </p>
          </div>
        </div>
        <StatusLine status="idle" idleText="No active round" />
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Create Docket</span>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Create an investor docket with access key for sharing deal terms and collecting signatures.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Investor Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Sequoia Capital"
                className="bg-background"
                disabled={status === "loading"}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="partner@sequoia.com"
                type="email"
                className="bg-background"
                disabled={status === "loading"}
              />
            </div>
          </div>

          <Button 
            size="sm" 
            onClick={handleSubmit} 
            disabled={!formData.name.trim() || status === "loading"}
            className="w-full"
          >
            {status === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <FolderPlus className="w-4 h-4 mr-2" />
            )}
            Create Docket
          </Button>
        </div>
      </div>
      
      <StatusLine 
        status={status}
        idleText="Ready to create docket"
        loadingText="Creating docket..."
        successText={createdName ? `Docket for ${createdName} created` : "Docket created"}
        errorText="Failed to create docket"
      />
    </>
  );
}
