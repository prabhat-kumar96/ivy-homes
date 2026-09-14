'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { loadSession, saveSession, clearSession, getValidToken, doLogin, doLogout, type Session } from '@/lib/auth';

interface AuthContextType {
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshIfNeeded: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setSession(stored);
      setToken(stored.accessToken);
    }
    setIsLoading(false);
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
    const newSession = await doLogin(email, password);
    setSession(newSession);
    setToken(newSession.accessToken);
  }, []);

  const logout = useCallback(async () => {
    if (token) await doLogout(token);
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
    <AuthContext.Provider value={{ session, token, isLoading, login, logout, refreshIfNeeded }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
