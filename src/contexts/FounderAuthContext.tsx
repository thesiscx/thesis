import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  company_slug: string | null;
  company_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean | null;
}

interface FounderAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  profileLoaded: boolean;
  profile: Profile | null;
  companySlug: string | null;
  companyName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const FounderAuthContext = createContext<FounderAuthContextType | undefined>(undefined);

export function FounderAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Use ref to track if init completed (avoids stale closure in timeout)
  const initCompleted = useRef(false);

  const fetchProfile = async (userId: string) => {
    const start = performance.now();
    console.log(`[Auth:${Date.now()}] fetchProfile: STARTING for ${userId.slice(0, 8)}...`);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, company_slug, company_name, full_name, avatar_url, onboarding_completed")
        .eq("id", userId)
        .single();

      const elapsed = (performance.now() - start).toFixed(0);
      if (error) {
        console.error(`[Auth:${Date.now()}] fetchProfile error after ${elapsed}ms:`, error.message);
      } else if (data) {
        console.log(`[Auth:${Date.now()}] fetchProfile SUCCESS in ${elapsed}ms: companyName=${data.company_name}, fullName=${data.full_name}`);
        setProfile(data);
      } else {
        console.log(`[Auth:${Date.now()}] fetchProfile: no data returned after ${elapsed}ms`);
      }
    } catch (err) {
      console.error(`[Auth:${Date.now()}] fetchProfile exception:`, err);
    }
    console.log(`[Auth:${Date.now()}] fetchProfile: setting profileLoaded=true`);
    setProfileLoaded(true);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Safety timeout: force loading=false after 10 seconds
    const timeoutId = setTimeout(() => {
      if (!initCompleted.current) {
        console.error("[Auth] TIMEOUT: Auth stuck loading for 10s, forcing isLoading=false");
        setIsLoading(false);
        setProfileLoaded(true);
      }
    }, 10000);

    const initAuth = async () => {
      const start = performance.now();
      console.log("[Auth] initAuth starting...");
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error(`[Auth] getSession error:`, error);
        }
        
        console.log(`[Auth] getSession completed in ${(performance.now() - start).toFixed(0)}ms, hasSession: ${!!session}, userId: ${session?.user?.id?.slice(0, 8) || 'none'}`);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          console.log("[Auth] No session, setting profileLoaded=true");
          setProfileLoaded(true);
        }
      } catch (error) {
        console.error("[Auth] Error in initAuth:", error);
        setProfileLoaded(true);
      } finally {
        console.log("[Auth] initAuth complete, setting isLoading=false");
        initCompleted.current = true;
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[Auth] onAuthStateChange: event=${event}, hasSession=${!!session}`);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileLoaded(true);
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear local state immediately (important for Safari)
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoaded(false);
    
    // Clear React Query persisted cache to prevent stale data on next login
    try {
      window.localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
      console.log("[Auth] Cleared React Query cache");
    } catch (e) {
      console.error("[Auth] Failed to clear React Query cache:", e);
    }
    
    // Sign out with local scope to avoid server-side session issues
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error("[Auth] signOut error (continuing anyway):", error);
    }
  };

  return (
    <FounderAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        profileLoaded,
        profile,
        companySlug: profile?.company_slug ?? null,
        companyName: profile?.company_name ?? null,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </FounderAuthContext.Provider>
  );
}

export function useFounderAuth() {
  const context = useContext(FounderAuthContext);
  if (context === undefined) {
    throw new Error("useFounderAuth must be used within a FounderAuthProvider");
  }
  return context;
}
