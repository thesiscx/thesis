import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut } from "lucide-react";
import { UsersTab } from "@/components/admin/UsersTab";
import { InviteCodesTab } from "@/components/admin/InviteCodesTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { user, signOut, isLoading } = useFounderAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check admin role directly in Admin page
  const { data: isAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ['adminRole', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Cache stats with React Query
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [usersRes, roundsRes, memosRes, inviteCodesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('rounds').select('id', { count: 'exact', head: true }),
        supabase.from('memos').select('id', { count: 'exact', head: true }),
        supabase.from('invite_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalRounds: roundsRes.count || 0,
        totalMemos: memosRes.count || 0,
        activeInviteCodes: inviteCodesRes.count || 0,
      };
    },
    enabled: isAdmin === true,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    meta: { persist: false },
  });

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/admin/login", { replace: true });
    }
  }, [isLoading, user, navigate]);

  // Redirect when confirmed non-admin
  useEffect(() => {
    if (!isCheckingAdmin && isAdmin === false && user) {
      toast({
        title: 'Access denied',
        description: 'You need admin privileges to access the admin dashboard.',
        variant: 'destructive',
      });
      navigate("/admin/login", { replace: true });
    }
  }, [isCheckingAdmin, isAdmin, user, navigate, toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const handleStatsUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['adminStats'] });
  };

  // Show skeleton while loading auth or checking admin
  if (isLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/robomart-login-logo.png" alt="Robomart Logo" className="w-10 h-10" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.totalUsers ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Rounds</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.totalRounds ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Memos</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.totalMemos ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active Invite Codes</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.activeInviteCodes ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="invite-codes">Invite Codes</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab onUpdate={handleStatsUpdate} />
          </TabsContent>

          <TabsContent value="invite-codes">
            <InviteCodesTab onUpdate={handleStatsUpdate} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
