import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Check, X } from "lucide-react";
import { z } from "zod";

const companySlugSchema = z.string()
  .min(3, "Slug must be at least 3 characters")
  .max(20, "Slug must be 20 characters or less")
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must start and end with a letter or number, and can only contain lowercase letters, numbers, and hyphens");

export default function FounderSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, profileLoaded } = useFounderAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [originalSlug, setOriginalSlug] = useState("");

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (authLoading || !profileLoaded) return;
      
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('company_name, company_slug, description, website')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
        }

        if (data) {
          setCompanyName(data.company_name || "");
          setCompanySlug(data.company_slug || "");
          setOriginalSlug(data.company_slug || "");
          setDescription(data.description || "");
          setWebsite(data.website || "");
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading, profileLoaded]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!companySlug || companySlug === originalSlug) {
      setSlugAvailable(null);
      return;
    }

    const validation = companySlugSchema.safeParse(companySlug);
    if (!validation.success) {
      setSlugAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('company_slug', companySlug)
          .maybeSingle();

        if (error) throw error;
        setSlugAvailable(!data);
      } catch (error) {
        console.error('Error checking slug:', error);
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [companySlug, originalSlug]);

  const handleSlugChange = (value: string) => {
    // Auto-format: lowercase, replace spaces with hyphens
    const formatted = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setCompanySlug(formatted);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate slug if changed
    if (companySlug !== originalSlug) {
      const validation = companySlugSchema.safeParse(companySlug);
      if (!validation.success) {
        toast({
          title: "Invalid slug",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      if (!slugAvailable) {
        toast({
          title: "Slug unavailable",
          description: "This URL slug is already taken. Please choose another.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      // Use upsert to handle case where profile doesn't exist
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          company_name: companyName,
          company_slug: companySlug,
          description,
          website,
        }, { onConflict: 'id' });

      if (error) throw error;

      setOriginalSlug(companySlug);
      
      toast({
        title: "Settings saved",
        description: "Your company settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !profileLoaded || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to access settings</p>
          <Button onClick={() => navigate("/auth")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl py-8 px-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2 hover:bg-secondary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-semibold mb-1">Company Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your company profile and public URL</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Details</CardTitle>
              <CardDescription>This information appears on your shared documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your company do?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Public URL</CardTitle>
              <CardDescription>
                This is the URL slug used for your shared memos and dockets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companySlug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center flex-1 rounded-md border bg-muted/50">
                    <span className="px-3 text-sm text-muted-foreground whitespace-nowrap">
                      thesis.run/
                    </span>
                    <Input
                      id="companySlug"
                      value={companySlug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="acme"
                      className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="w-8 flex items-center justify-center">
                    {checkingSlug && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!checkingSlug && slugAvailable === true && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    {!checkingSlug && slugAvailable === false && companySlug !== originalSlug && (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  3-20 characters, lowercase letters, numbers, and hyphens only
                </p>
                {!checkingSlug && slugAvailable === false && companySlug !== originalSlug && (
                  <p className="text-xs text-destructive">
                    This slug is already taken
                  </p>
                )}
              </div>

              {companySlug && (
                <div className="rounded-md border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Your public URLs will look like:</p>
                  <p className="text-sm font-mono">thesis.run/{companySlug}/s/memo/investor-name</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
