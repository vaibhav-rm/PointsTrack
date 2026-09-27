import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  hydrateTokens,
  getAccessToken,
  fetchMe,
  fetchMyMemberships,
  membershipGrantsOrganizer,
  login as apiLogin,
  logout as apiLogout,
  registerStudent as apiRegister,
  deleteAccount as apiDeleteAccount,
  clearTokens,
  type AuthUser,
  type StudentProfile,
  type MembershipRow,
} from '../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  profile: StudentProfile | null;
  memberships: MembershipRow[];
  loading: boolean;
  /** True for organizer/admin accounts AND student accounts holding a staff
   *  club role (owner/admin/event_manager). Only these see organizer screens. */
  canOrganize: boolean;
  /** Club-owner presidents: students who also run a club (both accounts). */
  isPresident: boolean;
  /** Pure organizer account without a student profile. */
  isOrganizerAccount: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Parameters<typeof apiRegister>[0]) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshMemberships: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  memberships: [],
  loading: true,
  canOrganize: false,
  isPresident: false,
  isOrganizerAccount: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  refreshProfile: async () => {},
  refreshMemberships: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMemberships = useCallback(async () => {
    try {
      setMemberships(await fetchMyMemberships(true));
    } catch {
      setMemberships([]);
    }
  }, []);

  const applySession = useCallback(
    async (me: { user: AuthUser; profile: StudentProfile | null }) => {
      setUser(me.user);
      setProfile(me.profile);
      await loadMemberships();
    },
    [loadMemberships]
  );

  // On startup: hydrate persisted tokens, then resolve the session.
  // All roles are welcome here now — organizers get their own home instead
  // of being bounced (see canOrganize below).
  useEffect(() => {
    (async () => {
      await hydrateTokens();
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        await applySession(me);
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, [applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiLogin(email, password);
      setUser(data.user);
      setProfile(data.profile);
      await loadMemberships();
    },
    [loadMemberships]
  );

  const register = useCallback(
    async (payload: Parameters<typeof apiRegister>[0]) => {
      const data = await apiRegister(payload);
      setUser(data.user);
      setProfile(data.profile);
      await loadMemberships();
    },
    [loadMemberships]
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setProfile(null);
    setMemberships([]);
  }, []);

  const deleteAccount = useCallback(async () => {
    await apiDeleteAccount();
    setUser(null);
    setProfile(null);
    setMemberships([]);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me.user);
      setProfile(me.profile);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  }, []);

  const refreshMemberships = useCallback(async () => {
    await loadMemberships();
  }, [loadMemberships]);

  const { canOrganize, isPresident, isOrganizerAccount } = useMemo(() => {
    const staff = memberships.some((m) => membershipGrantsOrganizer(m.membership));
    const president = memberships.some(
      (m) => m.membership.role === 'owner' && m.membership.status === 'active'
    );
    const organizerAccount = user?.role === 'organizer' || user?.role === 'admin';
    return {
      canOrganize: organizerAccount || staff,
      isPresident: president,
      isOrganizerAccount: organizerAccount && !profile,
    };
  }, [memberships, user, profile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        memberships,
        loading,
        canOrganize,
        isPresident,
        isOrganizerAccount,
        login,
        register,
        logout,
        deleteAccount,
        refreshProfile,
        refreshMemberships,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
