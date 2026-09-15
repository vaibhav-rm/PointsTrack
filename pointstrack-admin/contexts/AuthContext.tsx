"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  fetchMe,
  getAccessToken,
  clearTokens,
  type AuthUser,
  type OrganizerProfile,
  type Club,
} from '@/lib/api';

interface AuthContextType {
  user: AuthUser | null;
  profile: OrganizerProfile | null;
  clubs: Club[];
  selectedClub: Club | null;
  loading: boolean;
  setProfile: (profile: OrganizerProfile) => void;
  selectClub: (club: Club) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  clubs: [],
  selectedClub: null,
  loading: true,
  setProfile: () => {},
  selectClub: () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const SELECTED_CLUB_KEY = 'pointstrack_selected_club_id';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadSession = async () => {
    if (!getAccessToken()) {
      setUser(null);
      setProfile(null);
      setClubs([]);
      setSelectedClub(null);
      if (typeof window !== 'undefined') localStorage.removeItem(SELECTED_CLUB_KEY);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me.user);
      setProfile(me.club ?? null);

      const userClubs = me.clubs || [];
      setClubs(userClubs);

      // Restore stored club selection if user is an active member, otherwise fallback
      const storedId = typeof window !== 'undefined' ? localStorage.getItem(SELECTED_CLUB_KEY) : null;
      const validStoredClub = userClubs.find((c) => c.id === storedId);

      if (validStoredClub) {
        setSelectedClub(validStoredClub);
      } else if (userClubs.length > 0) {
        setSelectedClub(userClubs[0]);
        if (typeof window !== 'undefined') localStorage.setItem(SELECTED_CLUB_KEY, userClubs[0].id);
      } else {
        setSelectedClub(null);
        if (typeof window !== 'undefined') localStorage.removeItem(SELECTED_CLUB_KEY);
      }
    } catch (error) {
      clearTokens();
      setUser(null);
      setProfile(null);
      setClubs([]);
      setSelectedClub(null);
      if (typeof window !== 'undefined') localStorage.removeItem(SELECTED_CLUB_KEY);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const me = await fetchMe();
      setProfile(me.club ?? null);
      setClubs(me.clubs || []);
      const userClubs = me.clubs || [];
      const storedId = typeof window !== 'undefined' ? localStorage.getItem(SELECTED_CLUB_KEY) : null;
      const validStoredClub = userClubs.find((c) => c.id === storedId);

      if (validStoredClub) {
        setSelectedClub(validStoredClub);
      } else if (userClubs.length > 0) {
        setSelectedClub(userClubs[0]);
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  const selectClub = (club: Club) => {
    setSelectedClub(club);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SELECTED_CLUB_KEY, club.id);
    }
  };

  // Run session initialization ONCE on mount (prevent unnecessary /auth/me refetch on route change)
  useEffect(() => {
    loadSession();
  }, []);

  const isOrganizerRoute = pathname.startsWith('/organizer');
  const isAuthRoute = pathname === '/organizer/login' || pathname === '/organizer/register';
  const isCreateClubRoute = pathname === '/organizer/create-club';
  const needsAuthOnly = isCreateClubRoute;
  const isProtected = isOrganizerRoute && !isAuthRoute;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (isProtected) router.push('/organizer/login');
      return;
    }

    const hasClub = !!profile || clubs.length > 0;
    if (!hasClub && isProtected && !needsAuthOnly) {
      router.push('/organizer/create-club');
    } else if (hasClub && (isAuthRoute || isCreateClubRoute)) {
      router.push('/organizer/dashboard');
    } else if (isAuthRoute) {
      router.push('/organizer/create-club');
    }
  }, [user, profile, clubs, loading, isAuthRoute, isCreateClubRoute, needsAuthOnly, isProtected, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        clubs,
        selectedClub,
        loading,
        setProfile,
        selectClub,
        refreshProfile,
      }}
    >
      {isProtected && loading ? null : children}
    </AuthContext.Provider>
  );
};
