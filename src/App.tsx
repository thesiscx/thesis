import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import Auth from "./pages/Auth";
import InviteCode from "./pages/auth/InviteCode";
import EmailAuth from "./pages/auth/EmailAuth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/thesis/Dashboard";
import ThesisMemo from "./pages/thesis/ThesisMemo";
import ThesisDocket from "./pages/thesis/ThesisDocket";
import ThesisCircuit from "./pages/thesis/ThesisCircuit";
import FounderSettings from "./pages/thesis/FounderSettings";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import InvestorAccess from "./pages/public/InvestorAccess";
import PublicMemoViewer from "./pages/public/PublicMemoViewer";
import PublicDocketViewer from "./pages/public/PublicDocketViewer";
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
  key: 'thesis-query-cache',
});

// Layout wrapper that provides FounderAuth context
const FounderAuthLayout = () => (
  <FounderAuthProvider>
    <Outlet />
  </FounderAuthProvider>
);

// Protected route wrapper for founders (must be used inside FounderAuthProvider)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useFounderAuth();

  if (isLoading) {
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
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Layout wrapper that provides InvestorAuth context
const InvestorAuthLayout = () => (
  <InvestorAuthProvider>
    <Outlet />
  </InvestorAuthProvider>
);

const App = () => (
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
          <Route path="/" element={<Navigate to="/thesis" replace />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          
          {/* Legal & Info - no auth needed */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/pricing" element={<Pricing />} />
          
          {/* All founder + admin routes share one FounderAuthProvider */}
          <Route element={<FounderAuthLayout />}>
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />
            
            {/* Auth pages (not protected) */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/invite" element={<InviteCode />} />
            <Route path="/auth/email" element={<EmailAuth />} />
            
            {/* Thesis pages (protected) */}
            <Route path="/thesis" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/thesis/settings" element={<ProtectedRoute><FounderSettings /></ProtectedRoute>} />
            <Route path="/thesis/:roundSlug/circuit/:variantSlug" element={<ProtectedRoute><ThesisCircuit /></ProtectedRoute>} />
            <Route path="/thesis/:roundSlug/memo/:variantSlug" element={<ProtectedRoute><ThesisMemo /></ProtectedRoute>} />
            <Route path="/thesis/:roundSlug/docket/:variantSlug" element={<ProtectedRoute><ThesisDocket /></ProtectedRoute>} />
          </Route>
          
          {/* Public Investor Routes - share one InvestorAuthProvider */}
          <Route element={<InvestorAuthLayout />}>
            <Route path="/:companySlug/:roundCode/memo" element={<InvestorAccess tool="memo" />} />
            <Route path="/:companySlug/:roundCode/memo/:investorSlug" element={<InvestorAccess tool="memo" />} />
            <Route path="/:companySlug/:roundCode/memo/:investorSlug/view" element={<PublicMemoViewer />} />
            <Route path="/:companySlug/:roundCode/docket" element={<InvestorAccess tool="docket" />} />
            <Route path="/:companySlug/:roundCode/docket/:investorSlug" element={<InvestorAccess tool="docket" />} />
            <Route path="/:companySlug/:roundCode/docket/:investorSlug/view" element={<PublicDocketViewer />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
