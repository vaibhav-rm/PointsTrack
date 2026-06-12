"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  fetchMe,
  getAccessToken,
  clearTokens,
  type AuthUser,
  type OrganizerProfile,
} from '@/lib/api';

interface AuthContextType {
  user: AuthUser | null;
  profile: OrganizerProfile | null;
  loading: boolean;
  setProfile: (profile: OrganizerProfile) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  setProfile: () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadSession = async () => {
    // No token at all → definitely logged out, skip the network call.
    if (!getAccessToken()) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me.user);
      setProfile(me.profile);
    } catch (error) {
      // Token invalid/expired and refresh failed → treat as logged out.
      clearTokens();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const me = await fetchMe();
      setProfile(me.profile);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  // Re-check the session whenever the path changes (cheap once token is gone).
  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Only the organizer portal is gated. Everything else (the marketing site)
  // is public and must render for logged-out visitors.
  const isOrganizerRoute = pathname.startsWith('/organizer');
  const isAuthRoute = pathname === '/organizer/login' || pathname === '/organizer/register';
  const isProtected = isOrganizerRoute && !isAuthRoute;

  // Handle redirects based on auth state and current path.
  useEffect(() => {
    if (loading) return;

    if (user && isAuthRoute) {
      router.push('/organizer/dashboard');
    } else if (!user && isProtected) {
      router.push('/organizer/login');
    }
  }, [user, loading, isAuthRoute, isProtected, router]);

  // Gate only protected routes on the auth check; marketing pages render at once.
  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile, refreshProfile }}>
      {isProtected && loading ? null : children}
    </AuthContext.Provider>
  );
};
