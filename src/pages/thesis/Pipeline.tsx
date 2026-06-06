import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ThesisLayout from "@/components/thesis/ThesisLayout";
import CreateRoundDialog from "@/components/thesis/CreateRoundDialog";
import InvestorPipeline from "@/components/thesis/pipeline/InvestorPipeline";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLogger";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Users,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Pipeline status flow: prospect -> pitch -> contract -> won/lost
const STATUS_OPTIONS = [
  { value: "prospect", label: "Prospect", color: "bg-muted text-muted-foreground" },
  { value: "pitch", label: "Pitch", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "contract", label: "Contract", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "won", label: "Won", color: "bg-green-600/10 text-green-700 border-green-600/20" },
  { value: "lost", label: "Lost", color: "bg-muted text-muted-foreground opacity-60" },
] as const;

type InvestorStatus = typeof STATUS_OPTIONS[number]["value"];

type SortField = "name" | "firm" | "email" | "lastContact" | "status";
type SortDirection = "asc" | "desc";

interface InvestorFormData {
  name: string;
  email: string;
  entity_name: string;
  entity_type: string;
  address: string;
}

export default function ThesisThesis() {
  const { roundSlug, variantSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useFounderAuth();

  const { rounds, isLoading: roundsLoading } = useRounds();
  const { investors, isLoading: investorsLoading } = useInvestors();

  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [addInvestorOpen, setAddInvestorOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [investorData, setInvestorData] = useState<{ id: string; name: string; status?: string } | null>(null);
  
  // Filter & sort state - exclude won/lost by default
  const [activeFilters, setActiveFilters] = useState<InvestorStatus[]>([
    "prospect", "pitch", "contract"
  ]);
  const [sortField, setSortField] = useState<SortField>("lastContact");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [formData, setFormData] = useState<InvestorFormData>({
    name: "",
    email: "",
    entity_name: "",
    entity_type: "individual",
    address: "",
  });

  const isGlobal = !variantSlug;
  const isInvestorSubpage = !isGlobal;

  const activeRound = rounds?.find((r) => r.slug === roundSlug);

  // Fetch last contact times from activity_logs
  const { data: lastContactMap = {} } = useQuery({
    queryKey: ["investor-last-contact", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      // Get most recent activity per investor
      const { data, error } = await supabase
        .from("activity_logs")
        .select("investor_id, created_at")
        .eq("workspace_id", user.id)
        .not("investor_id", "is", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Build map of investor_id -> most recent created_at
      const map: Record<string, string> = {};
      data?.forEach((log) => {
        if (log.investor_id && !map[log.investor_id]) {
          map[log.investor_id] = log.created_at;
        }
      });
      return map;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  // Fetch docket statuses to derive accurate pipeline status
  const { data: docketStatusMap = {} } = useQuery({
    queryKey: ["investor-docket-statuses", activeRound?.id],
    queryFn: async () => {
      if (!activeRound?.id) return {};
      const { data } = await supabase
        .from("dockets")
        .select("investor_id, status, commitment_status, wire_received")
        .eq("round_id", activeRound.id)
        .eq("is_global", false);
      
      const map: Record<string, { status: string; commitment_status: string | null; wire_received: boolean | null }> = {};
      data?.forEach((d) => {
        if (d.investor_id) {
          map[d.investor_id] = {
            status: d.status,
            commitment_status: d.commitment_status,
            wire_received: d.wire_received,
          };
        }
      });
      return map;
    },
    enabled: !!activeRound?.id,
    staleTime: 30 * 1000,
  });

  // Derive pipeline status from docket data
  const deriveStatus = (investorId: string, baseStatus: string): InvestorStatus => {
    const docket = docketStatusMap[investorId];
    if (!docket) return (baseStatus as InvestorStatus) || "prospect";
    if (docket.wire_received) return "won";
    if (docket.commitment_status === "signed" || docket.status === "Signed" || docket.status === "Executed" || docket.status === "Funded") return "contract";
    if (docket.status && docket.status !== "draft" && docket.status !== "Drafted") return "pitch";
    return (baseStatus as InvestorStatus) || "prospect";
  };

  // Generate next step (dummy for now)
  const getNextStep = (investorId: string, status: InvestorStatus): string => {
    // Simple hash-based random selection for demo
    const steps: Record<InvestorStatus, string[]> = {
      prospect: ["Send memo", "Schedule intro", "Follow up"],
      pitch: ["Waiting on response", "Schedule call", "Send deck"],
      contract: ["Review docs", "Finalize terms", "Awaiting signature"],
      won: ["Wire pending", "Send welcome", "Complete"],
      lost: ["Archive", "Revisit later", "—"],
    };
    const options = steps[status] || steps.prospect;
    const index = investorId.charCodeAt(0) % options.length;
    return options[index];
  };

  // Filter, sort, and transform investors
  const filteredInvestors = useMemo(() => {
    if (!investors) return [];
    
    const processed = investors
      .filter((inv) =>
        inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((inv) => {
        const derivedStatus = deriveStatus(inv.id, inv.status || "prospect");
        return {
          ...inv,
          status: derivedStatus,
          lastContact: lastContactMap[inv.id] || null,
          nextStep: getNextStep(inv.id, derivedStatus),
        };
      })
      .filter((inv) => activeFilters.includes(inv.status));

    // Sort
    processed.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "firm":
          comparison = (a.entity_name || "").localeCompare(b.entity_name || "");
          break;
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "");
          break;
        case "lastContact":
          const aTime = a.lastContact ? new Date(a.lastContact).getTime() : 0;
          const bTime = b.lastContact ? new Date(b.lastContact).getTime() : 0;
          comparison = aTime - bTime;
          break;
        case "status":
          const statusOrder = STATUS_OPTIONS.map(s => s.value);
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return processed;
  }, [investors, searchQuery, activeFilters, sortField, sortDirection, lastContactMap, docketStatusMap]);

  const toggleFilter = (status: InvestorStatus) => {
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

  const getStatusBadge = (status: InvestorStatus) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    if (!option) return null;
    return (
      <Badge variant="outline" className={cn("font-normal", option.color)}>
        {option.label}
      </Badge>
    );
  };

  const handleAddInvestor = async () => {
    if (!formData.name.trim() || !activeRound) return;

    setIsSubmitting(true);

    try {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 30);

      const { data: newInvestor, error } = await supabase.from("investors").insert({
        name: formData.name.trim(),
        slug,
        email: formData.email.trim() || null,
        entity_name: formData.entity_name.trim() || null,
        entity_type: formData.entity_type || "individual",
        address: formData.address.trim() || null,
        workspace_id: activeRound.workspace_id,
        status: "prospect",
      }).select().single();

      if (error) throw error;

      toast({ title: "Investor added" });
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      setAddInvestorOpen(false);
      resetForm();
      
      // Log activity
      if (user?.id && newInvestor) {
        logActivity({
          workspaceId: user.id,
          actionType: "investor_added",
          roundId: activeRound.id,
          investorId: newInvestor.id,
          metadata: { investor_name: newInvestor.name },
        });
      }
    } catch (error) {
      console.error("Error adding investor:", error);
      toast({
        title: "Error",
        description: "Failed to add investor.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateInvestor = async (investorId: string) => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("investors")
        .update({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          entity_name: formData.entity_name.trim() || null,
          entity_type: formData.entity_type || "individual",
          address: formData.address.trim() || null,
        })
        .eq("id", investorId);

      if (error) throw error;

      toast({ title: "Investor updated" });
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      setEditingInvestor(null);
      resetForm();
      
      // Log activity
      if (user?.id && activeRound) {
        logActivity({
          workspaceId: user.id,
          actionType: "investor_updated",
          roundId: activeRound.id,
          investorId,
          metadata: { investor_name: formData.name.trim() },
        });
      }
    } catch (error) {
      console.error("Error updating investor:", error);
      toast({
        title: "Error",
        description: "Failed to update investor.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (investor: typeof investors[number]) => {
    setFormData({
      name: investor.name,
      email: investor.email || "",
      entity_name: investor.entity_name || "",
      entity_type: investor.entity_type || "individual",
      address: investor.address || "",
    });
    setEditingInvestor(investor.id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      entity_name: "",
      entity_type: "individual",
      address: "",
    });
  };

  if (roundsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Skeleton className="h-14 w-full" />
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Generate breadcrumb for investor subpage
  const breadcrumb = isInvestorSubpage && investorData
    ? { label: investorData.name }
    : isInvestorSubpage && variantSlug
    ? { label: variantSlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) }
    : undefined;

  const investorName = investorData?.name || variantSlug?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Investor";

  const activeFilterCount = activeFilters.length;
  const allFiltersActive = activeFilterCount === STATUS_OPTIONS.length;

  return (
    <ThesisLayout
      rounds={rounds || []}
      investors={investors || []}
      onCreateRound={() => setCreateRoundOpen(true)}
      breadcrumb={breadcrumb}
      isSubpage={isInvestorSubpage}
      investorSlug={variantSlug}
      investorId={investorData?.id}
      investorName={isInvestorSubpage ? investorName : undefined}
      investorStatus={investorData?.status}
    >
      {isGlobal ? (
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-heading text-2xl font-bold">Pipeline</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage your investor pipeline for {activeRound?.name || "this round"}
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
                {STATUS_OPTIONS.map(status => (
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
                  onClick={() => setActiveFilters(STATUS_OPTIONS.map(s => s.value))}
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

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search investors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          {/* Table */}
          {investorsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : investors?.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">No investors yet</h3>
              <p className="text-muted-foreground text-sm">
                Add investors using the sidebar.
              </p>
            </div>
          ) : filteredInvestors.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">No matching investors</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <SortableHeader field="name">Name</SortableHeader>
                    <SortableHeader field="firm">Firm</SortableHeader>
                    <SortableHeader field="email">Email</SortableHeader>
                    <SortableHeader field="lastContact">Last Contact</SortableHeader>
                    <SortableHeader field="status">Status</SortableHeader>
                    <TableHead className="font-medium">Next Steps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.map((investor) => (
                    <TableRow 
                      key={investor.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        investor.status === "won" && "bg-green-50/50 hover:bg-green-50",
                        investor.status === "lost" && "opacity-50 bg-muted/30 hover:bg-muted/40",
                        investor.status !== "won" && investor.status !== "lost" && "hover:bg-muted/50"
                      )}
                      onClick={() => navigate(`/${roundSlug}/pipeline/${investor.slug}`)}
                    >
                      <TableCell className={cn("font-medium", investor.status === "lost" && "line-through")}>
                        {investor.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {investor.entity_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {investor.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {investor.lastContact 
                          ? formatDistanceToNow(new Date(investor.lastContact), { addSuffix: true })
                          : "—"
                        }
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(investor.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {investor.nextStep}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
      ) : (
        <InvestorPipeline 
          roundSlug={roundSlug} 
          investorSlug={variantSlug}
          onInvestorLoaded={setInvestorData}
        />
      )}

      {/* Add Investor Dialog */}
      <Dialog open={addInvestorOpen} onOpenChange={setAddInvestorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Investor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Sequoia Capital"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="partner@sequoia.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity_name">Entity Name</Label>
              <Input
                id="entity_name"
                placeholder="Sequoia Capital Operations LLC"
                value={formData.entity_name}
                onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select
                value={formData.entity_type}
                onValueChange={(v) => setFormData({ ...formData, entity_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="2800 Sand Hill Road, Menlo Park, CA 94025"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInvestorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddInvestor} disabled={!formData.name.trim() || isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Investor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Investor Dialog */}
      <Dialog open={!!editingInvestor} onOpenChange={() => setEditingInvestor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Investor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-entity_name">Entity Name</Label>
              <Input
                id="edit-entity_name"
                value={formData.entity_name}
                onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select
                value={formData.entity_type}
                onValueChange={(v) => setFormData({ ...formData, entity_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInvestor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingInvestor && handleUpdateInvestor(editingInvestor)}
              disabled={!formData.name.trim() || isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateRoundDialog open={createRoundOpen} onOpenChange={setCreateRoundOpen} />
    </ThesisLayout>
  );
}
