'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { loadSession, saveSession, clearSession, getValidToken, doLogin, doLogout, type Session } from '@/lib/auth';

interface AuthContextType {
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  switchAccount: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshIfNeeded: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on mount: load stored or auto-login demo1 for seamless demo experience
  useEffect(() => {
    async function initAuth() {
      const stored = loadSession();
      if (stored) {
        setSession(stored);
        setToken(stored.accessToken);
        setIsLoading(false);
        return;
      }

      // Check if user explicitly logged out
      const explicitLogout = typeof window !== 'undefined' && localStorage.getItem('ivy_explicit_logout') === 'true';
      if (!explicitLogout) {
        try {
          const autoSession = await doLogin('demo1@ivy.homes', 'fc3a4005e1');
          setSession(autoSession);
          setToken(autoSession.accessToken);
        } catch (e) {
          console.error('Auto-login demo account failed:', e);
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  // Auto-refresh token before it expires
  useEffect(() => {
    if (!session) return;
    const msUntilRefresh = session.expiresAt - Date.now() - 60000; // refresh 60s early
    if (msUntilRefresh <= 0) return;
    const timer = setTimeout(async () => {
      const newToken = await getValidToken();
      if (newToken) {
        setToken(newToken);
        const updated = loadSession();
        if (updated) setSession(updated);
      } else {
        setSession(null);
        setToken(null);
      }
    }, msUntilRefresh);
    return () => clearTimeout(timer);
  }, [session]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const newSession = await doLogin(email, password);
      if (typeof window !== 'undefined') localStorage.removeItem('ivy_explicit_logout');
      setSession(newSession);
      setToken(newSession.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchAccount = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const newSession = await doLogin(email, 'fc3a4005e1');
      if (typeof window !== 'undefined') localStorage.removeItem('ivy_explicit_logout');
      setSession(newSession);
      setToken(newSession.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) await doLogout(token).catch(() => {});
    clearSession();
    if (typeof window !== 'undefined') localStorage.setItem('ivy_explicit_logout', 'true');
    setSession(null);
    setToken(null);
  }, [token]);

  const refreshIfNeeded = useCallback(async (): Promise<string | null> => {
    const t = await getValidToken();
    if (t && t !== token) {
      setToken(t);
      const updated = loadSession();
      if (updated) setSession(updated);
    }
    return t;
  }, [token]);

  return (
    <AuthContext.Provider value={{ session, token, isLoading, login, switchAccount, logout, refreshIfNeeded }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
