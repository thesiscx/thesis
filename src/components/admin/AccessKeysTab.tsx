import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Copy, Ban, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AccessKey {
  id: string;
  key: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  stakeholder: {
    id: string;
    name: string;
  };
}

interface Stakeholder {
  id: string;
  name: string;
}

interface AccessKeysTabProps {
  onUpdate: () => void;
}

export function AccessKeysTab({ onUpdate }: AccessKeysTabProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStakeholder, setSelectedStakeholder] = useState("");
  const [deleteKey, setDeleteKey] = useState<AccessKey | null>(null);
  const { toast } = useToast();

  const { data: accessKeys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['accessKeys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_keys')
        .select('*, stakeholder:stakeholders(id, name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  });

  // Share stakeholders cache with StakeholdersTab
  const { data: stakeholders = [] } = useQuery({
    queryKey: ['stakeholders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const handleGenerateKey = async () => {
    if (!selectedStakeholder) {
      toast({
        title: "Error",
        description: "Please select a stakeholder",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Not authenticated",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('generate-access-key', {
        body: { stakeholderId: selectedStakeholder },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Success",
        description: `Access key generated: ${response.data.key}`,
      });

      setIsDialogOpen(false);
      setSelectedStakeholder("");
      queryClient.invalidateQueries({ queryKey: ['accessKeys'] });
      onUpdate();
    } catch (error: any) {
      console.error('Error generating key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate access key",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied",
      description: "Access key copied to clipboard",
    });
  };

  const handleToggleStatus = async (keyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    const { error } = await supabase
      .from('access_keys')
      .update({ status: newStatus })
      .eq('id', keyId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update access key status",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Access key ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
    });

    queryClient.invalidateQueries({ queryKey: ['accessKeys'] });
    onUpdate();
  };

  const handleDeleteKey = async () => {
    if (!deleteKey) return;

    const { error } = await supabase
      .from('access_keys')
      .delete()
      .eq('id', deleteKey.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete access key",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Access key deleted successfully",
    });

    setDeleteKey(null);
    queryClient.invalidateQueries({ queryKey: ['accessKeys'] });
    onUpdate();
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Manage Access Codes</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Access Key</DialogTitle>
                  <DialogDescription>
                    Select a stakeholder to generate a new access key
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="stakeholder">Stakeholder *</Label>
                    <Select value={selectedStakeholder} onValueChange={setSelectedStakeholder}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stakeholder" />
                      </SelectTrigger>
                      <SelectContent>
                        {stakeholders.map((stakeholder: Stakeholder) => (
                          <SelectItem key={stakeholder.id} value={stakeholder.id}>
                            {stakeholder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateKey} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Access Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keysLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : accessKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No access keys yet
                  </TableCell>
                </TableRow>
              ) : (
                accessKeys.map((key: AccessKey) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.stakeholder.name}</TableCell>
                    <TableCell>
                      <code className="font-mono text-sm">{key.key}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                        {key.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyKey(key.key)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(key.id, key.status)}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteKey(key)}
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

      <AlertDialog open={!!deleteKey} onOpenChange={() => setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Access Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this access key? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
