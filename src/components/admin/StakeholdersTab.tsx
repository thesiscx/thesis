import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Stakeholder {
  id: string;
  name: string;
  short_code: string | null;
  email: string | null;
  organization: string | null;
  notes: string | null;
  created_at: string;
}

interface StakeholdersTabProps {
  onUpdate: () => void;
}

export function StakeholdersTab({ onUpdate }: StakeholdersTabProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  const [deleteStakeholder, setDeleteStakeholder] = useState<Stakeholder | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    short_code: "",
    email: "",
    organization: "",
    notes: "",
  });
  const { toast } = useToast();

  const { data: stakeholders = [], isLoading } = useQuery({
    queryKey: ['stakeholders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - won't refetch on tab switch
    gcTime: 1000 * 60 * 30,   // 30 minutes in cache
  });

  const handleOpenDialog = (stakeholder?: Stakeholder) => {
    if (stakeholder) {
      setEditingStakeholder(stakeholder);
      setFormData({
        name: stakeholder.name,
        short_code: stakeholder.short_code || "",
        email: stakeholder.email || "",
        organization: stakeholder.organization || "",
        notes: stakeholder.notes || "",
      });
    } else {
      setEditingStakeholder(null);
      setFormData({ name: "", short_code: "", email: "", organization: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveStakeholder = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.short_code.trim()) {
      toast({
        title: "Error",
        description: "Short code is required",
        variant: "destructive",
      });
      return;
    }

    const shortCode = formData.short_code.trim().toLowerCase();
    if (!/^[a-z0-9]{4}$/.test(shortCode)) {
      toast({
        title: "Error",
        description: "Short code must be exactly 4 lowercase letters/numbers",
        variant: "destructive",
      });
      return;
    }

    const stakeholderData = {
      name: formData.name.trim(),
      short_code: shortCode,
      email: formData.email.trim() || null,
      organization: formData.organization.trim() || null,
      notes: formData.notes.trim() || null,
    };

    if (editingStakeholder) {
      const { error } = await supabase
        .from('stakeholders')
        .update(stakeholderData)
        .eq('id', editingStakeholder.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update stakeholder",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Stakeholder updated successfully",
      });
    } else {
      const { error } = await supabase
        .from('stakeholders')
        .insert(stakeholderData);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create stakeholder",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Stakeholder created successfully",
      });
    }

    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['stakeholders'] });
    onUpdate();
  };

  const handleDeleteStakeholder = async () => {
    if (!deleteStakeholder) return;

    const { error } = await supabase
      .from('stakeholders')
      .delete()
      .eq('id', deleteStakeholder.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete stakeholder",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Stakeholder deleted successfully",
    });

    setDeleteStakeholder(null);
    queryClient.invalidateQueries({ queryKey: ['stakeholders'] });
    queryClient.invalidateQueries({ queryKey: ['accessKeys'] });
    onUpdate();
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Manage Stakeholders</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stakeholder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingStakeholder ? "Edit Stakeholder" : "Add New Stakeholder"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingStakeholder ? "Update stakeholder information" : "Create a new stakeholder"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Stakeholder name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="short_code">Short Code *</Label>
                    <Input
                      id="short_code"
                      value={formData.short_code}
                      onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toLowerCase() })}
                      placeholder="ntsa"
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Exactly 4 lowercase letters/numbers. Used in access keys: robo-{formData.short_code || 'xxxx'}-xxxx-xxxx
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      placeholder="Organization name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveStakeholder}>
                    {editingStakeholder ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Short Code</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : stakeholders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No stakeholders yet
                  </TableCell>
                </TableRow>
              ) : (
                stakeholders.map((stakeholder) => (
                  <TableRow key={stakeholder.id}>
                    <TableCell className="font-medium">{stakeholder.name}</TableCell>
                    <TableCell>
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                        {stakeholder.short_code || "-"}
                      </code>
                    </TableCell>
                    <TableCell>{stakeholder.email || "-"}</TableCell>
                    <TableCell>{stakeholder.organization || "-"}</TableCell>
                    <TableCell>{new Date(stakeholder.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(stakeholder)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteStakeholder(stakeholder)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteStakeholder} onOpenChange={() => setDeleteStakeholder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stakeholder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteStakeholder?.name}"? This will also delete all associated access keys and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStakeholder}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
