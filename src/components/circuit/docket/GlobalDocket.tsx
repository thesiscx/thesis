import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { FileText, Copy, ExternalLink, MoreHorizontal, XCircle, Archive, Filter, ArrowUpDown, ArrowUp, ArrowDown, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface GlobalDocketProps {
  roundSlug?: string;
}

// Status definitions
const STATUSES = [
  { value: "drafted", label: "Drafted" },
  { value: "shared", label: "Shared" },
  { value: "viewed", label: "Viewed" },
  { value: "signed", label: "Signed" },
  { value: "executed", label: "Executed" },
  { value: "funded", label: "Funded" },
  { value: "voided", label: "Voided" },
] as const;

type StatusValue = typeof STATUSES[number]["value"];

// Map old statuses to new
const STATUS_MAP: Record<string, StatusValue> = {
  draft: "drafted",
  sent: "shared",
  investor_signed: "signed",
  executed: "executed",
  expired: "voided",
};

type SortField = "investor" | "amount" | "status" | "url" | "key" | "updated";
type SortDirection = "asc" | "desc";

export default function GlobalDocket({ roundSlug }: GlobalDocketProps) {
  const { user, profile } = useFounderAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeFilters, setActiveFilters] = useState<StatusValue[]>([
    "drafted", "shared", "viewed", "signed", "executed", "funded"
  ]);
  const [sortField, setSortField] = useState<SortField>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  // Normalize status to new values
  const normalizeStatus = (status: string, wireReceived?: boolean): StatusValue => {
    if (wireReceived) return "funded";
    return STATUS_MAP[status] || (status as StatusValue) || "drafted";
  };

  const getStatusBadge = (status: StatusValue) => {
    const config: Record<StatusValue, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
      drafted: { variant: "outline" },
      shared: { variant: "secondary" },
      viewed: { variant: "secondary", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      signed: { variant: "default", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      executed: { variant: "default", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
      funded: { variant: "default", className: "bg-green-600/10 text-green-700 border-green-600/20" },
      voided: { variant: "destructive", className: "bg-muted text-muted-foreground" },
    };
    const label = STATUSES.find(s => s.value === status)?.label || status;
    const { variant, className } = config[status] || { variant: "outline" };
    return <Badge variant={variant} className={className}>{label}</Badge>;
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

  const toggleFilter = (status: StatusValue) => {
    setActiveFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="font-medium cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  // Get available actions based on status
  const getAvailableActions = (status: StatusValue) => {
    switch (status) {
      case "drafted":
        return ["view", "void"];
      case "shared":
      case "viewed":
        return ["view", "void"];
      case "signed":
      case "executed":
      case "funded":
        return ["view", "archive"];
      case "voided":
        return ["view"];
      default:
        return ["view"];
    }
  };

  // Filter, sort, and transform dockets
  const filteredDockets = useMemo(() => {
    const processed = dockets
      .map((d: any) => ({
        ...d,
        normalizedStatus: normalizeStatus(d.status, d.wire_received),
        accessKey: getAccessKeyForDocket(d),
        shareUrl: getShareUrl(d),
      }))
      .filter((d: any) => activeFilters.includes(d.normalizedStatus));

    // Sort
    processed.sort((a: any, b: any) => {
      let comparison = 0;
      
      switch (sortField) {
        case "investor":
          comparison = getInvestorName(a).localeCompare(getInvestorName(b));
          break;
        case "amount":
          comparison = (a.amount || 0) - (b.amount || 0);
          break;
        case "status":
          const statusOrder = STATUSES.map(s => s.value);
          comparison = statusOrder.indexOf(a.normalizedStatus) - statusOrder.indexOf(b.normalizedStatus);
          break;
        case "url":
          comparison = (a.shareUrl || "").localeCompare(b.shareUrl || "");
          break;
        case "key":
          comparison = (a.accessKey || "").localeCompare(b.accessKey || "");
          break;
        case "updated":
          comparison = new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return processed;
  }, [dockets, activeFilters, sortField, sortDirection, accessKeys, profile, roundData]);

  const activeFilterCount = activeFilters.length;
  const allFiltersActive = activeFilterCount === STATUSES.length;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold mb-2">Dockets</h1>
            <p className="text-muted-foreground">
              Manage deal documents and track investor commitments
            </p>
          </div>
          
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
                {!allFiltersActive && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUSES.map(status => (
                <DropdownMenuCheckboxItem
                  key={status.value}
                  checked={activeFilters.includes(status.value)}
                  onCheckedChange={() => toggleFilter(status.value)}
                >
                  {status.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveFilters(STATUSES.map(s => s.value))}
                className="text-xs text-muted-foreground"
              >
                Show all
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveFilters([])}
                className="text-xs text-muted-foreground"
              >
                Clear all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        ) : filteredDockets.length === 0 ? (
          <div className="border border-dashed border-border/50 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">No matching dockets</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Try adjusting your filters to see more dockets.
            </p>
          </div>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <SortableHeader field="investor">Investor</SortableHeader>
                  <SortableHeader field="amount">Amount</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <SortableHeader field="url">Share Link</SortableHeader>
                  <SortableHeader field="key">Access Key</SortableHeader>
                  <SortableHeader field="updated">Last Updated</SortableHeader>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDockets.map((docket: any) => {
                  const status = docket.normalizedStatus;
                  const actions = getAvailableActions(status);
                  
                  return (
                    <TableRow 
                      key={docket.id} 
                      className={cn(
                        "cursor-pointer transition-colors",
                        status === "funded" && "bg-green-50/50 hover:bg-green-50",
                        status === "voided" && "opacity-50 bg-muted/30 hover:bg-muted/40",
                        status !== "funded" && status !== "voided" && "hover:bg-muted/30"
                      )}
                      onClick={() => handleRowClick(docket)}
                    >
                      <TableCell className="font-medium">
                        <div className={cn("flex flex-col", status === "voided" && "line-through")}>
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
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell>
                        {docket.shareUrl && docket.accessKey ? (
                          <div className="flex items-center gap-1">
                            <Link className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              Share link
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(docket.shareUrl, "Share link");
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
                        {docket.accessKey ? (
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-secondary/50 px-2 py-0.5 rounded font-mono">
                              {docket.accessKey.slice(0, 8)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(docket.accessKey, "Access key");
                              }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
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
                            {docket.shareUrl && docket.accessKey && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(docket.shareUrl, "Share link");
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Share Link
                              </DropdownMenuItem>
                            )}
                            {docket.accessKey && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(docket.accessKey, "Access key");
                              }}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Access Key
                              </DropdownMenuItem>
                            )}
                            {actions.includes("void") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-destructive"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Void Docket
                                </DropdownMenuItem>
                              </>
                            )}
                            {actions.includes("archive") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive Docket
                                </DropdownMenuItem>
                              </>
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
