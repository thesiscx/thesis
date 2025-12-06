import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface UserWithStats {
  id: string;
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean | null;
  role: string;
  rounds_count: number;
  memos_count: number;
  investors_count: number;
}

interface UsersTabProps {
  onUpdate: () => void;
}

export function UsersTab({ onUpdate }: UsersTabProps) {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<UserWithStats[]> => {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch rounds count per user
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('created_by');

      if (roundsError) throw roundsError;

      // Fetch memos count per user
      const { data: memos, error: memosError } = await supabase
        .from('memos')
        .select('created_by');

      if (memosError) throw memosError;

      // Fetch investors count per workspace
      const { data: investors, error: investorsError } = await supabase
        .from('investors')
        .select('workspace_id');

      if (investorsError) throw investorsError;

      // Build role map
      const roleMap = new Map<string, string>();
      roles?.forEach(r => {
        roleMap.set(r.user_id, r.role);
      });

      // Build rounds count map
      const roundsCountMap = new Map<string, number>();
      rounds?.forEach(r => {
        if (r.created_by) {
          roundsCountMap.set(r.created_by, (roundsCountMap.get(r.created_by) || 0) + 1);
        }
      });

      // Build memos count map
      const memosCountMap = new Map<string, number>();
      memos?.forEach(m => {
        if (m.created_by) {
          memosCountMap.set(m.created_by, (memosCountMap.get(m.created_by) || 0) + 1);
        }
      });

      // Build investors count map (by workspace_id which equals user_id for founders)
      const investorsCountMap = new Map<string, number>();
      investors?.forEach(i => {
        if (i.workspace_id) {
          investorsCountMap.set(i.workspace_id, (investorsCountMap.get(i.workspace_id) || 0) + 1);
        }
      });

      // Combine data
      return (profiles || []).map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        company_name: profile.company_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        onboarding_completed: profile.onboarding_completed,
        role: roleMap.get(profile.id) || 'user',
        rounds_count: roundsCountMap.get(profile.id) || 0,
        memos_count: memosCountMap.get(profile.id) || 0,
        investors_count: investorsCountMap.get(profile.id) || 0,
      }));
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'moderator': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Users</h2>
          <span className="text-sm text-muted-foreground">
            {users.length} total users
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Rounds</TableHead>
              <TableHead className="text-center">Memos</TableHead>
              <TableHead className="text-center">Investors</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No users yet
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                        {!user.onboarding_completed && (
                          <span className="text-xs text-muted-foreground">Onboarding incomplete</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.company_name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {user.rounds_count}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {user.memos_count}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {user.investors_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
