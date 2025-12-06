import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRounds, ROUND_TYPES, ROUND_TYPE_LABELS, RoundType } from "@/hooks/useRounds";
import { useDebounce } from "@/hooks/useDebounce";
import circuitLogo from "@/assets/circuit-logo.png";
import { ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";

type AuthStep = "email" | "password" | "create-password" | "profile" | "round";

export default function EmailAuth() {
  const navigate = useNavigate();
  const { user, isLoading, signInWithEmail, signUpWithEmail, refreshProfile } = useFounderAuth();
  const { toast } = useToast();
  const { createRound } = useRounds();

  // Auth state
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Profile state (onboarding)
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Round state (onboarding)
  const [roundType, setRoundType] = useState<RoundType>("s");
  const [instrumentType, setInstrumentType] = useState<"safe" | "note">("safe");
  const [targetRaise, setTargetRaise] = useState("");

  const debouncedSlug = useDebounce(companySlug, 500);

  // Check for valid invite code
  useEffect(() => {
    const inviteCode = sessionStorage.getItem("validated_invite_code");
    if (!inviteCode) {
      navigate("/auth/invite", { replace: true });
    }
  }, [navigate]);

  // Redirect if already logged in (and onboarded)
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user && !isLoading) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, company_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.onboarding_completed && profile?.company_name) {
          navigate("/circuit", { replace: true });
        } else if (step === "email" || step === "password" || step === "create-password") {
          // User just signed up, continue to profile step
          setStep("profile");
        }
      }
    };
    checkOnboardingStatus();
  }, [user, isLoading, navigate, step]);

  // Auto-generate slug from company name
  const slugify = useCallback((text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 20);
  }, []);

  useEffect(() => {
    if (companyName && slugStatus === "idle") {
      setCompanySlug(slugify(companyName));
    }
  }, [companyName, slugify, slugStatus]);

  // Check slug availability
  useEffect(() => {
    const checkSlugAvailability = async () => {
      if (!debouncedSlug || debouncedSlug.length < 3) {
        setSlugStatus("idle");
        return;
      }

      const slugRegex = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
      if (!slugRegex.test(debouncedSlug) || debouncedSlug.includes("--")) {
        setSlugStatus("taken");
        return;
      }

      setSlugStatus("checking");

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_slug", debouncedSlug)
        .neq("id", user?.id || "")
        .maybeSingle();

      if (error) {
        setSlugStatus("idle");
        return;
      }

      setSlugStatus(data ? "taken" : "available");
    };

    checkSlugAvailability();
  }, [debouncedSlug, user?.id]);

  const handleEmailSubmit = async () => {
    if (!email.trim()) return;

    setIsCheckingEmail(true);

    try {
      // Use edge function to properly check if user exists
      const { data, error } = await supabase.functions.invoke("check-user-exists", {
        body: { email: email.trim() },
      });

      if (error) {
        console.error("Error checking user:", error);
        // Fallback to create-password on error
        setStep("create-password");
      } else if (data?.exists) {
        setStep("password");
      } else {
        setStep("create-password");
      }
    } catch (error) {
      console.error("Error:", error);
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

      const { error } = await signUpWithEmail(email.trim(), password);

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Track invite code usage after successful signup
      if (inviteCode) {
        const { data: codeData } = await supabase
          .from("invite_codes")
          .select("id")
          .eq("code", inviteCode)
          .single();

        if (codeData) {
          await supabase.rpc("increment_invite_code_usage", { code_value: inviteCode });

          const { data: { user: newUser } } = await supabase.auth.getUser();

          await supabase.from("invite_code_uses").insert({
            invite_code_id: codeData.id,
            used_by: newUser?.id,
            ip_address: null,
            user_agent: navigator.userAgent,
            location: null,
          });
        }

        sessionStorage.removeItem("validated_invite_code");
      }

      // Continue to profile step
      setStep("profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (!fullName.trim() || !companyName.trim() || !companySlug || slugStatus !== "available") return;
    if (!user) return;

    setIsProfileSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          company_slug: companySlug,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      setStep("round");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleCreateRound = async () => {
    if (!user) return;

    const roundLabel = ROUND_TYPE_LABELS[roundType];
    const slug = slugify(roundLabel);

    try {
      // Mark onboarding as complete
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      await createRound.mutateAsync({
        name: roundLabel,
        slug,
        instrument_type: instrumentType,
        target_raise: targetRaise ? parseFloat(targetRaise) : undefined,
        round_type: roundType,
      });

      await refreshProfile();
      navigate("/thesis");
    } catch (error) {
      console.error("Error creating round:", error);
      toast({
        title: "Error",
        description: "Failed to create round. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSlugChange = (value: string) => {
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20);
    setCompanySlug(cleanSlug);
    setSlugStatus("idle");
  };

  const handleBack = () => {
    if (step === "email") {
      navigate("/auth/invite");
    } else if (step === "password" || step === "create-password") {
      setStep("email");
      setPassword("");
      setConfirmPassword("");
    } else if (step === "round") {
      setStep("profile");
    }
    // Can't go back from profile step after signup
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
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Fixed header - same height on all pages */}
          <div className="h-6 mb-6">
            {(step === "email" || step === "password" || step === "create-password" || step === "round") && (
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          {/* Logo - fixed height container */}
          <div className="h-10 flex items-center justify-center mb-8">
            <img src={circuitLogo} alt="Thesis" className="h-8" />
          </div>

          {/* Form area */}
          <div className="min-h-[280px]">
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
                  Create your account
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

            {/* Profile Step (Onboarding) */}
            {step === "profile" && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="font-heading text-xl font-semibold">Tell us about you</h2>
                  <p className="text-sm text-muted-foreground mt-1">Set up your workspace</p>
                </div>

                <div className="space-y-4 bg-card border border-border rounded-lg p-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Your name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company name</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Inc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companySlug">URL slug</Label>
                    <div className="relative">
                      <Input
                        id="companySlug"
                        placeholder="acme"
                        value={companySlug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        className={
                          slugStatus === "taken"
                            ? "border-destructive pr-10"
                            : slugStatus === "available"
                            ? "border-green-500 pr-10"
                            : "pr-10"
                        }
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugStatus === "checking" && (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                        {slugStatus === "available" && <Check className="w-4 h-4 text-green-500" />}
                        {slugStatus === "taken" && <AlertCircle className="w-4 h-4 text-destructive" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      thesis.run/<span className="font-mono">{companySlug || "slug"}</span>/...
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleProfileSubmit}
                    disabled={
                      !fullName.trim() ||
                      !companyName.trim() ||
                      !companySlug ||
                      slugStatus !== "available" ||
                      isProfileSaving
                    }
                  >
                    {isProfileSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Round Step (Onboarding) */}
            {step === "round" && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="font-heading text-xl font-semibold">Start your first raise</h2>
                  <p className="text-sm text-muted-foreground mt-1">Set up your fundraising round</p>
                </div>

                <div className="space-y-4 bg-card border border-border rounded-lg p-5">
                  <div className="space-y-2">
                    <Label>Round type</Label>
                    <Select value={roundType} onValueChange={(v: RoundType) => setRoundType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROUND_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {ROUND_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Instrument</Label>
                    <Select value={instrumentType} onValueChange={(v: "safe" | "note") => setInstrumentType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safe">SAFE</SelectItem>
                        <SelectItem value="note">Convertible Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target">Target raise (optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="target"
                        type="number"
                        placeholder="1,000,000"
                        value={targetRaise}
                        onChange={(e) => setTargetRaise(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreateRound}
                    disabled={createRound.isPending}
                  >
                    {createRound.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create your raise"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © 2025 Thesis.{" "}
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          .{" "}
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          .{" "}
          <Link to="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
