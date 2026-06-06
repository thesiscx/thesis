import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, RotateCcw } from "lucide-react";
import { StatusLine } from "./StatusLine";
import { useRounds } from "@/hooks/useRounds";

interface ManageInvestorCardProps {
  investorId?: string;
  investorName?: string;
  investorStatus?: string;
  roundSlug?: string;
}

const DELETE_REASONS = [
  { value: "lost-interest", label: "Lost interest" },
  { value: "wrong-fit", label: "Wrong fit" },
  { value: "duplicate", label: "Duplicate entry" },
  { value: "other", label: "Other" },
];

export function ManageInvestorCard({ investorId, investorName, investorStatus, roundSlug }: ManageInvestorCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { openRound } = useRounds();
  
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const isLostInvestor = investorStatus === "lost";

  const handleReactivate = async () => {
    if (!investorId) return;
    
    setIsReactivating(true);
    setStatus("loading");
    setStatusMessage("Reactivating investor...");
    
    try {
      // Update investor status back to prospect
      const { error: updateError } = await supabase
        .from("investors")
        .update({ status: "prospect" })
        .eq("id", investorId);
      
      if (updateError) throw updateError;
      
      // Generate a fresh access key for memo
      if (openRound?.id) {
        await supabase.functions.invoke("generate-access-key", {
          body: {
            roundId: openRound.id,
            tool: "memo",
            investorId: investorId,
          },
        });
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["memo-access-keys"] });
      queryClient.invalidateQueries({ queryKey: ["investor"] });
      
      setStatus("success");
      setStatusMessage(`${investorName || "Investor"} reactivated`);
      
      toast({ 
        title: "Investor reactivated",
        description: `${investorName || "Investor"} is back in the pipeline with a fresh access key`
      });
      
    } catch (error) {
      console.error("Failed to reactivate:", error);
      setStatus("error");
      setStatusMessage("Failed to reactivate investor");
      toast({ 
        title: "Failed to reactivate", 
        variant: "destructive" 
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const handleDelete = async () => {
    if (!investorId || !reason) return;
    
    setIsDeleting(true);
    setStatus("loading");
    setStatusMessage("Removing investor...");
    
    try {
      // Delete related access keys first
      await supabase
        .from("access_keys")
        .delete()
        .eq("investor_id", investorId);
      
      // Delete the investor
      const { error } = await supabase
        .from("investors")
        .delete()
        .eq("id", investorId);
      
      if (error) throw error;
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["investor-links"] });
      
      setStatus("success");
      setStatusMessage(`${investorName || "Investor"} removed`);
      
      toast({ 
        title: "Investor removed",
        description: `${investorName || "Investor"} has been removed from the pipeline`
      });
      
      // Navigate back to pipeline after short delay
      setTimeout(() => {
        navigate(`/${roundSlug}/pipeline`);
      }, 1500);
      
    } catch (error) {
      console.error("Failed to delete:", error);
      setStatus("error");
      setStatusMessage("Failed to remove investor");
      toast({ 
        title: "Failed to remove", 
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isValid = reason && (reason !== "other" || customReason.trim());

  return (
    <>
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-foreground" />
          <span className="text-sm font-medium">Manage Investor</span>
        </div>
        <div className="p-4 space-y-4">
          {investorName && (
            <p className="text-xs text-muted-foreground">{investorName}</p>
          )}
          
          {/* Reactivate section for lost investors */}
          {isLostInvestor && (
            <div className="space-y-3 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium">Reactivate Investor</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bring this investor back to your active pipeline with a fresh access key.
              </p>
              <Button
                onClick={handleReactivate}
                disabled={isReactivating || !investorId}
                variant="outline"
                className="w-full"
              >
                {isReactivating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reactivating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reactivate
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Remove section */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Removing this investor will delete them from your pipeline and revoke all access keys.
            </p>
            
            <div className="space-y-3">
              <Label className="text-xs font-medium">Reason for removing</Label>
              <RadioGroup value={reason} onValueChange={setReason}>
                {DELETE_REASONS.map((r) => (
                  <div key={r.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="text-sm font-normal cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            {reason === "other" && (
              <div className="space-y-2">
                <Label className="text-xs">Please specify</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="min-h-[80px] text-sm bg-transparent"
                />
              </div>
            )}
            
            <Button
              onClick={handleDelete}
              disabled={!isValid || isDeleting || !investorId}
              variant="destructive"
              className="w-full"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Investor"
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <StatusLine 
        status={status} 
        idleText={isLostInvestor ? "Reactivate or remove investor" : "Select a reason to remove"}
        loadingText={statusMessage}
        successText={statusMessage}
        errorText={statusMessage}
      />
    </>
  );
}
