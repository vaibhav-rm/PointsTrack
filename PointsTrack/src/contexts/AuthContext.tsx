import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  hydrateTokens,
  getAccessToken,
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  registerStudent as apiRegister,
  deleteAccount as apiDeleteAccount,
  clearTokens,
  type AuthUser,
  type StudentProfile,
} from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  profile: StudentProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Parameters<typeof apiRegister>[0]) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // On startup: hydrate persisted tokens, then resolve the session.
  useEffect(() => {
    (async () => {
      await hydrateTokens();
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me.user);
        setProfile(me.profile);
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    setProfile(data.profile);
  }, []);

  const register = useCallback(async (payload: Parameters<typeof apiRegister>[0]) => {
    const data = await apiRegister(payload);
    setUser(data.user);
    setProfile(data.profile);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await apiDeleteAccount();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const me = await fetchMe();
      setProfile(me.profile);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, login, register, logout, deleteAccount, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
