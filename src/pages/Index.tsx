import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FeatureStream } from "@/components/FeatureStream";
import circuitLogo from "@/assets/circuit-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

// Root page - shows auth for unauthenticated users, redirects authenticated users to /app
export default function Index() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[Index] Session check:", !!session);
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[Index] Auth state change:", event, !!session);
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading skeleton while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Skeleton className="h-14 w-full" />
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    );
  }

  // If authenticated, redirect to /app which handles smart redirect within auth context
  if (session) {
    return <Navigate to="/app" replace />;
  }

  // If not authenticated, show landing page
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
