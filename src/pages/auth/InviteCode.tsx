import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import circuitLogo from "@/assets/circuit-logo.png";
import { ArrowLeft, Loader2 } from "lucide-react";

// NO AUTH CHECK - renders instantly
export default function InviteCode() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [inviteCode, setInviteCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) return;
    
    setIsValidating(true);
    
    try {
      const { data, error } = await supabase.rpc('check_invite_code_valid', {
        p_code: inviteCode.trim().toUpperCase()
      });

      if (error) throw error;

      const result = data as { valid: boolean; error?: string };

      if (!result.valid) {
        toast({
          title: "Invalid code",
          description: result.error === "Code exhausted" 
            ? "This invite code has reached its usage limit."
            : result.error === "Code expired"
            ? "This invite code has expired."
            : "This invite code is not valid.",
          variant: "destructive",
        });
        return;
      }

      sessionStorage.setItem("validated_invite_code", inviteCode.trim().toUpperCase());
      navigate("/auth/email");
    } catch (error) {
      console.error("Error validating code:", error);
      toast({
        title: "Error",
        description: "Failed to validate invite code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="h-6 mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          <div className="h-10 flex items-center justify-center mb-8">
            <img src={circuitLogo} alt="Circuit" className="h-8" />
          </div>

          <div className="min-h-[200px] space-y-4">
            <Input
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="h-12 text-center tracking-[0.15em] uppercase"
              onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
              autoFocus
            />
            <Button
              onClick={handleValidateCode}
              disabled={!inviteCode.trim() || isValidating}
              className="w-full h-12"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>

      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © 2025 Circuit.{" "}
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>.{" "}
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>.{" "}
          <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>.
        </p>
      </footer>
    </div>
  );
}
