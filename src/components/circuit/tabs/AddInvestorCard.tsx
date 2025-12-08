import { useState } from "react";
import { UserPlus, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useRounds } from "@/hooks/useRounds";
import { cn } from "@/lib/utils";

interface AddInvestorCardProps {
  roundId?: string;
  onSuccess?: () => void;
}

interface InvestorFormData {
  name: string;
  email: string;
  entity_name: string;
  entity_type: string;
  address: string;
}

const ENTITY_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "trust", label: "Trust" },
];

export function AddInvestorCard({ roundId, onSuccess }: AddInvestorCardProps) {
  const { user } = useFounderAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openRound } = useRounds();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [addedName, setAddedName] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvestorFormData>({
    name: "",
    email: "",
    entity_name: "",
    entity_type: "individual",
    address: "",
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !openRound) return;
    
    setIsSubmitting(true);
    
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
        entity_name: formData.entity_name?.trim() || null,
        entity_type: formData.entity_type || "individual",
        address: formData.address?.trim() || null,
        workspace_id: openRound.workspace_id,
      });

      if (error) throw error;

      setAddedName(formData.name);
      setIsComplete(true);
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      toast({ title: "Investor added" });
      onSuccess?.();
      
      // Reset form after brief delay to show success
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          entity_name: "",
          entity_type: "individual",
          address: "",
        });
        setIsComplete(false);
        setAddedName(null);
      }, 2000);
    } catch (error) {
      toast({ 
        title: "Failed to add investor", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isComplete && addedName) {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Add Investor</span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm py-4">
            <Check className="w-4 h-4 text-green-600" />
            <span className="font-medium">{addedName} added to pipeline</span>
          </div>
        </div>
      </div>
    );
  }

  // Check if round is open
  if (!openRound) {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Add Investor</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground text-center py-4">
            Open a round first to add investors
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium">Add Investor</span>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Sequoia Capital"
              className="bg-background"
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
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity Name</Label>
            <Input
              value={formData.entity_name}
              onChange={(e) => setFormData(prev => ({ ...prev, entity_name: e.target.value }))}
              placeholder="Sequoia Capital Operations LLC"
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity Type</Label>
            <RadioGroup 
              value={formData.entity_type} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, entity_type: v }))}
              className="grid grid-cols-2 gap-1.5"
            >
              {ENTITY_TYPES.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                    formData.entity_type === opt.value 
                      ? "border-foreground bg-foreground/5" 
                      : "border-border hover:bg-secondary/50"
                  )}
                >
                  <RadioGroupItem value={opt.value} className="h-3 w-3" />
                  {opt.label}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="2800 Sand Hill Road, Menlo Park, CA 94025"
              rows={2}
              className="text-sm resize-none bg-background"
            />
          </div>
        </div>

        <Button 
          size="sm" 
          onClick={handleSubmit} 
          disabled={!formData.name.trim() || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="w-4 h-4 mr-2" />
          )}
          Add Investor
        </Button>
      </div>
    </div>
  );
}
