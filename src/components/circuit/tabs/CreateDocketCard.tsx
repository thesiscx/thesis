import { useState } from "react";
import { FolderPlus, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");

  const activeRound = roundId 
    ? { id: roundId, slug: roundSlug }
    : openRound;

  // Fetch all investors
  const { data: allInvestors = [] } = useQuery({
    queryKey: ["investors", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("investors")
        .select("id, name, email, slug")
        .eq("workspace_id", user.id)
        .order("name");
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch investors who already have dockets in this round
  const { data: investorsWithDockets = [] } = useQuery({
    queryKey: ["investors-with-dockets", activeRound?.id],
    queryFn: async () => {
      if (!activeRound?.id) return [];
      const { data } = await supabase
        .from("dockets")
        .select("investor_id")
        .eq("round_id", activeRound.id)
        .eq("is_global", false)
        .not("investor_id", "is", null);
      return data?.map(d => d.investor_id) || [];
    },
    enabled: !!activeRound?.id,
  });

  // Available investors = all investors minus those with dockets
  const availableInvestors = allInvestors.filter(
    inv => !investorsWithDockets.includes(inv.id)
  );

  const selectedInvestor = allInvestors.find(inv => inv.id === selectedInvestorId);

  const handleSubmit = async () => {
    if (!selectedInvestorId || !activeRound || !user || !selectedInvestor) return;
    
    setStatus("loading");
    
    try {
      // Generate access key
      const accessKey = crypto.randomUUID().split("-").slice(0, 2).join("-");
      
      const { data: accessKeyData, error: accessKeyError } = await supabase
        .from("access_keys")
        .insert({
          key: accessKey,
          investor_id: selectedInvestorId,
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
          investor_id: selectedInvestorId,
          investor_name: selectedInvestor.name,
          investor_email: selectedInvestor.email || null,
          access_key_id: accessKeyData.id,
          is_global: false,
          status: "draft",
          created_by: user.id,
        });

      if (docketError) throw docketError;

      setCreatedName(selectedInvestor.name);
      setStatus("success");
      queryClient.invalidateQueries({ queryKey: ["dockets"] });
      queryClient.invalidateQueries({ queryKey: ["dockets-summary"] });
      queryClient.invalidateQueries({ queryKey: ["investors-with-dockets"] });
      toast({ title: "Docket created" });
      onSuccess?.();
      
      // Reset form after brief delay
      setTimeout(() => {
        setSelectedInvestorId("");
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
        <div className="rounded-xl border border-border bg-transparent overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
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
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Create Docket</span>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Create an investor docket with access key for sharing deal terms and collecting signatures.
          </p>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Select Investor *</Label>
              {availableInvestors.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  {allInvestors.length === 0 
                    ? "No investors in pipeline. Add investors first."
                    : "All investors already have dockets."}
                </p>
              ) : (
                <Select
                  value={selectedInvestorId}
                  onValueChange={setSelectedInvestorId}
                  disabled={status === "loading"}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Choose an investor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {availableInvestors.map((investor) => (
                      <SelectItem key={investor.id} value={investor.id}>
                        <span>{investor.name}</span>
                        {investor.email && (
                          <span className="text-muted-foreground ml-2">
                            ({investor.email})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Button 
            size="sm" 
            onClick={handleSubmit} 
            disabled={!selectedInvestorId || status === "loading" || availableInvestors.length === 0}
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
        idleText={availableInvestors.length > 0 ? "Ready to create docket" : "Add investors to pipeline first"}
        loadingText="Creating docket..."
        successText={createdName ? `Docket for ${createdName} created` : "Docket created"}
        errorText="Failed to create docket"
      />
    </>
  );
}
