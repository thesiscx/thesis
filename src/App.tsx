import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import InviteCode from "./pages/auth/InviteCode";
import EmailAuth from "./pages/auth/EmailAuth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/thesis/Onboarding";
import ThesisMemo from "./pages/thesis/ThesisMemo";
import ThesisDocket from "./pages/thesis/ThesisDocket";
import FounderSettings from "./pages/thesis/FounderSettings";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import InvestorAccess from "./pages/public/InvestorAccess";
import PublicMemoViewer from "./pages/public/PublicMemoViewer";
import PublicDocketViewer from "./pages/public/PublicDocketViewer";
import { FounderAuthProvider, useFounderAuth } from "./contexts/FounderAuthContext";
import { AuthProvider } from "./contexts/AuthContext";
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

// Protected route wrapper for founders
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

// Admin routes wrapper with AuthProvider
const AdminRoutes = () => (
  <AuthProvider>
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="" element={<Admin />} />
    </Routes>
  </AuthProvider>
);

// Thesis routes wrapped in shared provider
const ThesisRoutes = () => (
  <FounderAuthProvider>
    <Routes>
      <Route path="" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="settings" element={<ProtectedRoute><FounderSettings /></ProtectedRoute>} />
      <Route path=":roundSlug/memo/:variantSlug" element={<ProtectedRoute><ThesisMemo /></ProtectedRoute>} />
      <Route path=":roundSlug/docket/:variantSlug" element={<ProtectedRoute><ThesisDocket /></ProtectedRoute>} />
    </Routes>
  </FounderAuthProvider>
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
          {/* Admin Routes - separate auth context */}
          <Route path="/admin/*" element={<AdminRoutes />} />
          
          {/* Auth Routes */}
          <Route path="/auth" element={<FounderAuthProvider><Auth /></FounderAuthProvider>} />
          <Route path="/auth/invite" element={<FounderAuthProvider><InviteCode /></FounderAuthProvider>} />
          <Route path="/auth/email" element={<FounderAuthProvider><EmailAuth /></FounderAuthProvider>} />
          
          {/* Legal & Info */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/pricing" element={<Pricing />} />
          
          {/* Thesis Routes (protected, shared auth) */}
          <Route path="/thesis/*" element={<ThesisRoutes />} />
          
          {/* Public Investor Routes */}
          <Route path="/:companySlug/:roundCode/memo" element={
            <InvestorAuthProvider><InvestorAccess tool="memo" /></InvestorAuthProvider>
          } />
          <Route path="/:companySlug/:roundCode/memo/:investorSlug" element={
            <InvestorAuthProvider><InvestorAccess tool="memo" /></InvestorAuthProvider>
          } />
          <Route path="/:companySlug/:roundCode/memo/:investorSlug/view" element={
            <InvestorAuthProvider><PublicMemoViewer /></InvestorAuthProvider>
          } />
          <Route path="/:companySlug/:roundCode/docket" element={
            <InvestorAuthProvider><InvestorAccess tool="docket" /></InvestorAuthProvider>
          } />
          <Route path="/:companySlug/:roundCode/docket/:investorSlug" element={
            <InvestorAuthProvider><InvestorAccess tool="docket" /></InvestorAuthProvider>
          } />
          <Route path="/:companySlug/:roundCode/docket/:investorSlug/view" element={
            <InvestorAuthProvider><PublicDocketViewer /></InvestorAuthProvider>
          } />
          
          {/* Redirects */}
          <Route path="/" element={<Navigate to="/thesis" replace />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
