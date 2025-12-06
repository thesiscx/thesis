import { useNavigate } from "react-router-dom";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Globe, ExternalLink, AlertCircle } from "lucide-react";

export default function CustomDomain() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, profileLoaded, companySlug } = useFounderAuth();

  if (authLoading || !profileLoaded) {
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
          <Button onClick={() => navigate("/")}>Go to Login</Button>
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
          <h1 className="text-2xl font-heading font-semibold mb-1">Custom Domain</h1>
          <p className="text-muted-foreground text-sm">Connect your own domain for investor access</p>
        </div>

        <div className="space-y-6">
          {/* Current URL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Current Investor URL
              </CardTitle>
              <CardDescription>This is where your investors access their documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono">
                  circuit.cx/share/{companySlug || "your-company"}
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Custom Domain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Domain</CardTitle>
              <CardDescription>
                Use your own domain like investors.yourcompany.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-dashed">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Coming Soon</p>
                  <p>Custom domain configuration will be available in a future update. For now, your investors can access documents via your Circuit URL.</p>
                </div>
              </div>

              <div className="space-y-2 opacity-50 pointer-events-none">
                <Label htmlFor="domain">Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    placeholder="investors.yourcompany.com"
                    disabled
                  />
                  <Button disabled>
                    Connect
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll need to add DNS records to verify ownership
                </p>
              </div>
            </CardContent>
          </Card>

          {/* DNS Instructions Preview */}
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="text-base">DNS Configuration</CardTitle>
              <CardDescription>Add these records to your domain registrar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-secondary/30 p-4 font-mono text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>CNAME</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span>investors</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value</span>
                  <span>custom.circuit.run</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
