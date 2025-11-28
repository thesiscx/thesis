import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InvestorSession {
  investorId: string | null;  // null for global keys (not 'global' string to avoid UUID errors)
  investorName: string;
  investorSlug: string;
  roundId: string;
  roundCode: string;
  roundType: string;
  roundNumber: number;
  companySlug: string;
  companyName: string;
  tool: 'memo' | 'docket';
  accessKeyId: string;
  accessKey: string;
}

interface InvestorAuthContextType {
  investorSession: InvestorSession | null;
  isLoading: boolean;
  validateAndSetSession: (key: string) => Promise<{ 
    success: boolean; 
    error?: string;
    session?: InvestorSession;
  }>;
  clearInvestorSession: () => void;
}

const InvestorAuthContext = createContext<InvestorAuthContextType>({
  investorSession: null,
  isLoading: true,
  validateAndSetSession: async () => ({ success: false }),
  clearInvestorSession: () => {},
});

export const useInvestorAuth = () => {
  const context = useContext(InvestorAuthContext);
  if (!context) {
    throw new Error("useInvestorAuth must be used within InvestorAuthProvider");
  }
  return context;
};

const INVESTOR_SESSION_KEY = 'investor_session';

export const InvestorAuthProvider = ({ children }: { children: ReactNode }) => {
  const [investorSession, setInvestorSession] = useState<InvestorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Background validation - non-blocking
  const validateInBackground = async (session: InvestorSession) => {
    try {
      console.log('[Investor Auth] Background validation starting');
      
      const { data, error } = await supabase.functions.invoke('validate-access-key', {
        body: { key: session.accessKey },
      });

      if (error) {
        // Only clear on auth errors, not network errors
        if (error.message?.includes('401') || error.message?.includes('403')) {
          console.log('[Investor Auth] Key explicitly invalid, clearing session');
          clearInvestorSession();
        }
        return;
      }

      if (data?.valid === false) {
        console.log('[Investor Auth] Key invalid per response, clearing session');
        clearInvestorSession();
        return;
      }
      
      console.log('[Investor Auth] Background validation successful');
    } catch (error) {
      console.log('[Investor Auth] Background validation network error, keeping session');
    }
  };

  useEffect(() => {
    // Check localStorage synchronously
    const stored = localStorage.getItem(INVESTOR_SESSION_KEY);
    
    if (stored) {
      try {
        const session = JSON.parse(stored);
        console.log('[Investor Auth] Loaded session from localStorage');
        setInvestorSession(session);
        
        // Validate in background (non-blocking)
        validateInBackground(session);
      } catch {
        console.log('[Investor Auth] Corrupted session data, clearing');
        localStorage.removeItem(INVESTOR_SESSION_KEY);
      }
    }
    
    // CRITICAL: Set loading to false AFTER checking localStorage
    // This prevents race conditions where components redirect before session is loaded
    setIsLoading(false);
  }, []);

  const validateAndSetSession = async (key: string): Promise<{ 
    success: boolean; 
    error?: string;
    session?: InvestorSession;
  }> => {
    // Create timeout for 10 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });

    try {
      const fetchPromise = supabase.functions.invoke('validate-access-key', {
        body: { key },
      });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        console.error('Edge function error:', error);
        return { success: false, error: 'Failed to validate key. Please try again.' };
      }

      if (!data || data.error) {
        return { success: false, error: data?.error || 'Invalid access key' };
      }

      // Handle both investor-specific and global keys
      if (data.valid && data.round && data.workspace) {
        const isGlobal = !data.investor || !data.investor.id;
        
        const session: InvestorSession = {
          // Use null for global keys to avoid UUID query errors
          investorId: isGlobal ? null : data.investor.id,
          investorName: isGlobal ? 'Investor' : data.investor.name,
          investorSlug: isGlobal ? 'global' : data.investor.slug,
          roundId: data.round.id,
          roundCode: data.round.roundCode,
          roundType: data.round.roundType,
          roundNumber: data.round.roundNumber,
          companySlug: data.workspace.companySlug,
          companyName: data.workspace.companyName,
          tool: data.tool,
          accessKeyId: data.accessKeyId,
          accessKey: key,
        };

        setInvestorSession(session);
        localStorage.setItem(INVESTOR_SESSION_KEY, JSON.stringify(session));

        return { success: true, session };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Error validating access key:', error);
      const message = error instanceof Error && error.message === 'Request timeout' 
        ? 'Request timed out. Please try again.'
        : 'Network error. Please try again.';
      return { success: false, error: message };
    }
  };

  const clearInvestorSession = () => {
    setInvestorSession(null);
    localStorage.removeItem(INVESTOR_SESSION_KEY);
  };

  return (
    <InvestorAuthContext.Provider
      value={{
        investorSession,
        isLoading,
        validateAndSetSession,
        clearInvestorSession,
      }}
    >
      {children}
    </InvestorAuthContext.Provider>
  );
};

