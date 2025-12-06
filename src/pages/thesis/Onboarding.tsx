import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { useRounds, ROUND_TYPES, ROUND_TYPE_LABELS, RoundType } from "@/hooks/useRounds";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

type OnboardingStep = "company" | "round";

export default function Onboarding() {
  const navigate = useNavigate();
  const { rounds, isLoading: roundsLoading, createRound } = useRounds();
  const { user, isLoading: authLoading } = useFounderAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<OnboardingStep>("company");
  
  // User details
  const [fullName, setFullName] = useState("");
  
  // Company details
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Round details
  const [roundType, setRoundType] = useState<RoundType>("s");
  const [instrumentType, setInstrumentType] = useState<"safe" | "note">("safe");
  const [targetRaise, setTargetRaise] = useState("");

  const debouncedSlug = useDebounce(companySlug, 500);

  // Auto-generate slug from company name
  const slugify = useCallback((text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 20);
  }, []);

  // Update slug when company name changes (if user hasn't manually edited)
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

      // Validate format
      const slugRegex = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
      if (!slugRegex.test(debouncedSlug) || debouncedSlug.includes('--')) {
        setSlugStatus("taken"); // Invalid format
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
        console.error("Error checking slug:", error);
        setSlugStatus("idle");
        return;
      }

      setSlugStatus(data ? "taken" : "available");
    };

    checkSlugAvailability();
  }, [debouncedSlug, user?.id]);

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, company_name, company_slug")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile?.onboarding_completed && profile?.company_name) {
        if (rounds.length > 0) {
          navigate(`/thesis/${rounds[0].slug}/memo/global`, { replace: true });
        } else {
          setStep("round");
        }
      }
    };
    
    if (!authLoading && !roundsLoading) {
      checkOnboarding();
    }
  }, [user, authLoading, roundsLoading, rounds, navigate]);

  // Redirect to first round if user already has rounds
  useEffect(() => {
    if (!roundsLoading && rounds.length > 0) {
      const firstRound = rounds[0];
      navigate(`/thesis/${firstRound.slug}/memo/global`, { replace: true });
    }
  }, [rounds, roundsLoading, navigate]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSlugChange = (value: string) => {
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20);
    setCompanySlug(cleanSlug);
    setSlugStatus("idle");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/markdown'
      ];
      return validTypes.includes(file.type) || file.name.endsWith('.md');
    });
    
    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: "Some files skipped",
        description: "Only PDF, DOCX, PPTX, TXT, and MD files are supported.",
        variant: "destructive",
      });
    }
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompanySubmit = async () => {
    if (!fullName.trim() || !companyName.trim() || !companySlug || slugStatus !== "available") return;
    if (!user) return;

    setIsUploading(true);

    try {
      // Upload files if any
      const uploadedFilePaths: string[] = [];
      for (const file of files) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("pitch-decks")
          .upload(filePath, file);
        
        if (!uploadError) {
          uploadedFilePaths.push(filePath);
        }
      }

      // Update profile with user and company details
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          company_slug: companySlug,
          website: website.trim() || null,
          description: description.trim() || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setStep("round");
    } catch (error) {
      console.error("Error saving company details:", error);
      toast({
        title: "Error",
        description: "Failed to save company details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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

      navigate(`/thesis/${slug}/memo/global`);
    } catch (error) {
      console.error("Error creating round:", error);
      toast({
        title: "Error",
        description: "Failed to create round. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || roundsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="w-96 h-96" />
      </div>
    );
  }

  // Don't render form if user has rounds (will redirect)
  if (rounds.length > 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Company Step */}
        {step === "company" && (
          <>
            <div className="text-center space-y-2">
              <h1 className="font-heading text-3xl font-bold">Tell us about your startup</h1>
              <p className="text-muted-foreground">
                This helps us personalize your fundraising experience
              </p>
            </div>

            <div className="space-y-6 bg-card border border-border rounded-lg p-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Your name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company name *</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySlug">URL slug *</Label>
                <div className="relative">
                  <Input
                    id="companySlug"
                    placeholder="acme"
                    value={companySlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={
                      slugStatus === "taken" ? "border-destructive pr-10" :
                      slugStatus === "available" ? "border-green-500 pr-10" : "pr-10"
                    }
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {slugStatus === "checking" && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {slugStatus === "available" && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {slugStatus === "taken" && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your memos will be at: <span className="font-mono">thesis.run/{companySlug || "your-slug"}/...</span>
                </p>
                {slugStatus === "taken" && (
                  <p className="text-xs text-destructive">
                    This slug is taken or invalid. Try another.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://acme.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">What does your startup do?</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product, market, and what makes you unique..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Upload existing materials (optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Drop in any pitch deck, memo, or documents about your startup. Our AI will use these to draft your memo.
                </p>
                
                <div className="border border-dashed border-border rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.docx,.pptx,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, PPTX, TXT, MD
                    </p>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-foreground p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                className="w-full" 
                onClick={handleCompanySubmit}
                disabled={!fullName.trim() || !companyName.trim() || !companySlug || slugStatus !== "available" || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </>
        )}

        {/* Round Step */}
        {step === "round" && (
          <>
            <div className="text-center space-y-2">
              <h1 className="font-heading text-3xl font-bold">Define your round</h1>
              <p className="text-muted-foreground">
                Set up your first fundraising round
              </p>
            </div>

            <div className="space-y-6 bg-card border border-border rounded-lg p-6">
              <div className="space-y-2">
                <Label>Round type *</Label>
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
                <p className="text-xs text-muted-foreground">
                  URL code: <span className="font-mono">{roundType}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Instrument type</Label>
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
                {createRound.isPending ? "Creating..." : "Create your raise"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
