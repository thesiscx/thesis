import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  signOut: (redirectTo?: string) => Promise<void>;
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("company_slug, company_name")
        .eq("id", userId)
        .maybeSingle();
      
      if (data) {
        setCompanySlug(data.company_slug);
        setCompanyName(data.company_name);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    setProfileLoaded(true);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Failsafe timeout - force loading complete after 5 seconds
    const failsafeTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth loading timeout - forcing complete');
        setIsLoading(false);
        setProfileLoaded(true);
      }
    }, 5000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer Supabase calls to prevent deadlock
          setTimeout(() => {
            if (!mounted) return;
            fetchProfile(newSession.user.id).finally(() => {
              if (mounted) setIsLoading(false);
            });
          }, 0);
        } else {
          setCompanySlug(null);
          setCompanyName(null);
          setProfileLoaded(true);
          setIsLoading(false);
        }
      }
    );

    // Trigger initial session check
    supabase.auth.getSession();

    return () => {
      mounted = false;
      clearTimeout(failsafeTimeout);
      subscription.unsubscribe();
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
    const redirectUrl = `${window.location.origin}/circuit`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async (redirectTo?: string) => {
    // Clear state immediately for instant UX
    setUser(null);
    setSession(null);
    setCompanySlug(null);
    setCompanyName(null);
    setProfileLoaded(false);
    
    // MUST wait for Supabase to clear localStorage session before redirect
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('SignOut error:', error);
    }
    
    // Redirect AFTER signOut completes
    if (redirectTo) {
      window.location.href = redirectTo;
    }
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
