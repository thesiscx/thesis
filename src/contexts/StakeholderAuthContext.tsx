import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface StakeholderSession {
  stakeholderId: string;
  name: string;
  organization: string | null;
  accessKeyId: string;
  accessKey: string;
}

interface StakeholderAuthContextType {
  stakeholderSession: StakeholderSession | null;
  isLoading: boolean;
  validateAndSetSession: (key: string) => Promise<{ success: boolean; error?: string }>;
  clearStakeholderSession: () => void;
}

const StakeholderAuthContext = createContext<StakeholderAuthContextType>({
  stakeholderSession: null,
  isLoading: true,
  validateAndSetSession: async () => ({ success: false }),
  clearStakeholderSession: () => {},
});

export const useStakeholderAuth = () => {
  const context = useContext(StakeholderAuthContext);
  if (!context) {
    throw new Error("useStakeholderAuth must be used within StakeholderAuthProvider");
  }
  return context;
};

const STAKEHOLDER_SESSION_KEY = 'stakeholder_session';

export const StakeholderAuthProvider = ({ children }: { children: ReactNode }) => {
  const [stakeholderSession, setStakeholderSession] = useState<StakeholderSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Background validation - non-blocking
  const validateInBackground = async (session: StakeholderSession) => {
    try {
      console.log('[Stakeholder Auth] Background validation starting');
      
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
        console.log('[Stakeholder Auth] Key explicitly invalid, clearing session');
        clearStakeholderSession();
        return;
      }

      // For 200 responses, check if valid is explicitly false
      if (response.ok) {
        const data = await response.json();
        if (data.valid === false) {
          console.log('[Stakeholder Auth] Key invalid per response, clearing session');
          clearStakeholderSession();
          return;
        }
        console.log('[Stakeholder Auth] Background validation successful');
      }
      // Server errors (500+) or network issues - keep session (benefit of the doubt)
    } catch (error) {
      console.log('[Stakeholder Auth] Background validation network error, keeping session');
    }
  };

  useEffect(() => {
    // Immediately load from localStorage (no blocking)
    const stored = localStorage.getItem(STAKEHOLDER_SESSION_KEY);
    
    if (stored) {
      try {
        const session = JSON.parse(stored);
        console.log('[Stakeholder Auth] Loaded session from localStorage immediately');
        setStakeholderSession(session);
        
        // Validate in background (non-blocking)
        validateInBackground(session);
      } catch {
        console.log('[Stakeholder Auth] Corrupted session data, clearing');
        localStorage.removeItem(STAKEHOLDER_SESSION_KEY);
      }
    }
    
    // Set loading to false immediately - don't block UI
    setIsLoading(false);
  }, []);

  const validateAndSetSession = async (key: string): Promise<{ success: boolean; error?: string }> => {
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

      if (data.valid && data.stakeholder) {
        const session: StakeholderSession = {
          stakeholderId: data.stakeholder.id,
          name: data.stakeholder.name,
          organization: data.stakeholder.organization,
          accessKeyId: data.accessKeyId,
          accessKey: key,
        };

        setStakeholderSession(session);
        localStorage.setItem(STAKEHOLDER_SESSION_KEY, JSON.stringify(session));

        return { success: true };
      }

      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Error validating access key:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const clearStakeholderSession = () => {
    setStakeholderSession(null);
    localStorage.removeItem(STAKEHOLDER_SESSION_KEY);
  };

  return (
    <StakeholderAuthContext.Provider
      value={{
        stakeholderSession,
        isLoading,
        validateAndSetSession,
        clearStakeholderSession,
      }}
    >
      {children}
    </StakeholderAuthContext.Provider>
  );
};