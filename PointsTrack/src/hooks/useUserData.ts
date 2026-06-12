import { useAuth } from '../contexts/AuthContext';
import type { StudentProfile } from '../lib/api';

// The signed-in student's profile now lives in AuthContext (sourced from
// GET /auth/me). This hook keeps the old call sites working unchanged.
export type UserData = StudentProfile;

const useUserData = () => {
  const { profile, loading } = useAuth();
  return { userData: profile, loading };
};

export default useUserData;
