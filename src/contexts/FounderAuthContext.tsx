import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface FounderAuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  profileLoaded: boolean;
  companySlug: string | null;
  companyName: string | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const FounderAuthContext = createContext<FounderAuthContextType | undefined>(undefined);

export function FounderAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  
  // Track if we've completed initial load to prevent race conditions
  const initializedRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    console.log('[FounderAuth] Fetching profile for:', userId);
    const startTime = Date.now();
    
    const { data } = await supabase
      .from("profiles")
      .select("company_slug, company_name")
      .eq("id", userId)
      .maybeSingle();
    
    console.log(`[FounderAuth] Profile fetched in ${Date.now() - startTime}ms`);
    
    if (data) {
      setCompanySlug(data.company_slug);
      setCompanyName(data.company_name);
    }
    setProfileLoaded(true);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    console.log('[FounderAuth] Setting up auth listener');
    
    // Set up auth state listener - this is the SINGLE source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[FounderAuth] Auth state changed:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to prevent Supabase auth deadlock
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            setIsLoading(false);
            initializedRef.current = true;
          }, 0);
        } else {
          setCompanySlug(null);
          setCompanyName(null);
          setProfileLoaded(true);
          setIsLoading(false);
          initializedRef.current = true;
        }
      }
    );

    // Set a maximum wait time for initial load
    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        console.log('[FounderAuth] Timeout - forcing load complete');
        setIsLoading(false);
        setProfileLoaded(true);
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/thesis`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCompanySlug(null);
    setCompanyName(null);
    setProfileLoaded(false);
  };

  return (
    <FounderAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        profileLoaded,
        companySlug,
        companyName,
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
