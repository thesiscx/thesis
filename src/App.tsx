import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

import Auth from "./pages/Auth";
import InviteCode from "./pages/auth/InviteCode";
import EmailAuth from "./pages/auth/EmailAuth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Pricing from "./pages/Pricing";
import CircuitMemo from "./pages/circuit/CircuitMemo";
import CircuitDocket from "./pages/circuit/CircuitDocket";
import Pipeline from "./pages/circuit/Pipeline";
import FounderSettings from "./pages/circuit/FounderSettings";
import RoundsOverview from "./pages/circuit/settings/RoundsOverview";
import CustomDomain from "./pages/circuit/settings/CustomDomain";
import ProfileSettings from "./pages/ProfileSettings";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import InvestorAccess from "./pages/public/InvestorAccess";
import PublicMemoViewer from "./pages/public/PublicMemoViewer";
import PublicDocketViewer from "./pages/public/PublicDocketViewer";
import SmartRedirect from "./components/circuit/SmartRedirect";
import { FounderAuthProvider, useFounderAuth } from "./contexts/FounderAuthContext";
import { InvestorAuthProvider } from "./contexts/InvestorAuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'circuit-query-cache',
});

// Route logger for debugging
const RouteLogger = ({ name }: { name: string }) => {
  const location = useLocation();
  useEffect(() => {
    console.log(`[Router] ✓ Matched route: "${name}" | Path: ${location.pathname}`);
  }, [name, location.pathname]);
  return null;
};

// Layout wrapper that provides FounderAuth context
const FounderAuthLayout = () => {
  console.log("[Router] FounderAuthLayout mounting...");
  return (
    <FounderAuthProvider>
      <Outlet />
    </FounderAuthProvider>
  );
};

