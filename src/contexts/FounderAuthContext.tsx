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
  isAdmin: boolean | null;
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  const initializedRef = useRef(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("company_slug, company_name")
      .eq("id", userId)
      .maybeSingle();
    
    if (data) {
      setCompanySlug(data.company_slug);
      setCompanyName(data.company_name);
    }
    setProfileLoaded(true);
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Get session synchronously first (from localStorage cache)
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession) {
        setSession(existingSession);
        setUser(existingSession.user);
        // Fetch profile and admin status in parallel
        Promise.all([
          fetchProfile(existingSession.user.id),
          checkAdminRole(existingSession.user.id)
        ]).then(() => {
          setIsLoading(false);
          initializedRef.current = true;
        });
      } else {
        setIsLoading(false);
        setProfileLoaded(true);
        initializedRef.current = true;
      }
    });

    // Set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Only update if session actually changed
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer Supabase calls to prevent deadlock
          setTimeout(() => {
            Promise.all([
              fetchProfile(newSession.user.id),
              checkAdminRole(newSession.user.id)
            ]).then(() => {
              if (!initializedRef.current) {
                setIsLoading(false);
                initializedRef.current = true;
              }
            });
          }, 0);
        } else {
          setCompanySlug(null);
          setCompanyName(null);
          setIsAdmin(null);
          setProfileLoaded(true);
          if (!initializedRef.current) {
            setIsLoading(false);
            initializedRef.current = true;
          }
        }
      }
    );

    return () => {
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

  const signOut = async (redirectTo?: string) => {
    // Clear state immediately for instant UX
    setUser(null);
    setSession(null);
    setCompanySlug(null);
    setCompanyName(null);
    setIsAdmin(null);
    setProfileLoaded(false);
    
    // Redirect immediately if path provided
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    
    // Fire and forget - let Supabase invalidate in background
    supabase.auth.signOut().catch(console.error);
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
        isAdmin,
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
