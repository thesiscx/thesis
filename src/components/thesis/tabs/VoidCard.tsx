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
import { AlertTriangle, Loader2 } from "lucide-react";
import { StatusLine } from "./StatusLine";

interface VoidCardProps {
  accessKeyId?: string;
  investorName?: string;
  roundSlug?: string;
  tool: "memo" | "docket";
}

const VOID_REASONS = [
  { value: "no-longer-interested", label: "No longer interested" },
  { value: "duplicate-entry", label: "Duplicate entry" },
  { value: "incorrect-information", label: "Incorrect information" },
  { value: "other", label: "Other" },
];

export function VoidCard({ accessKeyId, investorName, roundSlug, tool }: VoidCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleVoid = async () => {
    if (!accessKeyId || !reason) return;
    
    setIsVoiding(true);
    setStatus("loading");
    setStatusMessage("Voiding access...");
    
    try {
      const { error } = await supabase
        .from("access_keys")
        .update({ 
          status: "voided",
        })
        .eq("id", accessKeyId);
      
      if (error) throw error;
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["access-keys"] });
      queryClient.invalidateQueries({ queryKey: ["investor-links"] });
      
      setStatus("success");
      setStatusMessage(`${investorName || "Investor"} access voided`);
      
      toast({ 
        title: "Access voided",
        description: `${investorName || "Investor"} can no longer access this ${tool}`
      });
      
      // Navigate back to parent page after short delay
      setTimeout(() => {
        navigate(`/${roundSlug}/${tool}`);
      }, 1500);
      
    } catch (error) {
      console.error("Failed to void:", error);
      setStatus("error");
      setStatusMessage("Failed to void access");
      toast({ 
        title: "Failed to void", 
        variant: "destructive" 
      });
    } finally {
      setIsVoiding(false);
    }
  };

  const isValid = reason && (reason !== "other" || customReason.trim());

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Void Access
          </CardTitle>
          {investorName && (
            <p className="text-xs text-muted-foreground">{investorName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Voiding will permanently revoke this investor's access. This action cannot be undone.
          </p>
          
          <div className="space-y-3">
            <Label className="text-xs font-medium">Reason for voiding</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {VOID_REASONS.map((r) => (
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
            onClick={handleVoid}
            disabled={!isValid || isVoiding || !accessKeyId}
            variant="destructive"
            className="w-full"
          >
            {isVoiding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Voiding...
              </>
            ) : (
              "Void Access"
            )}
          </Button>
        </CardContent>
      </Card>
      
      <StatusLine 
        status={status} 
        idleText="Select a reason to void"
        loadingText={statusMessage}
        successText={statusMessage}
        errorText={statusMessage}
      />
    </>
  );
}
