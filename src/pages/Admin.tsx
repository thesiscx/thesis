import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut } from "lucide-react";
import { StakeholdersTab } from "@/components/admin/StakeholdersTab";
import { AccessKeysTab } from "@/components/admin/AccessKeysTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { DocumentsTab } from "@/components/admin/DocumentsTab";
import { InviteCodesTab } from "@/components/admin/InviteCodesTab";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { user, signOut, isLoading: authLoading, isSessionReady } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cache admin check with React Query - returns null for unknown, false for confirmed non-admin
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ['adminCheck', user?.id],
    queryFn: async (): Promise<boolean | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Admin check error:', error);
        return null;
      }
      
      return !!data;
    },
    enabled: !!user && !authLoading && isSessionReady,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    meta: { persist: false },
  });

  // Cache stats with React Query
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [stakeholdersRes, keysRes, logsRes, documentsRes] = await Promise.all([
        supabase.from('stakeholders').select('id', { count: 'exact', head: true }),
        supabase.from('access_keys').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('access_logs')
          .select('id', { count: 'exact', head: true })
          .eq('action', 'login')
          .gte('timestamp', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalStakeholders: stakeholdersRes.count || 0,
        activeKeys: keysRes.count || 0,
        todayLogins: logsRes.count || 0,
        totalDocuments: documentsRes.count || 0,
      };
    },
    enabled: isAdmin === true,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Only redirect when we have CONFIRMED non-admin status (isAdmin === false, not null)
  useEffect(() => {
    if (!adminLoading && isAdmin === false && user && isSessionReady) {
      toast({
        title: 'Access denied',
        description: 'You need admin privileges to access the admin dashboard.',
        variant: 'destructive',
      });
      navigate("/admin/login", { replace: true });
    }
  }, [adminLoading, isAdmin, user, isSessionReady, navigate, toast]);

  const handleSignOut = async () => {
    await signOut('/admin/login');
  };

  const handleStatsUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['adminStats'] });
  };

  // Show nothing while loading or redirecting
  if (authLoading || !isSessionReady || !user || isAdmin === false) {
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
              <CardDescription>Total Stakeholders</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.totalStakeholders ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Active Access Codes</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.activeKeys ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Documents</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.totalDocuments ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Today's Logins</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats?.todayLogins ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="invite-codes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="invite-codes">Invite Codes</TabsTrigger>
            <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
            <TabsTrigger value="access-codes">Access Codes</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="invite-codes">
            <InviteCodesTab onUpdate={handleStatsUpdate} />
          </TabsContent>

          <TabsContent value="stakeholders">
            <StakeholdersTab onUpdate={handleStatsUpdate} />
          </TabsContent>

          <TabsContent value="access-codes">
            <AccessKeysTab onUpdate={handleStatsUpdate} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
