import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Petition from "./pages/compliance/Petition";
import ProfileSettings from "./pages/ProfileSettings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { StakeholderAuthProvider, useStakeholderAuth } from "./contexts/StakeholderAuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import Editor from "./pages/Editor";
import EditorLogin from "./pages/EditorLogin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes default
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'robomart-query-cache',
});

// FIX: Simplified ProtectedRoute - single redirect pattern, no useEffect
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { stakeholderSession, isLoading: stakeholderLoading } = useStakeholderAuth();

  if (stakeholderLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Skeleton className="h-14 w-full" />
        <div className="flex-1 flex">
          <div className="flex-1 p-12 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!stakeholderSession) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Don't persist auth-related queries
          return query.meta?.persist !== false;
        },
      },
    }}
  >
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <StakeholderAuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/editor/login" element={<EditorLogin />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Petition />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </StakeholderAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
