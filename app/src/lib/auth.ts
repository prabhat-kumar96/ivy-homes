// Session management for Ivy Homes frontend
// FINDING: expires_in=900 (15min not 24h) — must store expiry and use refresh_token
// FINDING: auth response key is "access_token" not "token"

import { login, refreshToken, logout, type AuthResponse } from './api';

export interface Session {
  accessToken: string;
  refreshToken: string;
  email: string;
  expiresAt: number; // Unix ms
}

const SESSION_KEY = 'ivy_session';

export function saveSession(auth: AuthResponse): Session {
  const session: Session = {
    accessToken: auth.access_token,
    refreshToken: auth.refresh_token,
    email: auth.user.email,
    expiresAt: Date.now() + auth.expires_in * 1000,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function getValidToken(): Promise<string | null> {
  const session = loadSession();
  if (!session) return null;

  const now = Date.now();
  // If token expires in less than 60 seconds, try to refresh
  if (now >= session.expiresAt - 60000) {
    try {
      const refreshed = await refreshToken(session.refreshToken);
      const newSession = saveSession(refreshed);
      return newSession.accessToken;
    } catch {
      // Refresh failed — session is dead
      clearSession();
      return null;
    }
  }

  return session.accessToken;
}

export async function doLogin(email: string, password: string): Promise<Session> {
  const auth = await login(email, password);
  return saveSession(auth);
}

export async function doLogout(token: string): Promise<void> {
  await logout(token);
  clearSession();
}

export function isLoggedIn(): boolean {
  const session = loadSession();
  if (!session) return false;
  // Consider logged in if token is still valid or we have refresh token
  // (refresh token has longer validity)
  return !!session.refreshToken;
}
