import { Link, useNavigate } from "react-router-dom";
import { FeatureStream } from "@/components/FeatureStream";
import circuitLogo from "@/assets/circuit-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// NO AUTH CHECK - renders instantly
export default function Auth() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[Auth Page] Session check:", !!session);
      setHasSession(!!session);
      // If user is logged in, redirect to app
      if (session) {
        navigate("/", { replace: true });
      }
    });
  }, [navigate]);

  const handleEmergencyLogout = async () => {
    console.log("[Auth Page] Emergency logout triggered");
    await supabase.auth.signOut();
    setHasSession(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 -mt-12">
        <div className="w-full max-w-sm space-y-6">
          <FeatureStream />
          
          <div className="text-center space-y-2">
            <img src={circuitLogo} alt="Circuit" className="h-8 mx-auto" />
            <p className="text-muted-foreground font-medium">
              Run Your Raise
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Link
              to="/auth/invite"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 border border-border px-5 py-2 rounded-md"
            >
              Get Access
            </Link>
          </div>

          {/* Emergency logout for stuck sessions */}
          {hasSession && (
            <div className="text-center pt-4 border-t border-border mt-6">
              <p className="text-xs text-muted-foreground mb-2">Already logged in?</p>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleEmergencyLogout}
              >
                Sign Out
              </Button>
            </div>
          )}
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
