import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import Onboarding from "./pages/thesis/Onboarding";
import ThesisMemo from "./pages/thesis/ThesisMemo";
import ThesisDocket from "./pages/thesis/ThesisDocket";
import NotFound from "./pages/NotFound";
import { FounderAuthProvider, useFounderAuth } from "./contexts/FounderAuthContext";
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
        <FounderAuthProvider>
          <Routes>
            {/* Auth */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Thesis Routes */}
            <Route
              path="/thesis"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/thesis/:roundSlug/memo/:variantSlug"
              element={
                <ProtectedRoute>
                  <ThesisMemo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/thesis/:roundSlug/docket/:variantSlug"
              element={
                <ProtectedRoute>
                  <ThesisDocket />
                </ProtectedRoute>
              }
            />
            
            {/* Redirects */}
            <Route path="/" element={<Navigate to="/thesis" replace />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </FounderAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
