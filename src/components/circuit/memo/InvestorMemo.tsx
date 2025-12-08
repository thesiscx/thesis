import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { 
  Copy, 
  ExternalLink, 
  RefreshCw,
  Calendar,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface InvestorMemoProps {
  roundSlug?: string;
  investorSlug?: string;
  onAccessKeyLoaded?: (accessKeyId: string) => void;
}

export default function InvestorMemo({ roundSlug, investorSlug, onAccessKeyLoaded }: InvestorMemoProps) {
  const { user, profile } = useFounderAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Fetch round
  const { data: roundData, isLoading: roundLoading } = useQuery({
    queryKey: ["round", roundSlug, user?.id],
    queryFn: async () => {
      if (!roundSlug || !user?.id) return null;
      
      const { data, error } = await supabase
        .from("rounds")
        .select("id, name, slug, workspace_id")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundSlug && !!user?.id,
  });

  // Fetch investor by slug
  const { data: investor, isLoading: investorLoading } = useQuery({
    queryKey: ["investor", investorSlug, roundData?.workspace_id],
    queryFn: async () => {
      if (!investorSlug || !roundData?.workspace_id) return null;
      
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .eq("slug", investorSlug)
        .eq("workspace_id", roundData.workspace_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!investorSlug && !!roundData?.workspace_id,
  });

  // Fetch access key for this investor + round + memo
  const { data: accessKey, isLoading: accessKeyLoading, refetch: refetchAccessKey } = useQuery({
    queryKey: ["access-key-memo", roundData?.id, investor?.id],
    queryFn: async () => {
      if (!roundData?.id || !investor?.id) return null;
      
      const { data, error } = await supabase
        .from("access_keys")
        .select("*")
        .eq("round_id", roundData.id)
        .eq("investor_id", investor.id)
        .eq("tool", "memo")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundData?.id && !!investor?.id,
  });

  // Notify parent when access key is loaded
  useEffect(() => {
    if (accessKey?.id && onAccessKeyLoaded) {
      onAccessKeyLoaded(accessKey.id);
    }
  }, [accessKey?.id, onAccessKeyLoaded]);

  // Track if we've already attempted generation
  const hasAttemptedGeneration = useRef(false);

  // Combined loading state - all dependencies must be loaded
  const isLoadingDependencies = roundLoading || investorLoading || accessKeyLoading || isGeneratingKey;

  // Auto-generate access key if missing (only once per mount)
  useEffect(() => {
    const generateKey = async () => {
      // Wait for all queries to complete first
      if (roundLoading || investorLoading || accessKeyLoading) return;
      // Skip if already attempted, key exists, or already generating
      if (hasAttemptedGeneration.current || accessKey || isGeneratingKey) return;
      // Need round and investor data
      if (!roundData?.id || !investor?.id) return;
      
      hasAttemptedGeneration.current = true;
      setIsGeneratingKey(true);
      
      try {
        await supabase.functions.invoke("generate-access-key", {
          body: {
            roundId: roundData.id,
            tool: "memo",
            investorId: investor.id,
          },
        });
        await refetchAccessKey();
        toast({ title: "Access key generated" });
      } catch (error) {
        console.error("Failed to generate access key:", error);
        hasAttemptedGeneration.current = false; // Allow retry on error
      } finally {
        setIsGeneratingKey(false);
      }
    };
    
    generateKey();
  }, [roundData?.id, investor?.id, roundLoading, investorLoading, accessKeyLoading, accessKey, isGeneratingKey, refetchAccessKey, toast]);

  const shareUrl = profile?.company_slug && roundData?.slug && investorSlug
    ? `${window.location.origin}/share/${profile.company_slug}/${roundData.slug}/memo/${investorSlug}`
    : null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleRevokeAccess = async () => {
    if (!accessKey) return;
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from("access_keys")
        .update({ status: accessKey.status === 'revoked' ? 'active' : 'revoked' })
        .eq("id", accessKey.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["access-key-memo", roundData?.id, investor?.id] });
      toast({ title: accessKey.status === 'revoked' ? "Access restored" : "Access revoked" });
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefreshKey = async () => {
    if (!roundData?.id || !investor?.id) return;
    setIsUpdating(true);
    
    try {
      // First revoke the old key
      if (accessKey) {
        await supabase
          .from("access_keys")
          .update({ status: 'revoked' })
          .eq("id", accessKey.id);
      }
      
      // Generate new key
      const { data, error } = await supabase.functions.invoke("generate-access-key", {
        body: { 
          roundId: roundData.id, 
          investorId: investor.id,
          tool: "memo" 
        }
      });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["access-key-memo", roundData?.id, investor?.id] });
      toast({ title: "New access key generated" });
    } catch (error) {
      toast({ title: "Failed to refresh key", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetExpiry = async (date: Date | undefined) => {
    if (!accessKey) return;
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from("access_keys")
        .update({ expires_at: date ? date.toISOString() : null })
        .eq("id", accessKey.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["access-key-memo", roundData?.id, investor?.id] });
      toast({ title: date ? `Expiry set to ${format(date, "MMM d, yyyy")}` : "Expiry removed" });
    } catch (error) {
      toast({ title: "Failed to update expiry", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = () => {
    // Show loading while any dependency is still loading
    if (isLoadingDependencies) {
      return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Loading...</Badge>;
    }
    if (!accessKey) return <Badge variant="outline">No Access Key</Badge>;
    if (accessKey.status === 'revoked') return <Badge variant="destructive">Revoked</Badge>;
    if (accessKey.status === 'voided') return <Badge className="bg-muted text-muted-foreground border-muted">Voided</Badge>;
    if (accessKey.expires_at && new Date(accessKey.expires_at) < new Date()) {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Expired</Badge>;
    }
    return <Badge className="bg-green-600/10 text-green-700 border-green-600/20">Active</Badge>;
  };

  // Show skeleton while loading parent dependencies
  if (roundLoading || investorLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const investorName = investor?.name || investorSlug?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Investor";

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold mb-1">
              {investorName}
            </h1>
            {getStatusBadge()}
          </div>
        </div>

        <Separator />

        {/* Share Link, Access Key & Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL */}
            {shareUrl && (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary/50 px-3 py-2 rounded border border-border break-all">
                  {shareUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(shareUrl, "URL")}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Access Key */}
            {accessKey && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Access Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-secondary/50 px-3 py-2 rounded border border-border font-mono">
                    {accessKey.key}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(accessKey.key, "Access key")}
                    className="shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <Separator />
            
            {/* Access Controls - Inline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Revoke Access</Label>
                  <p className="text-xs text-muted-foreground">
                    Prevent this investor from accessing
                  </p>
                </div>
                <Switch
                  checked={accessKey?.status === 'revoked'}
                  onCheckedChange={handleRevokeAccess}
                  disabled={isUpdating || !accessKey}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Refresh Key</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate new key, invalidate old
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshKey}
                  disabled={isUpdating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Set Expiry</Label>
                  <p className="text-xs text-muted-foreground">
                    {accessKey?.expires_at 
                      ? `Expires ${format(new Date(accessKey.expires_at), "MMM d, yyyy")}`
                      : "No expiry set"}
                  </p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdating || !accessKey}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {accessKey?.expires_at ? "Change" : "Set"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={accessKey?.expires_at ? new Date(accessKey.expires_at) : undefined}
                      onSelect={handleSetExpiry}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                    {accessKey?.expires_at && (
                      <div className="p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => handleSetExpiry(undefined)}
                        >
                          Remove Expiry
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investor Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <p>{investorName}</p>
            </div>
            {investor?.email && (
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p>{investor.email}</p>
              </div>
            )}
            {investor?.entity_type && (
              <div>
                <Label className="text-muted-foreground text-xs">Entity Type</Label>
                <p className="capitalize">{investor.entity_type}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
