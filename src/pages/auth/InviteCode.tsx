import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import thesisLogo from "@/assets/thesis-logo.png";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function InviteCode() {
  const navigate = useNavigate();
  const { user, isLoading } = useFounderAuth();
  const { toast } = useToast();

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

      if (data.max_uses && data.used_count >= data.max_uses) {
        toast({
          title: "Code exhausted",
          description: "This invite code has reached its usage limit.",
          variant: "destructive",
        });
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast({
          title: "Code expired",
          description: "This invite code has expired.",
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Fixed header - same height on all pages */}
          <div className="h-6 mb-6">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          {/* Logo - fixed height container */}
          <div className="h-10 flex items-center justify-center mb-8">
            <img src={thesisLogo} alt="Thesis" className="h-8" />
          </div>

          {/* Form area - fixed min height */}
          <div className="min-h-[140px] space-y-4">
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
