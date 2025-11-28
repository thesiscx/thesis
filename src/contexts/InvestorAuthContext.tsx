import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface InvestorSession {
  investorId: string;
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
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-access-key`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ key: session.accessKey }),
        }
      );

      // Only clear session if explicitly invalid (401/403)
      if (response.status === 401 || response.status === 403) {
        console.log('[Investor Auth] Key explicitly invalid, clearing session');
        clearInvestorSession();
        return;
      }

      // For 200 responses, check if valid is explicitly false
      if (response.ok) {
        const data = await response.json();
        if (data.valid === false) {
          console.log('[Investor Auth] Key invalid per response, clearing session');
          clearInvestorSession();
          return;
        }
        console.log('[Investor Auth] Background validation successful');
      }
      // Server errors (500+) or network issues - keep session (benefit of the doubt)
    } catch (error) {
      console.log('[Investor Auth] Background validation network error, keeping session');
    }
  };

  useEffect(() => {
    // Immediately load from localStorage (no blocking)
    const stored = localStorage.getItem(INVESTOR_SESSION_KEY);
    
    if (stored) {
      try {
        const session = JSON.parse(stored);
        console.log('[Investor Auth] Loaded session from localStorage immediately');
        setInvestorSession(session);
        
        // Validate in background (non-blocking)
        validateInBackground(session);
      } catch {
        console.log('[Investor Auth] Corrupted session data, clearing');
        localStorage.removeItem(INVESTOR_SESSION_KEY);
      }
    }
    
    // Set loading to false immediately - don't block UI
    setIsLoading(false);
  }, []);

  const validateAndSetSession = async (key: string): Promise<{ 
    success: boolean; 
    error?: string;
    session?: InvestorSession;
  }> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-access-key`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ key }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Invalid access key' };
      }

      // Handle both investor-specific and global keys
      if (data.valid && data.round && data.workspace) {
        const isGlobal = !data.investor || !data.investor.id;
        
        const session: InvestorSession = {
          investorId: isGlobal ? 'global' : data.investor.id,
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
      return { success: false, error: 'Network error. Please try again.' };
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

