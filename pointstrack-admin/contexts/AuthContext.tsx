"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface OrganizerProfile {
  college: string;
  clubName: string;
  role: string;
  bio?: string;
  logo?: string;
  coverImage?: string;
  establishedDate?: string;
  coreTeam?: string;
}

interface AuthContextType {
  user: User | null;
  profile: OrganizerProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const organizerDoc = await getDoc(doc(db, 'organizers', firebaseUser.uid));
          if (organizerDoc.exists()) {
            setProfile(organizerDoc.data() as OrganizerProfile);
          }
        } catch (error) {
          console.error("Error fetching organizer profile:", error);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle redirects separately based on auth state and current path
  useEffect(() => {
    if (loading) return; // Wait for initial auth check

    const publicPaths = ['/organizer/login', '/organizer/register', '/'];
    const isPublic = publicPaths.includes(pathname);

    if (user && isPublic && pathname !== '/') {
      router.push('/organizer/dashboard');
    } else if (!user && !isPublic) {
      router.push('/organizer/login');
    }
  }, [user, loading, pathname, router]);

  // Don't render protected children until the auth check has verified the path
  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
