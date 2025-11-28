import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import thesisLogo from "@/assets/thesis-logo-2.png";
import { ArrowLeft, Loader2 } from "lucide-react";

type AuthStep = "email" | "password" | "create-password";

export default function EmailAuth() {
  const navigate = useNavigate();
  const { user, isLoading, signInWithEmail, signUpWithEmail } = useFounderAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Check for valid invite code
  useEffect(() => {
    const inviteCode = sessionStorage.getItem("validated_invite_code");
    if (!inviteCode) {
      navigate("/auth/invite", { replace: true });
    }
  }, [navigate]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/thesis", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleEmailSubmit = async () => {
    if (!email.trim()) return;

    setIsCheckingEmail(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: "check_if_user_exists_dummy_password_12345",
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setStep("password");
        } else if (error.message.includes("Email not confirmed")) {
          setStep("password");
        } else {
          setStep("create-password");
        }
      } else {
        setStep("password");
      }
    } catch (error) {
      setStep("create-password");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;

    setIsSubmitting(true);

    try {
      const { error } = await signInWithEmail(email.trim(), password);

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password || password !== confirmPassword) return;

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const inviteCode = sessionStorage.getItem("validated_invite_code");
      if (inviteCode) {
        await supabase
          .from("invite_codes")
          .update({ used_count: 1 })
          .eq("code", inviteCode)
          .select()
          .then(async ({ data }) => {
            if (data && data[0]) {
              await supabase
                .from("invite_codes")
                .update({ used_count: (data[0].used_count || 0) + 1 })
                .eq("code", inviteCode);
            }
          });
      }

      const { error } = await signUpWithEmail(email.trim(), password);

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        sessionStorage.removeItem("validated_invite_code");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === "email") {
      navigate("/auth/invite");
    } else {
      setStep("email");
      setPassword("");
      setConfirmPassword("");
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
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          {/* Logo - fixed height container */}
          <div className="h-10 flex items-center justify-center mb-8">
            <img src={thesisLogo} alt="Thesis" className="h-8" />
          </div>

          {/* Form area - fixed min height to prevent shift */}
          <div className="min-h-[200px]">
            {/* Email Step */}
            {step === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                    className="h-12"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleEmailSubmit}
                  disabled={!email.trim() || isCheckingEmail}
                  className="w-full h-12"
                >
                  {isCheckingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            )}

            {/* Sign In Step */}
            {step === "password" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Welcome back! Enter your password.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    className="h-12"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleSignIn}
                  disabled={!password || isSubmitting}
                  className="w-full h-12"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            )}

            {/* Create Account Step */}
            {step === "create-password" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Create a password for your account.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                    className="h-12"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords don't match</p>
                  )}
                </div>
                <Button
                  onClick={handleSignUp}
                  disabled={!password || !confirmPassword || password !== confirmPassword || isSubmitting}
                  className="w-full h-12"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            )}
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
