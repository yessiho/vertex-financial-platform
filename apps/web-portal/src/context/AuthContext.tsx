'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  sub: string;
  org_id: string;
  entity_id: string;
  role: string;
  mfa_verified: boolean;
  exp: number;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseJwt(token: string): AuthUser | null {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    if (stored) {
      const parsed = parseJwt(stored);
      if (parsed && parsed.exp * 1000 > Date.now()) {
        setToken(stored);
        setUser(parsed);
      } else {
        localStorage.removeItem('access_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    const parsed = parseJwt(newToken);
    setToken(newToken);
    setUser(parsed);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
