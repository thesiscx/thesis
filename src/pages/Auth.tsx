import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { FeatureStream } from "@/components/FeatureStream";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import thesisLogo from "@/assets/thesis-logo.png";

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
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 -mt-12">
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

          {/* Get Access Button & Dropdown */}
          <div className="flex justify-center pt-2">
            <div className="relative flex flex-col items-center">
              <button
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 border border-border px-5 py-2 rounded-md`}
              >
                Get Access
              </button>

              {showCodeInput && (
                <div className="absolute top-[calc(100%+8px)] animate-fade-in">
                  {/* Small triangle connector */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-l border-t border-border bg-card" />
                  <div className="w-[220px] border border-border rounded-md bg-card p-4 space-y-3 relative">
                    <Input
                      placeholder="Invite code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="h-10 text-center text-[10px] tracking-[0.25em] uppercase bg-background placeholder:text-[10px]"
                      onKeyDown={(e) => e.key === "Enter" && handleValidateCode()}
                      autoFocus
                    />
                    <Button
                      onClick={handleValidateCode}
                      disabled={!inviteCode.trim() || isValidating}
                      className="w-full h-10 text-sm"
                    >
                      {isValidating ? "..." : "Continue"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © 2025 Thesis.{" "}
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>.{" "}
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>.{" "}
          <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>.
        </p>
      </footer>
    </div>
  );
}
