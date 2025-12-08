import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2 } from "lucide-react";
import { StatusLine } from "./StatusLine";

interface ManageInvestorCardProps {
  investorId?: string;
  investorName?: string;
  roundSlug?: string;
}

const DELETE_REASONS = [
  { value: "lost-interest", label: "Lost interest" },
  { value: "wrong-fit", label: "Wrong fit" },
  { value: "duplicate", label: "Duplicate entry" },
  { value: "other", label: "Other" },
];

export function ManageInvestorCard({ investorId, investorName, roundSlug }: ManageInvestorCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

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
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />
            Remove Investor
          </CardTitle>
          {investorName && (
            <p className="text-xs text-muted-foreground">{investorName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
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
                className="min-h-[80px] text-sm"
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
        </CardContent>
      </Card>
      
      <StatusLine 
        status={status} 
        idleText="Select a reason to remove"
        loadingText={statusMessage}
        successText={statusMessage}
        errorText={statusMessage}
      />
    </>
  );
}
