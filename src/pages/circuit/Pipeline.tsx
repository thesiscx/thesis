import { useState } from "react";
import { useParams } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import CircuitLayout from "@/components/circuit/CircuitLayout";
import CreateRoundDialog from "@/components/circuit/CreateRoundDialog";
import { useRounds } from "@/hooks/useRounds";
import { useInvestors } from "@/hooks/useInvestors";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  MoreHorizontal,
  FileText,
  FolderOpen,
  Trash2,
  Pencil,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const STATUS_OPTIONS = [
  { value: "prospect", label: "Prospect", color: "bg-muted text-muted-foreground" },
  { value: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "interested", label: "Interested", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "committed", label: "Committed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "signed", label: "Signed", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "declined", label: "Declined", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
] as const;

type InvestorStatus = typeof STATUS_OPTIONS[number]["value"];

interface InvestorFormData {
  name: string;
  email: string;
  entity_name: string;
  entity_type: string;
  address: string;
}

export default function ThesisCircuit() {
  const { roundSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { rounds, isLoading: roundsLoading } = useRounds();
  const { investors, isLoading: investorsLoading } = useInvestors();

  const [createRoundOpen, setCreateRoundOpen] = useState(false);
  const [addInvestorOpen, setAddInvestorOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<InvestorFormData>({
    name: "",
    email: "",
    entity_name: "",
    entity_type: "individual",
    address: "",
  });

  const activeRound = rounds?.find((r) => r.slug === roundSlug);

  const filteredInvestors = investors?.filter((inv) =>
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAddInvestor = async () => {
    if (!formData.name.trim() || !activeRound) return;

    setIsSubmitting(true);

    try {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 30);

      const { error } = await supabase.from("investors").insert({
        name: formData.name.trim(),
        slug,
        email: formData.email.trim() || null,
        entity_name: formData.entity_name.trim() || null,
        entity_type: formData.entity_type || "individual",
        address: formData.address.trim() || null,
        workspace_id: activeRound.workspace_id,
      });

      if (error) throw error;

      toast({ title: "Investor added" });
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      setAddInvestorOpen(false);
      resetForm();
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

  const handleDeleteInvestor = async (investorId: string) => {
    try {
      const { error } = await supabase.from("investors").delete().eq("id", investorId);

      if (error) throw error;

      toast({ title: "Investor deleted" });
      queryClient.invalidateQueries({ queryKey: ["investors"] });
    } catch (error) {
      console.error("Error deleting investor:", error);
      toast({
        title: "Error",
        description: "Failed to delete investor.",
        variant: "destructive",
      });
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

  return (
    <CircuitLayout
      rounds={rounds || []}
      investors={investors || []}
      onCreateRound={() => setCreateRoundOpen(true)}
    >
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold">Pipeline</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your investor pipeline for {activeRound?.name || "this round"}
            </p>
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
          ) : filteredInvestors.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2">No investors yet</h3>
              <p className="text-muted-foreground text-sm">
                Add investors using the sidebar.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvestors.map((investor) => (
                    <TableRow key={investor.id}>
                      <TableCell className="font-medium">{investor.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {investor.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {investor.entity_name || investor.entity_type || "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/circuit/${roundSlug}/memo/${investor.slug}`)
                              }
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Memo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/circuit/${roundSlug}/docket/${investor.slug}`)
                              }
                            >
                              <FolderOpen className="w-4 h-4 mr-2" />
                              View Docket
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditModal(investor)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteInvestor(investor.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

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
    </CircuitLayout>
  );
}
