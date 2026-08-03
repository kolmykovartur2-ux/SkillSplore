import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api.js';

export interface AdminSelf {
  id: number;
  email: string;
  displayName: string;
}

export interface AgentConfig {
  appEnv: 'development' | 'demo' | 'production';
  defaultTimezone: string;
  mockLinkedinApi: boolean;
  contentAiProvider: string;
  launch: { country: string; city: string; category: string; stage: string };
}

interface AuthState {
  user: AdminSelf | null;
  config: AgentConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: AdminSelf | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminSelf | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setUser(await api.get<AdminSelf>('/auth/me'));
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    Promise.all([api.get<AgentConfig>('/config').then(setConfig).catch(() => undefined), refresh()]).finally(() =>
      setLoading(false),
    );
  }, []);

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, config, loading, refresh, setUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
