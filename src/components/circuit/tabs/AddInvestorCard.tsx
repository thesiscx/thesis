import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRounds } from "@/hooks/useRounds";
import { cn } from "@/lib/utils";
import { StatusLine, StatusState } from "./StatusLine";

interface AddInvestorCardProps {
  roundId?: string;
  onSuccess?: () => void;
}

interface InvestorFormData {
  name: string;
  email: string;
  entity_type: "individual" | "institutional";
  firm_name: string;
}

export function AddInvestorCard({ roundId, onSuccess }: AddInvestorCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openRound } = useRounds();
  
  const [status, setStatus] = useState<StatusState>("idle");
  const [addedName, setAddedName] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvestorFormData>({
    name: "",
    email: "",
    entity_type: "individual",
    firm_name: "",
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !openRound) return;
    
    setStatus("loading");
    
    try {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 30);

      const { error } = await supabase.from("investors").insert({
        name: formData.name.trim(),
        slug,
        email: formData.email?.trim() || null,
        entity_name: formData.entity_type === "institutional" ? formData.firm_name?.trim() || null : null,
        entity_type: formData.entity_type,
        workspace_id: openRound.workspace_id,
      });

      if (error) throw error;

      setAddedName(formData.name);
      setStatus("success");
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      toast({ title: "Investor added" });
      onSuccess?.();
      
      // Reset form after brief delay
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          entity_type: "individual",
          firm_name: "",
        });
        setStatus("idle");
        setAddedName(null);
      }, 2000);
    } catch (error) {
      toast({ 
        title: "Failed to add investor", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  if (!openRound) {
    return (
      <>
        <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-foreground" />
            <span className="text-sm font-medium">Add</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              Open a round first to add investors
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
          <UserPlus className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Add</span>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            {/* Entity Type Toggle - First */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, entity_type: "individual" }))}
                  disabled={status === "loading"}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm transition-all",
                    formData.entity_type === "individual"
                      ? "border-foreground bg-foreground/5 font-medium"
                      : "border-border hover:bg-secondary/50"
                  )}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, entity_type: "institutional" }))}
                  disabled={status === "loading"}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm transition-all",
                    formData.entity_type === "institutional"
                      ? "border-foreground bg-foreground/5 font-medium"
                      : "border-border hover:bg-secondary/50"
                  )}
                >
                  Institutional
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={formData.entity_type === "institutional" ? "Jane Smith" : "John Doe"}
                className="bg-background"
                disabled={status === "loading"}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={formData.entity_type === "institutional" ? "partner@sequoia.com" : "john@email.com"}
                type="email"
                className="bg-background"
                disabled={status === "loading"}
              />
            </div>

            {/* Firm Name - Only for Institutional */}
            {formData.entity_type === "institutional" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Firm Name</Label>
                <Input
                  value={formData.firm_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, firm_name: e.target.value }))}
                  placeholder="Sequoia Capital"
                  className="bg-background"
                  disabled={status === "loading"}
                />
              </div>
            )}
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
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Add
          </Button>
        </div>
      </div>
      
      {/* Status Line - Outside Card */}
      <StatusLine 
        status={status}
        idleText="Ready to add investor"
        loadingText="Adding investor..."
        successText={addedName ? `${addedName} added to pipeline` : "Investor added"}
        errorText="Failed to add investor"
      />
    </>
  );
}
