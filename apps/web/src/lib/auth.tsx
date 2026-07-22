import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api.js';
import type { AppConfig, SelfUser } from './types.js';

interface AuthState {
  user: SelfUser | null;
  config: AppConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: SelfUser | null) => void;
  logout: () => Promise<void>;
  hasRole: (role: 'STUDENT' | 'TUTOR' | 'ADMIN') => boolean;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SelfUser | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { user } = await api.get<{ user: SelfUser | null }>('/auth/me');
    setUser(user);
  };

  useEffect(() => {
    Promise.all([
      api.get<AppConfig>('/config').then(setConfig).catch(() => undefined),
      refresh().catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const hasRole = (role: 'STUDENT' | 'TUTOR' | 'ADMIN') => !!user?.roles.includes(role);

  return (
    <AuthContext.Provider value={{ user, config, loading, refresh, setUser, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
