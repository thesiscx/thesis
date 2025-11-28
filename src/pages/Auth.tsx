import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { FeatureStream } from "@/components/FeatureStream";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import thesisLogo from "@/assets/thesis-logo.png";
import { ChevronDown } from "lucide-react";

export default function Auth() {
  const { user, isLoading } = useFounderAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/thesis", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) return;
    
    setIsValidating(true);
    
    try {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("code", inviteCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Invalid code",
          description: "This invite code is not valid.",
          variant: "destructive",
        });
        return;
      }

      // Check if code has uses remaining
      if (data.max_uses && data.used_count >= data.max_uses) {
        toast({
          title: "Code exhausted",
          description: "This invite code has reached its usage limit.",
          variant: "destructive",
        });
        return;
      }

      // Check if code is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast({
          title: "Code expired",
          description: "This invite code has expired.",
          variant: "destructive",
        });
        return;
      }

      // Store the validated code in session storage for the email auth flow
      sessionStorage.setItem("validated_invite_code", inviteCode.trim().toUpperCase());
      
      // Navigate to email auth
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 -mt-16">
      <div className="w-full max-w-sm space-y-6">
        {/* Feature Stream */}
        <FeatureStream />
        
        {/* Logo & Tagline */}
        <div className="text-center space-y-2">
          <img src={thesisLogo} alt="Thesis" className="h-10 mx-auto" />
          <p className="text-muted-foreground font-medium">
            Run Your Raise
          </p>
        </div>

        {/* Get Access Button & Code Input */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={() => setShowCodeInput(!showCodeInput)}
            variant="outline"
            className="w-full h-12 text-base gap-2"
          >
            Get Access
            <ChevronDown className={`w-4 h-4 transition-transform ${showCodeInput ? 'rotate-180' : ''}`} />
          </Button>

          {showCodeInput && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <Input
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="h-12 text-center text-base tracking-widest uppercase"
                onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                autoFocus
              />
              <Button
                onClick={handleValidateCode}
                disabled={!inviteCode.trim() || isValidating}
                className="w-full h-10"
              >
                {isValidating ? "Validating..." : "Continue"}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
