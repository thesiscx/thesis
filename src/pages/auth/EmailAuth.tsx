import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import thesisLogo from "@/assets/thesis-logo.png";
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
      navigate("/auth", { replace: true });
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
      // Try to sign in with a dummy password to check if user exists
      // This is a common pattern to check user existence
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: "check_if_user_exists_dummy_password_12345",
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          // User exists but wrong password - show password field
          setStep("password");
        } else if (error.message.includes("Email not confirmed")) {
          // User exists but email not confirmed
          setStep("password");
        } else {
          // User doesn't exist - show create password
          setStep("create-password");
        }
      } else {
        // Unlikely but user signed in with dummy password
        setStep("password");
      }
    } catch (error) {
      // Fallback: assume new user
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
      // Increment invite code usage
      const inviteCode = sessionStorage.getItem("validated_invite_code");
      if (inviteCode) {
        await supabase
          .from("invite_codes")
          .update({ used_count: supabase.rpc ? 1 : 1 }) // Will be updated via trigger
          .eq("code", inviteCode);
      }

      const { error } = await signUpWithEmail(email.trim(), password);

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Clear invite code from session
        sessionStorage.removeItem("validated_invite_code");
        // Navigation will happen automatically via auth state change
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === "email") {
      navigate("/auth");
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 -mt-16">
      <div className="w-full max-w-sm space-y-6">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Logo */}
        <div className="text-center">
          <img src={thesisLogo} alt="Thesis" className="h-10 mx-auto" />
        </div>

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
              Welcome back! Enter your password to sign in.
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
              Create a password to set up your account.
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
  );
}
