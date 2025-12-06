import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  company_slug: string | null;
  company_name: string | null;
  full_name: string | null;
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
    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_slug, company_name, full_name, onboarding_completed")
      .eq("id", userId)
      .single();

    if (!error && data) {
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
    // 1. Get initial session with performance logging
    const start = performance.now();
    console.log("[Auth] Starting getSession...");
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(`[Auth] getSession completed in ${(performance.now() - start).toFixed(0)}ms, hasSession: ${!!session}`);
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const profileStart = performance.now();
        fetchProfile(session.user.id).then(() => {
          console.log(`[Auth] fetchProfile completed in ${(performance.now() - profileStart).toFixed(0)}ms`);
        });
      } else {
        setProfileLoaded(true);
      }
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(() => fetchProfile(session.user.id), 0);
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