// Protected route wrapper for founders (must be used inside FounderAuthProvider)
const ProtectedRoute = ({ children, routeName }: { children: React.ReactNode; routeName: string }) => {
  const { user, isLoading } = useFounderAuth();

  console.log(`[ProtectedRoute:${routeName}] isLoading=${isLoading}, hasUser=${!!user}`);

  if (isLoading) {
    console.log(`[ProtectedRoute:${routeName}] Showing loading skeleton`);
    return (
      <div className="min-h-screen flex flex-col">
        <Skeleton className="h-14 w-full" />
        <div className="flex-1 flex">
          <div className="flex-1 p-12 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log(`[ProtectedRoute:${routeName}] No user, redirecting to /auth`);
    return <Navigate to="/auth" replace />;
  }

  console.log(`[ProtectedRoute:${routeName}] User authenticated, rendering children`);
  return <>{children}</>;
};

// Layout wrapper that provides InvestorAuth context
const InvestorAuthLayout = () => {
  console.log("[Router] InvestorAuthLayout mounting...");
  return (
    <InvestorAuthProvider>
      <Outlet />
    </InvestorAuthProvider>
  );
};

const App = () => {
  console.log("[App] Rendering, pathname:", window.location.pathname);
  
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            return query.meta?.persist !== false;
          },
        },
      }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirects - must come first */}
            <Route path="/login" element={<><RouteLogger name="redirect:/login" /><Navigate to="/auth" replace /></>} />
            {/* Legacy redirects for old /circuit/* URLs */}
            <Route path="/circuit" element={<><RouteLogger name="redirect:/circuit" /><Navigate to="/" replace /></>} />
            <Route path="/circuit/settings" element={<><RouteLogger name="redirect:/circuit/settings" /><Navigate to="/settings" replace /></>} />
            <Route path="/circuit/settings/rounds" element={<><RouteLogger name="redirect:/circuit/settings/rounds" /><Navigate to="/settings/rounds" replace /></>} />
            <Route path="/circuit/settings/domain" element={<><RouteLogger name="redirect:/circuit/settings/domain" /><Navigate to="/settings/domain" replace /></>} />
            <Route path="/circuit/settings/profile" element={<><RouteLogger name="redirect:/circuit/settings/profile" /><Navigate to="/settings/profile" replace /></>} />
            <Route path="/circuit/:roundSlug/pipeline/:variantSlug" element={<><RouteLogger name="redirect:/circuit/pipeline" /><Navigate to="/:roundSlug/pipeline" replace /></>} />
            <Route path="/circuit/:roundSlug/memo/:variantSlug" element={<><RouteLogger name="redirect:/circuit/memo" /><Navigate to="/:roundSlug/memo" replace /></>} />
            <Route path="/circuit/:roundSlug/docket/:variantSlug" element={<><RouteLogger name="redirect:/circuit/docket" /><Navigate to="/:roundSlug/docket" replace /></>} />
            {/* Legacy redirect from thesis */}
            <Route path="/thesis/*" element={<><RouteLogger name="redirect:/thesis" /><Navigate to="/" replace /></>} />
            
            {/* Legal & Info - no auth needed */}
            <Route path="/terms" element={<><RouteLogger name="terms" /><Terms /></>} />
            <Route path="/privacy" element={<><RouteLogger name="privacy" /><Privacy /></>} />
            <Route path="/pricing" element={<><RouteLogger name="pricing" /><Pricing /></>} />
            
            {/* Auth pages - NO AUTH CONTEXT, render instantly */}
            <Route path="/auth" element={<><RouteLogger name="auth" /><Auth /></>} />
            <Route path="/auth/invite" element={<><RouteLogger name="auth/invite" /><InviteCode /></>} />
            <Route path="/auth/email" element={<><RouteLogger name="auth/email" /><EmailAuth /></>} />
            
            {/* Protected founder routes - WITH AUTH CONTEXT */}
            <Route element={<FounderAuthLayout />}>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<><RouteLogger name="admin/login" /><AdminLogin /></>} />
              <Route path="/admin" element={<><RouteLogger name="admin" /><Admin /></>} />
              
              {/* Root - smart redirect to active round's pipeline */}
              <Route path="/" element={<><RouteLogger name="root" /><ProtectedRoute routeName="root"><SmartRedirect /></ProtectedRoute></>} />
              
              {/* Settings pages */}
              <Route path="/settings" element={<><RouteLogger name="settings" /><ProtectedRoute routeName="settings"><FounderSettings /></ProtectedRoute></>} />
              <Route path="/settings/rounds" element={<><RouteLogger name="settings:rounds" /><ProtectedRoute routeName="rounds-overview"><RoundsOverview /></ProtectedRoute></>} />
              <Route path="/settings/domain" element={<><RouteLogger name="settings:domain" /><ProtectedRoute routeName="custom-domain"><CustomDomain /></ProtectedRoute></>} />
              <Route path="/settings/profile" element={<><RouteLogger name="settings:profile" /><ProtectedRoute routeName="profile-settings"><ProfileSettings /></ProtectedRoute></>} />
              
              {/* Tool pages - new clean URLs without /circuit prefix */}
              <Route path="/:roundSlug/pipeline" element={<><RouteLogger name="pipeline" /><ProtectedRoute routeName="pipeline"><Pipeline /></ProtectedRoute></>} />
              <Route path="/:roundSlug/memo" element={<><RouteLogger name="memo" /><ProtectedRoute routeName="memo"><CircuitMemo /></ProtectedRoute></>} />
              <Route path="/:roundSlug/memo/:variantSlug" element={<><RouteLogger name="memo:variant" /><ProtectedRoute routeName="memo"><CircuitMemo /></ProtectedRoute></>} />
              <Route path="/:roundSlug/docket" element={<><RouteLogger name="docket" /><ProtectedRoute routeName="docket"><CircuitDocket /></ProtectedRoute></>} />
              <Route path="/:roundSlug/docket/:variantSlug" element={<><RouteLogger name="docket:variant" /><ProtectedRoute routeName="docket"><CircuitDocket /></ProtectedRoute></>} />
            </Route>
            
            {/* Public Investor Routes - WITH /share/ PREFIX to avoid conflicts */}
            <Route element={<InvestorAuthLayout />}>
              <Route path="/share/:companySlug/:roundCode/memo" element={<><RouteLogger name="share:memo:access" /><InvestorAccess tool="memo" /></>} />
              <Route path="/share/:companySlug/:roundCode/memo/:investorSlug" element={<><RouteLogger name="share:memo:investor" /><InvestorAccess tool="memo" /></>} />
              <Route path="/share/:companySlug/:roundCode/memo/:investorSlug/view" element={<><RouteLogger name="share:memo:view" /><PublicMemoViewer /></>} />
              <Route path="/share/:companySlug/:roundCode/docket" element={<><RouteLogger name="share:docket:access" /><InvestorAccess tool="docket" /></>} />
              <Route path="/share/:companySlug/:roundCode/docket/:investorSlug" element={<><RouteLogger name="share:docket:investor" /><InvestorAccess tool="docket" /></>} />
              <Route path="/share/:companySlug/:roundCode/docket/:investorSlug/view" element={<><RouteLogger name="share:docket:view" /><PublicDocketViewer /></>} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<><RouteLogger name="404" /><NotFound /></>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
