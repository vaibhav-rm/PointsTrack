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
      // The organizer portal works off the club profile (an account may be a
      // plain student with no club — then there's nothing to manage here).
      setProfile(me.club ?? null);
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
      setProfile(me.club ?? null);
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
  const isCreateClubRoute = pathname === '/organizer/create-club';
  // Needs a login, but NOT a club yet (that's where we send club-less accounts).
  const needsAuthOnly = isCreateClubRoute;
  const isProtected = isOrganizerRoute && !isAuthRoute;

  // Handle redirects based on auth state, club ownership, and current path.
  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (isProtected) router.push('/organizer/login');
      return;
    }

    // Logged in. An account becomes an "organizer" by creating a club; until
    // then, funnel them to the create-club onboarding instead of the dashboard.
    const hasClub = !!profile;
    if (!hasClub && isProtected && !needsAuthOnly) {
      router.push('/organizer/create-club');
    } else if (hasClub && (isAuthRoute || isCreateClubRoute)) {
      router.push('/organizer/dashboard');
    } else if (isAuthRoute) {
      // Logged in with no club, sitting on login/register → go create one.
      router.push('/organizer/create-club');
    }
  }, [user, profile, loading, isAuthRoute, isCreateClubRoute, needsAuthOnly, isProtected, router]);

  // Gate only protected routes on the auth check; marketing pages render at once.
  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile, refreshProfile }}>
      {isProtected && loading ? null : children}
    </AuthContext.Provider>
  );
};
