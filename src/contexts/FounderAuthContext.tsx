import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  const fetchProfile = async (userId: string) => {
    console.log(`[Auth] fetchProfile: querying profile for ${userId.slice(0, 8)}...`);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_slug, company_name, full_name, avatar_url, onboarding_completed")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[Auth] fetchProfile error:", error.message);
    } else if (data) {
      console.log(`[Auth] fetchProfile success: companyName=${data.company_name}, fullName=${data.full_name}`);
      setProfile(data);
    }
    setProfileLoaded(true);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const start = performance.now();
      console.log("[Auth] Starting getSession...");
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log(`[Auth] getSession completed in ${(performance.now() - start).toFixed(0)}ms, hasSession: ${!!session}, userId: ${session?.user?.id?.slice(0, 8) || 'none'}`);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const profileStart = performance.now();
          console.log(`[Auth] Starting fetchProfile for user: ${session.user.id.slice(0, 8)}...`);
          await fetchProfile(session.user.id);
          console.log(`[Auth] fetchProfile completed in ${(performance.now() - profileStart).toFixed(0)}ms`);
        } else {
          console.log("[Auth] No session, setting profileLoaded=true");
          setProfileLoaded(true);
        }
      } catch (error) {
        console.error("[Auth] Error in initAuth:", error);
        setProfileLoaded(true);
      } finally {
        console.log("[Auth] Setting isLoading=false");
        setIsLoading(false);
      }
    };

    initAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[Auth] onAuthStateChange: event=${event}, hasSession=${!!session}`);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(() => {
            console.log(`[Auth] Deferred fetchProfile for user: ${session.user.id.slice(0, 8)}...`);
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setProfileLoaded(true);
        }
      }
    );

    return () => subscription.unsubscribe();
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
    await supabase.auth.signOut();
    setProfile(null);
    setProfileLoaded(false);
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
