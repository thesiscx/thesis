import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import thesisLogo from "@/assets/thesis-logo.png";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

type AuthStep = "email" | "password" | "signup" | "profile" | "round";

const ROUND_TYPES = ["Pre-Seed", "Seed", "Series A", "Series B", "Bridge"];
const INSTRUMENTS = ["SAFE", "Convertible Note", "Priced Equity"];

export default function EmailAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for invite code
  const [inviteCode] = useState(() => sessionStorage.getItem("validated_invite_code") || "");
  
  // Auth flow state
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Round state
  const [roundType, setRoundType] = useState("Pre-Seed");
  const [instrument, setInstrument] = useState("SAFE");
  const [targetRaise, setTargetRaise] = useState("");

  // Redirect if no invite code
  useEffect(() => {
    if (!inviteCode) {
      navigate("/auth/invite");
    }
  }, [inviteCode, navigate]);

  // Auto-generate slug from company name
  useEffect(() => {
    if (companyName && step === "profile") {
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setCompanySlug(slug);
      checkSlugAvailability(slug);
    }
  }, [companyName, step]);

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 2) {
      setIsSlugAvailable(null);
      return;
    }
    
    setIsCheckingSlug(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_slug", slug)
      .maybeSingle();
    
    setIsSlugAvailable(!data);
    setIsCheckingSlug(false);
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-user-exists", {
        body: { email: email.trim().toLowerCase() },
      });

      if (error) throw error;

      setIsExistingUser(data.exists);
      setStep(data.exists ? "password" : "signup");
    } catch (error) {
      console.error("Error checking user:", error);
      // Default to signup flow on error
      setStep("signup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      navigate("/", { replace: true });
    } catch (error) {
      console.error("Sign in error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Increment invite code usage
      await supabase.rpc("increment_invite_code_usage", { code_value: inviteCode });
      
      // Move to profile step
      setStep("profile");
    } catch (error) {
      console.error("Sign up error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (!fullName.trim() || !companyName.trim() || !companySlug.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (!isSlugAvailable) {
      toast({
        title: "Slug unavailable",
        description: "Please choose a different company slug.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          company_slug: companySlug.trim().toLowerCase(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setStep("round");
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Error",
        description: "Failed to save profile.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRound = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const roundSlug = `${roundType.toLowerCase().replace(/\s+/g, "-")}-1`;
      
      const { error } = await supabase.from("rounds").insert({
        name: roundType,
        slug: roundSlug,
        round_type: roundType,
        instrument_type: instrument,
        target_raise: targetRaise ? parseInt(targetRaise) * 1000000 : null,
        workspace_id: user.id,
        created_by: user.id,
        state: "open",
      });

      if (error) throw error;

      // Mark onboarding as complete
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      sessionStorage.removeItem("validated_invite_code");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Round creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create round.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "password" || step === "signup") setStep("email");
    else if (step === "profile") setStep("signup");
    else if (step === "round") setStep("profile");
    else navigate("/auth/invite");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="h-6 mb-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="h-10 flex items-center justify-center mb-8">
            <img src={thesisLogo} alt="Thesis" className="h-8" />
          </div>

          <div className="min-h-[280px] space-y-4">
            {step === "email" && (
              <>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                  autoFocus
                />
                <Button
                  onClick={handleEmailSubmit}
                  disabled={!email.trim() || isLoading}
                  className="w-full h-12"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                </Button>
              </>
            )}

            {step === "password" && (
              <>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Welcome back! Enter your password.
                </p>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button
                  onClick={handleSignIn}
                  disabled={!password || isLoading}
                  className="w-full h-12"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                </Button>
              </>
            )}

            {step === "signup" && (
              <>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your account
                </p>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12"
                  onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                />
                <Button
                  onClick={handleSignUp}
                  disabled={!password || !confirmPassword || isLoading}
                  className="w-full h-12"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                </Button>
              </>
            )}

            {step === "profile" && (
              <>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Set up your profile
                </p>
                <Input
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12"
                  autoFocus
                />
                <Input
                  placeholder="Company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-12"
                />
                <div className="space-y-1">
                  <Input
                    placeholder="Company slug"
                    value={companySlug}
                    onChange={(e) => {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setCompanySlug(slug);
                      checkSlugAvailability(slug);
                    }}
                    className="h-12"
                  />
                  {companySlug && (
                    <p className={`text-xs ${isSlugAvailable ? "text-green-600" : "text-destructive"}`}>
                      {isCheckingSlug ? "Checking..." : isSlugAvailable ? "Available" : "Already taken"}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleProfileSubmit}
                  disabled={!fullName.trim() || !companyName.trim() || !isSlugAvailable || isLoading}
                  className="w-full h-12"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
                </Button>
              </>
            )}

            {step === "round" && (
              <>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Set up your first round
                </p>
                <select
                  value={roundType}
                  onChange={(e) => setRoundType(e.target.value)}
                  className="w-full h-12 px-3 rounded-md border border-input bg-background"
                >
                  {ROUND_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="w-full h-12 px-3 rounded-md border border-input bg-background"
                >
                  {INSTRUMENTS.map((inst) => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Target raise (millions)"
                  value={targetRaise}
                  onChange={(e) => setTargetRaise(e.target.value)}
                  className="h-12"
                />
                <Button
                  onClick={handleCreateRound}
                  disabled={isLoading}
                  className="w-full h-12"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Started"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

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
