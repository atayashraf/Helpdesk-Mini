import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setAuthToken } from '../api/client';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'agent' | 'admin';
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
};

const STORAGE_KEY = 'helpdesk_auth';

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const persisted = localStorage.getItem(STORAGE_KEY);
    if (!persisted) return null;
    try {
      const parsed = JSON.parse(persisted) as { user?: AuthUser; token?: string };
      return parsed.user ?? null;
    } catch (error) {
      console.warn('Failed to parse auth storage', error);
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    const persisted = localStorage.getItem(STORAGE_KEY);
    if (!persisted) return null;
    try {
      const parsed = JSON.parse(persisted) as { user?: AuthUser; token?: string };
      return parsed.token ?? null;
    } catch {
      return null;
    }
  });

  const login = (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const value = useMemo(() => ({ user, token, login, logout }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
