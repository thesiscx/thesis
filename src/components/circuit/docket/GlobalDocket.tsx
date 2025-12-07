import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileText, Copy, ExternalLink, FileSignature, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GlobalDocketProps {
  roundSlug?: string;
}

export default function GlobalDocket({ roundSlug }: GlobalDocketProps) {
  const { user, profile } = useFounderAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch round and dockets
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

  const { data: dockets = [], isLoading } = useQuery({
    queryKey: ["dockets", roundData?.id],
    queryFn: async () => {
      if (!roundData?.id) return [];
      
      const { data, error } = await supabase
        .from("dockets")
        .select(`
          id,
          amount,
          status,
          wire_received,
          updated_at,
          investor_id,
          is_global,
          investor_name,
          investor_email,
          custom_terms,
          show_deal_terms,
          access_key_id,
          investors (
            id,
            name,
            slug,
            email
          )
        `)
        .eq("round_id", roundData.id)
        .eq("is_global", false)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!roundData?.id,
  });

  // Fetch access keys for dockets
  const { data: accessKeys = [] } = useQuery({
    queryKey: ["docket-access-keys", roundData?.id],
    queryFn: async () => {
      if (!roundData?.id) return [];
      
      const { data, error } = await supabase
        .from("access_keys")
        .select("id, key, investor_id")
        .eq("round_id", roundData.id)
        .eq("tool", "docket");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!roundData?.id,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      sent: "secondary",
      investor_signed: "default",
      executed: "default",
      expired: "destructive",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      investor_signed: "Signed",
      executed: "Executed",
      expired: "Expired",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return "—";
    return `$${amount.toLocaleString()}`;
  };

  const getInvestorName = (docket: any) => {
    if (docket.is_global) return "Global Template";
    return docket.investors?.name || docket.investor_name || "Unknown";
  };

  const getInvestorSlug = (docket: any) => {
    return docket.investors?.slug || docket.investor_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "";
  };

  const getAccessKeyForDocket = (docket: any) => {
    const key = accessKeys.find(k => k.investor_id === docket.investor_id);
    return key?.key || null;
  };

  const getShareUrl = (docket: any) => {
    if (!profile?.company_slug || !roundData?.slug) return null;
    return `${window.location.origin}/share/${profile.company_slug}/${roundData.slug}/docket`;
  };

  const handleRowClick = (docket: any) => {
    const slug = getInvestorSlug(docket);
    if (slug && roundSlug) {
      navigate(`/${roundSlug}/docket/${slug}`);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold mb-2">Dockets</h1>
          <p className="text-muted-foreground">
            Manage deal documents and track investor commitments
          </p>
        </div>

        {dockets.length === 0 ? (
          <div className="border border-dashed border-border/50 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No dockets yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Use "Add Docket" in the sidebar to create dockets for individual investors.
            </p>
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-medium">Investor</TableHead>
                  <TableHead className="font-medium">Amount</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Access Key</TableHead>
                  <TableHead className="font-medium">Side Letter</TableHead>
                  <TableHead className="font-medium">Last Updated</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dockets.map((docket: any) => {
                  const accessKey = getAccessKeyForDocket(docket);
                  const shareUrl = getShareUrl(docket);
                  
                  return (
                    <TableRow 
                      key={docket.id} 
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => handleRowClick(docket)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{getInvestorName(docket)}</span>
                          {(docket.investors?.email || docket.investor_email) && (
                            <span className="text-xs text-muted-foreground">
                              {docket.investors?.email || docket.investor_email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatAmount(docket.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(docket.status)}</TableCell>
                      <TableCell>
                        {accessKey ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-secondary/50 px-2 py-0.5 rounded font-mono">
                              {accessKey.slice(0, 8)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(accessKey, "Access key");
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {docket.custom_terms ? (
                          <Badge variant="secondary" className="text-xs">
                            <FileSignature className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {docket.updated_at ? format(new Date(docket.updated_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(docket);
                            }}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Docket
                            </DropdownMenuItem>
                            {shareUrl && accessKey && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(shareUrl, "Share URL");
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Share URL
                              </DropdownMenuItem>
                            )}
                            {accessKey && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(accessKey, "Access key");
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Access Key
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
