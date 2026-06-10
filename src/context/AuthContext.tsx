import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  companyId: string;
  isSuperAdmin: boolean;
  setupComplete: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  company: any | null;
  settings: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setCompany(data.company);
        setSettings(data.settings);
      } else {
        setUser(null);
        setCompany(null);
        setSettings(null);
      }
    } catch (e) {
      console.error("Error fetching auth session status", e);
      setUser(null);
      setCompany(null);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setUser(null);
      setCompany(null);
      setSettings(null);
    } catch (e) {
      console.error("Error logging out", e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/session/refresh', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setCompany(data.company);
        setSettings(data.settings);
      }
    } catch (e) {
      console.error("Error refreshing auth session", e);
    }
  };

  const value: AuthContextValue = {
    user,
    company,
    settings,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
