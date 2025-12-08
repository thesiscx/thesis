import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  FileSignature, 
  Check, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { logActivity } from "@/lib/activityLogger";

interface InvestorDocketProps {
  roundSlug?: string;
  investorSlug?: string;
  onAccessKeyLoaded?: (accessKeyId: string) => void;
}

export default function InvestorDocket({ roundSlug, investorSlug, onAccessKeyLoaded }: InvestorDocketProps) {
  const { user, profile } = useFounderAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [sideLetter, setSideLetter] = useState("");
  const [showSideLetterEdit, setShowSideLetterEdit] = useState(false);

  // Fetch round
  const { data: roundData } = useQuery({
    queryKey: ["round", roundSlug, user?.id],
    queryFn: async () => {
      if (!roundSlug || !user?.id) return null;
      
      const { data, error } = await supabase
        .from("rounds")
        .select("id, name, slug")
        .eq("slug", roundSlug)
        .eq("created_by", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundSlug && !!user?.id,
  });

  // Fetch investor by slug
  const { data: investor } = useQuery({
    queryKey: ["investor", investorSlug, roundData?.id],
    queryFn: async () => {
      if (!investorSlug || !roundData?.id) return null;
      
      // First get workspace_id from round
      const { data: round } = await supabase
        .from("rounds")
        .select("workspace_id")
        .eq("id", roundData.id)
        .single();
      
      if (!round) return null;
      
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .eq("slug", investorSlug)
        .eq("workspace_id", round.workspace_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!investorSlug && !!roundData?.id,
  });

  // Fetch docket for this investor and round
  const { data: docket, isLoading: docketLoading } = useQuery({
    queryKey: ["docket", roundData?.id, investor?.id],
    queryFn: async () => {
      if (!roundData?.id || !investor?.id) return null;
      
      const { data, error } = await supabase
        .from("dockets")
        .select("*")
        .eq("round_id", roundData.id)
        .eq("investor_id", investor.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundData?.id && !!investor?.id,
  });

  // Fetch round terms
  const { data: roundTerms } = useQuery({
    queryKey: ["round-terms", roundData?.id],
    queryFn: async () => {
      if (!roundData?.id) return null;
      
      const { data, error } = await supabase
        .from("round_terms")
        .select("*")
        .eq("round_id", roundData.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!roundData?.id,
  });

  // Fetch signatures for this docket
  const { data: signatures = [] } = useQuery({
    queryKey: ["signatures", docket?.id],
    queryFn: async () => {
      if (!docket?.id) return [];
      
      const { data, error } = await supabase
        .from("signatures")
        .select("*")
        .eq("docket_id", docket.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!docket?.id,
  });

  // Fetch access key for this docket
  const { data: accessKey } = useQuery({
    queryKey: ["access-key", roundData?.id, investor?.id],
    queryFn: async () => {
      if (!roundData?.id || !investor?.id) return null;
      
      const { data, error } = await supabase
        .from("access_keys")
        .select("*")
        .eq("round_id", roundData.id)
        .eq("investor_id", investor.id)
        .eq("tool", "docket")
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

  // Initialize side letter from docket
  useState(() => {
    if (docket?.custom_terms) {
      setSideLetter(docket.custom_terms);
    }
  });

  const investorSignature = signatures.find(s => s.signer_type === 'investor');
  const companySignature = signatures.find(s => s.signer_type === 'company');

  const getStatusBadge = (status: string | undefined, wireReceived?: boolean) => {
    // If wire received, show Funded status
    if (wireReceived) {
      return <Badge className="bg-green-600/10 text-green-700 border-green-600/20">Funded</Badge>;
    }
    
    if (!status) return <Badge variant="outline">Drafted</Badge>;
    
    switch (status) {
      case 'draft':
      case 'drafted':
        return <Badge variant="outline">Drafted</Badge>;
      case 'sent':
      case 'viewed':
        return <Badge variant="secondary">Viewed</Badge>;
      case 'investor_signed':
      case 'signed':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Signed</Badge>;
      case 'executed':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Executed</Badge>;
      case 'funded':
        return <Badge className="bg-green-600/10 text-green-700 border-green-600/20">Funded</Badge>;
      case 'voided':
        return <Badge className="bg-muted text-muted-foreground">Voided</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Include investor slug in URL for investor-specific dockets
  const shareUrl = profile?.company_slug && roundData?.slug && investorSlug
    ? `${window.location.origin}/share/${profile.company_slug}/${roundData.slug}/docket/${investorSlug}`
    : null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleToggleShowDealTerms = async (checked: boolean) => {
    if (!docket) return;
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from("dockets")
        .update({ show_deal_terms: checked })
        .eq("id", docket.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["docket", roundData?.id, investor?.id] });
      toast({ title: checked ? "Deal terms enabled" : "Deal terms hidden" });
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleWireReceived = async (checked: boolean) => {
    if (!docket) return;
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from("dockets")
        .update({ 
          wire_received: checked,
          wire_received_at: checked ? new Date().toISOString() : null
        })
        .eq("id", docket.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["docket", roundData?.id, investor?.id] });
      toast({ title: checked ? "Wire marked as received" : "Wire receipt cleared" });
      
      // Log wire received activity
      if (checked && user?.id && roundData?.id) {
        logActivity({
          workspaceId: user.id,
          actionType: "investor_funded",
          roundId: roundData.id,
          investorId: investor?.id,
          docketId: docket.id,
          metadata: { investor_name: investor?.name || "Unknown" },
        });
      }
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSideLetter = async () => {
    if (!docket) return;
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from("dockets")
        .update({ custom_terms: sideLetter || null })
        .eq("id", docket.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["docket", roundData?.id, investor?.id] });
      setShowSideLetterEdit(false);
      toast({ title: "Side letter saved" });
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (docketLoading) {
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
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              {docket?.docket_id && (
                <Badge variant="outline" className="font-mono text-base px-2.5 py-0.5">
                  {docket.docket_id}
                </Badge>
              )}
              <h1 className="font-heading text-2xl font-semibold">
                {investorName}
              </h1>
            </div>
            {getStatusBadge(docket?.status, docket?.wire_received)}
          </div>
          
        </div>

        <Separator />

        {/* Share Link & Access Key */}
        {(shareUrl || accessKey) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Share Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        )}

        {/* Investor & Investment Details */}
        <div className="grid grid-cols-2 gap-6">
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
              {investor?.entity_name && (
                <div>
                  <Label className="text-muted-foreground text-xs">Entity Name</Label>
                  <p>{investor.entity_name}</p>
                </div>
              )}
              {investor?.address && (
                <div>
                  <Label className="text-muted-foreground text-xs">Address</Label>
                  <p className="whitespace-pre-wrap">{investor.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {docket?.amount && (
                <div>
                  <Label className="text-muted-foreground text-xs">Amount</Label>
                  <p className="text-xl font-semibold">${docket.amount.toLocaleString()}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Instrument</Label>
                <p>SAFE - Post-money</p>
              </div>
              {roundTerms?.valuation_cap && (
                <div>
                  <Label className="text-muted-foreground text-xs">Valuation Cap</Label>
                  <p>${roundTerms.valuation_cap.toLocaleString()}</p>
                </div>
              )}
              {roundTerms?.discount_rate && (
                <div>
                  <Label className="text-muted-foreground text-xs">Discount Rate</Label>
                  <p>{roundTerms.discount_rate}%</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Founder Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Show Deal Terms</Label>
                <p className="text-xs text-muted-foreground">
                  Display terms and investment button on investor's view
                </p>
              </div>
              <Switch
                checked={docket?.show_deal_terms ?? true}
                onCheckedChange={handleToggleShowDealTerms}
                disabled={isUpdating}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Wire Received</Label>
                <p className="text-xs text-muted-foreground">
                  {investorSignature 
                    ? "Mark when investment funds have been received" 
                    : "Available after agreement is signed"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {docket?.wire_received_at && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(docket.wire_received_at), "MMM d, yyyy")}
                  </span>
                )}
                <Switch
                  checked={docket?.wire_received ?? false}
                  onCheckedChange={handleToggleWireReceived}
                  disabled={isUpdating || !investorSignature}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side Letter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Side Letter / Custom Terms</CardTitle>
            {!showSideLetterEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSideLetter(docket?.custom_terms || "");
                  setShowSideLetterEdit(true);
                }}
              >
                {docket?.custom_terms ? "Edit" : "Add"}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {showSideLetterEdit ? (
              <div className="space-y-3">
                <Textarea
                  value={sideLetter}
                  onChange={(e) => setSideLetter(e.target.value)}
                  placeholder="Enter any custom terms or side letter provisions..."
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveSideLetter} disabled={isUpdating}>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSideLetterEdit(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : docket?.custom_terms ? (
              <p className="text-sm whitespace-pre-wrap">{docket.custom_terms}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No custom terms or side letter for this investor.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Deal Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deal Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Helper - determine completed stages based on docket status */}
            {(() => {
              const status = docket?.status;
              const hasViewed = status === 'viewed' || status === 'investor_signed' || status === 'executed' || status === 'funded' || docket?.wire_received;
              const hasSigned = status === 'investor_signed' || status === 'executed' || status === 'funded' || !!investorSignature;
              const hasExecuted = status === 'executed' || status === 'funded' || !!investorSignature; // Auto counter-sign after investor signs
              const hasFunded = status === 'funded' || docket?.wire_received;
              
              return (
                <>
                  {/* Step 1: Docket Created */}
                  <div className="flex items-center gap-3 py-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Docket Created</p>
                      <p className="text-xs text-muted-foreground">
                        Link sent to investor
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Terms Reviewed */}
                  <div className="flex items-center gap-3 py-2">
                    {hasViewed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Terms Reviewed</p>
                      <p className="text-xs text-muted-foreground">
                        {hasViewed ? 'Investor reviewed terms' : 'Awaiting investor review'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Agreement Signed */}
                  <div className="flex items-center gap-3 py-2">
                    {hasSigned ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Agreement Signed</p>
                      <p className="text-xs text-muted-foreground">
                        {investorSignature 
                          ? `Signed by ${investorSignature.signer_name} on ${format(new Date(investorSignature.signed_at), "MMM d, yyyy 'at' h:mm a")}`
                          : 'Awaiting investor signature'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Agreement Executed (auto counter-signature) */}
                  <div className="flex items-center gap-3 py-2">
                    {hasExecuted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Agreement Executed</p>
                      <p className="text-xs text-muted-foreground">
                        {hasExecuted 
                          ? 'Counter-signature applied automatically'
                          : 'Pending investor signature'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Step 5: Funds Received */}
                  <div className="flex items-center gap-3 py-2">
                    {hasFunded ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : hasSigned ? (
                      <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Funds Received</p>
                      <p className="text-xs text-muted-foreground">
                        {docket?.wire_received && docket?.wire_received_at
                          ? `Wire received on ${format(new Date(docket.wire_received_at), "MMM d, yyyy 'at' h:mm a")}`
                          : hasSigned
                            ? 'Awaiting wire transfer'
                            : 'Pending earlier steps'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Step 6: Deal Complete */}
                  <div className="flex items-center gap-3 py-2">
                    {hasFunded ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Deal Complete</p>
                      <p className="text-xs text-muted-foreground">
                        {hasFunded
                          ? 'Investment finalized'
                          : 'Pending fund receipt'
                        }
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Agreement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {docket?.wire_received ? 'Executed Agreement' : 'Agreement Preview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] rounded-md border p-6 bg-secondary/30">
              <div className="prose prose-sm max-w-none text-foreground">
                <h2 className="text-center font-heading">SIMPLE AGREEMENT FOR FUTURE EQUITY</h2>
                <p className="text-center text-muted-foreground text-sm">("SAFE")</p>
                
                {docket?.wire_received && (
                  <div className="my-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-center">
                    <p className="text-green-700 dark:text-green-400 font-medium text-sm">
                      ✓ Fully Executed Agreement - Funds Received
                    </p>
                  </div>
                )}
                
                <p className="mt-6">
                  THIS INSTRUMENT CERTIFIES THAT in exchange for the payment by{" "}
                  <strong>{investorName}</strong> (the "Investor") of{" "}
                  {docket?.amount ? (
                    <strong>${docket.amount.toLocaleString()}</strong>
                  ) : (
                    "[AMOUNT]"
                  )}{" "}
                  (the "Purchase Amount") on or about the date set forth below,{" "}
                  <strong>{roundTerms?.company_name || profile?.company_name || "[COMPANY]"}</strong>,
                  a Delaware corporation (the "Company"), hereby issues to the Investor the
                  right to certain shares of the Company's capital stock, subject to the
                  terms set forth below.
                </p>

                {roundTerms?.valuation_cap && (
                  <p className="mt-4">
                    <strong>Valuation Cap:</strong> ${roundTerms.valuation_cap.toLocaleString()}
                  </p>
                )}

                {roundTerms?.discount_rate && (
                  <p className="mt-2">
                    <strong>Discount Rate:</strong> {100 - roundTerms.discount_rate}%
                  </p>
                )}

                {docket?.custom_terms && (
                  <>
                    <h3 className="mt-6">Additional Terms</h3>
                    <p className="whitespace-pre-wrap">{docket.custom_terms}</p>
                  </>
                )}

                <p className="mt-6 text-muted-foreground text-xs">
                  [Full agreement text continues...]
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
