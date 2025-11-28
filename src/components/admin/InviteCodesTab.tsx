import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Ban, Eye, Copy, Check } from "lucide-react";
import { format } from "date-fns";

interface InviteCode {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  owner_id: string | null;
  owner_email?: string;
}

interface InviteCodeUse {
  id: string;
  used_at: string;
  ip_address: string | null;
  user_agent: string | null;
  location: any;
  user_email?: string;
}

interface InviteCodesTabProps {
  onUpdate?: () => void;
}

export function InviteCodesTab({ onUpdate }: InviteCodesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<InviteCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newCodeData, setNewCodeData] = useState({
    maxUses: "1",
    expiresInDays: "",
  });

  // Fetch all invite codes
  const { data: inviteCodes, isLoading } = useQuery({
    queryKey: ["adminInviteCodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch owner emails for codes with owner_id
      const ownerIds = [...new Set(data?.filter(c => c.owner_id).map(c => c.owner_id))];
      let ownerEmails: Record<string, string> = {};
      
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        
        if (profiles) {
          ownerEmails = Object.fromEntries(profiles.map(p => [p.id, p.full_name || "Unknown"]));
        }
      }

      return data?.map(code => ({
        ...code,
        owner_email: code.owner_id ? ownerEmails[code.owner_id] : undefined,
      })) as InviteCode[];
    },
  });

  // Fetch usage for selected code
  const { data: codeUses, isLoading: isLoadingUses } = useQuery({
    queryKey: ["inviteCodeUses", selectedCode?.id],
    queryFn: async () => {
      if (!selectedCode) return [];
      
      const { data, error } = await supabase
        .from("invite_code_uses")
        .select("*")
        .eq("invite_code_id", selectedCode.id)
        .order("used_at", { ascending: false });

      if (error) throw error;

      // Fetch user emails
      const userIds = [...new Set(data?.filter(u => u.used_by).map(u => u.used_by))];
      let userEmails: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        if (profiles) {
          userEmails = Object.fromEntries(profiles.map(p => [p.id, p.full_name || "Unknown"]));
        }
      }

      return data?.map(use => ({
        ...use,
        user_email: use.used_by ? userEmails[use.used_by] : undefined,
      })) as InviteCodeUse[];
    },
    enabled: !!selectedCode,
  });

  const handleCreateCode = async () => {
    try {
      // Generate code using the database function
      const { data: codeResult, error: codeError } = await supabase
        .rpc("generate_invite_code");

      if (codeError) throw codeError;

      const expiresAt = newCodeData.expiresInDays
        ? new Date(Date.now() + parseInt(newCodeData.expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from("invite_codes").insert({
        code: codeResult,
        max_uses: parseInt(newCodeData.maxUses) || null,
        expires_at: expiresAt,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Invite code created", description: `Code: ${codeResult}` });
      queryClient.invalidateQueries({ queryKey: ["adminInviteCodes"] });
      onUpdate?.();
      setIsCreateDialogOpen(false);
      setNewCodeData({ maxUses: "1", expiresInDays: "" });
    } catch (error) {
      console.error("Error creating invite code:", error);
      toast({
        title: "Error",
        description: "Failed to create invite code",
        variant: "destructive",
      });
    }
  };

  const handleRevokeCode = async (codeId: string) => {
    try {
      const { error } = await supabase
        .from("invite_codes")
        .update({ is_active: false })
        .eq("id", codeId);

      if (error) throw error;

      toast({ title: "Code revoked" });
      queryClient.invalidateQueries({ queryKey: ["adminInviteCodes"] });
      onUpdate?.();
    } catch (error) {
      console.error("Error revoking code:", error);
      toast({
        title: "Error",
        description: "Failed to revoke code",
        variant: "destructive",
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (code: InviteCode) => {
    if (!code.is_active) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (code.max_uses && code.used_count >= code.max_uses) {
      return <Badge variant="secondary">Exhausted</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invite Codes</CardTitle>
          <CardDescription>Manage invite codes for new users</CardDescription>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Code
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inviteCodes?.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-2">
                      {code.code}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyCode(code.code)}
                      >
                        {copiedCode === code.code ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(code)}</TableCell>
                  <TableCell>
                    {code.owner_email ? (
                      <span className="text-sm">{code.owner_email}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Admin</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {code.used_count}/{code.max_uses ?? "∞"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(code.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {code.expires_at
                      ? format(new Date(code.expires_at), "MMM d, yyyy")
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedCode(code)}
                        title="View usage"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {code.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevokeCode(code.id)}
                          title="Revoke code"
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {inviteCodes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No invite codes found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Code Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invite Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                value={newCodeData.maxUses}
                onChange={(e) =>
                  setNewCodeData({ ...newCodeData, maxUses: e.target.value })
                }
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expires In (days)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="1"
                value={newCodeData.expiresInDays}
                onChange={(e) =>
                  setNewCodeData({ ...newCodeData, expiresInDays: e.target.value })
                }
                placeholder="Leave empty for never"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCode}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Details Dialog */}
      <Dialog open={!!selectedCode} onOpenChange={() => setSelectedCode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Code Usage: <span className="font-mono">{selectedCode?.code}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {isLoadingUses ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : codeUses && codeUses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codeUses.map((use) => (
                    <TableRow key={use.id}>
                      <TableCell>{use.user_email || "Unknown"}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(use.used_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {use.ip_address || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {use.location
                          ? `${use.location.city || ""}, ${use.location.country || ""}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                This code has not been used yet
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
