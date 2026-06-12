// Client for the PointsTrack API (replaces Firebase Auth/Firestore/Storage).
// Tokens live in AsyncStorage with an in-memory cache so requests stay sync-fast,
// and an expired access token is refreshed transparently on a 401.
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

const ACCESS_KEY = 'pt_access';
const REFRESH_KEY = 'pt_refresh';

// In-memory cache (hydrated once at startup) to avoid awaiting storage per call.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function hydrateTokens(): Promise<void> {
  const [a, r] = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
  accessToken = a[1];
  refreshToken = r[1];
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await AsyncStorage.multiSet([
    [ACCESS_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === 'string') return body.error;
    if (body?.details) {
      return Object.values(body.details).flat().join(', ');
    }
  } catch {
    /* non-JSON */
  }
  return 'Request failed';
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clearTokens();
    return null;
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  await setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function request<T>(
  path: string,
  init: RequestInit & { isUpload?: boolean } = {},
  isRetry = false
): Promise<T> {
  const { isUpload, headers, ...rest } = init;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(isUpload ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (res.status === 401 && !isRetry && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, init, true);
  }

  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Upload a local file URI (from expo-image-picker) as multipart form data.
export async function uploadImage(uri: string): Promise<string> {
  const name = uri.substring(uri.lastIndexOf('/') + 1) || `upload-${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(name);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';

  const form = new FormData();
  // React Native's FormData accepts this { uri, name, type } shape for files.
  form.append('file', { uri, name, type } as any);

  const { url } = await request<{ url: string }>('/upload', {
    method: 'POST',
    body: form as any,
    isUpload: true,
  });
  return url;
}

// ---- Shared shapes ----
export interface AuthUser {
  id: string;
  email: string;
  role: 'organizer' | 'student';
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  college: string;
  collegeCode?: string | null;
  region?: string | null;
  usn: string;
  year: number;
  semester: number;
  lateralEntry: boolean;
  requiredPoints: number;
  pushToken?: string | null;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  profile: StudentProfile;
}

// ---- Auth helpers (persist tokens as a side effect) ----
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/login', { email, password });
  await setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function registerStudent(payload: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  college: string;
  collegeCode?: string;
  region?: string;
  usn: string;
  year: number;
  semester: number;
  lateralEntry: boolean;
}): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/register/student', payload);
  await setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function fetchMe(): Promise<{ user: AuthUser; profile: StudentProfile }> {
  return api.get('/auth/me');
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function logout(): Promise<void> {
  try {
    if (refreshToken) await api.post('/auth/logout', { refreshToken });
  } finally {
    await clearTokens();
  }
}

export async function deleteAccount(): Promise<void> {
  try {
    await api.del('/auth/me');
  } finally {
    await clearTokens();
  }
}
