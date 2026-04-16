import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase';
import { initializeNeuralProfile } from '@/lib/neural-init';
import { clearRoleCache } from '@/hooks/useUserRole';
import { OrionAnalytics } from '@/lib/firebase-analytics-events';

type AccountType = 'advogado' | 'produtor' | 'afiliado' | 'nomade' | 'cliente';

const SCOPES_BY_ROLE: Record<AccountType, string[]> = {
  advogado: [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/youtube.readonly',
  ],
  produtor: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/youtube.readonly',
  ],
  nomade: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/tasks',
  ],
  afiliado: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/youtube.readonly',
  ],
  cliente: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/youtube.readonly',
  ],
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (accountType?: AccountType) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        initializedRef.current = true;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // After Google OAuth signup, apply the saved account type as role
        if (event === 'SIGNED_IN' && session?.user) {
          const pendingType = localStorage.getItem('pending_google_account_type');
          if (pendingType && pendingType !== 'cliente') {
            localStorage.removeItem('pending_google_account_type');
            try {
              await supabase.functions.invoke('admin-api', {
                body: { action: 'assign_role', user_id: session.user.id, role: pendingType },
              });
              clearRoleCache(session.user.id);
            } catch { /* ignore — fallback to cliente */ }
          } else if (pendingType) {
            localStorage.removeItem('pending_google_account_type');
          }
        }
      }
    );

    // THEN check for existing session — only update if onAuthStateChange hasn't fired yet
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (initializedRef.current) return; // onAuthStateChange already handled it

      // If refresh token is invalid/expired, clear the corrupted session
      if (error && (error.message?.includes('Refresh Token Not Found') || error.message?.includes('Invalid Refresh Token'))) {
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: Record<string, unknown> = {}) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      }
    });
    
    if (error) return { error: error as Error | null };
    
    // Silently initialize neural profile for new user
    if (data?.user?.id) {
      initializeNeuralProfile(data.user.id, (metadata?.account_type as "advogado" | "cliente") || "cliente");
    }
    
    OrionAnalytics.signUp('email');
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) OrionAnalytics.login('email');
    return { error: error as Error | null };
  };

  const signInWithGoogle = async (accountType: AccountType = 'cliente') => {
    const isCustomDomain =
      !window.location.hostname.includes('lovable.app') &&
      !window.location.hostname.includes('lovableproject.com');

    // Save the account type for post-OAuth role assignment
    if (accountType !== 'cliente') {
      localStorage.setItem('pending_google_account_type', accountType);
    }

    // POLICY: Minimum Scopes - Only request basic profile info during initial login.
    // Additional sensitive scopes are requested incrementally when needed via useGoogleScopes hook.
    const googleScopes = 'email profile';

    const oauthOptions = {
      redirectTo: `${window.location.origin}/dashboard`,
      scopes: googleScopes,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    };

    if (isCustomDomain) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { ...oauthOptions, skipBrowserRedirect: true },
      });

      if (error) return { error: error as Error | null };

      if (data?.url) {
        const oauthUrl = new URL(data.url);
        const allowedHosts = ['accounts.google.com', 'dlwafedtlvbvuoaopvsl.supabase.co'];
        if (!allowedHosts.some(host => oauthUrl.hostname === host)) {
          return { error: new Error('URL de redirecionamento OAuth inválida') };
        }
        window.location.href = data.url;
      }

      return { error: null };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: oauthOptions,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    clearRoleCache();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
