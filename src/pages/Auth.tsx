import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { FeatureStream } from "@/components/FeatureStream";
import thesisLogo from "@/assets/thesis-logo-2.png";

export default function Auth() {
  const { user, isLoading } = useFounderAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/thesis", { replace: true });
    }
  }, [user, isLoading, navigate]);

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
            <img src={thesisLogo} alt="Thesis" className="h-9 mx-auto" />
            <p className="text-muted-foreground font-medium">
              Run Your Raise
            </p>
          </div>

          {/* Get Access Button */}
          <div className="flex justify-center pt-2">
            <Link
              to="/auth/invite"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 border border-border px-5 py-2 rounded-md"
            >
              Get Access
            </Link>
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
