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
  fullName: string | null;
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
  const [fullName, setFullName] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("company_slug, company_name, full_name")
        .eq("id", userId)
        .maybeSingle();
      
      if (data) {
        setCompanySlug(data.company_slug);
        setCompanyName(data.company_name);
        setFullName(data.full_name);
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
    let timeoutId: NodeJS.Timeout;

    // Initialize auth state with timeout fallback
    const initializeAuth = async () => {
      // Timeout fallback - if auth takes longer than 5 seconds, continue without auth
      timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
          console.warn('[Auth] Session check timed out after 5s, continuing without auth');
          setProfileLoaded(true);
          setIsLoading(false);
        }
      }, 5000);

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);
        if (!mounted) return;
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        } else {
          setProfileLoaded(true);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Auth initialization error:', error);
        setProfileLoaded(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // Set up auth state listener for subsequent changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        
        // Skip INITIAL_SESSION since we handle it above
        if (event === 'INITIAL_SESSION') return;
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer to prevent deadlock
          setTimeout(() => {
            if (mounted) fetchProfile(newSession.user.id);
          }, 0);
        } else {
          setCompanySlug(null);
          setCompanyName(null);
          setFullName(null);
          setProfileLoaded(true);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
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
        fullName,
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
