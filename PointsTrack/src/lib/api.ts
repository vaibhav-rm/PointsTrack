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

// Single-flight refresh: parallel 401s (e.g. a screen firing 2-3 requests at
// once) must share ONE /auth/refresh call. The server rotates refresh tokens,
// so N parallel refreshes would revoke each other and log the user out.
let refreshPromise: Promise<string | null> | null = null;
function singleFlightRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Unique key per user action; sent as Idempotency-Key so network retries
// replay the original response instead of duplicating the write.
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
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
    const refreshed = await singleFlightRefresh();
    if (refreshed) return request<T>(path, init, true);
  }

  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: { idempotencyKey?: string }) =>
    request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  // Paginated fetch with the server's X-Total-Count for real pagers.
  getPage: async <T>(path: string): Promise<{ data: T; total: number | null }> => {
    const doFetch = async (): Promise<Response> =>
      fetch(`${API_URL}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
    let res = await doFetch();
    if (res.status === 401 && refreshToken) {
      const refreshed = await singleFlightRefresh();
      if (refreshed) res = await doFetch();
    }
    if (!res.ok) throw new ApiError(res.status, await parseError(res));
    const data = (await res.json()) as T;
    const totalHeader = res.headers.get('X-Total-Count');
    return { data, total: totalHeader ? parseInt(totalHeader, 10) : null };
  },
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
  role: 'organizer' | 'student' | 'admin';
}

export type ClubRole = 'owner' | 'admin' | 'event_manager' | 'scanner' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'rejected' | 'removed';

export interface ClubItem {
  id: string;
  name: string;
  slug: string;
  collegeId?: string | null;
  college?: string | null;
  description?: string | null;
  status: string;
  branding?: { logoUrl?: string | null; accentColor?: string | null } | null;
  role?: ClubRole;
}

export interface MembershipItem {
  id: string;
  accountId: string;
  clubId: string;
  role: ClubRole;
  status: MembershipStatus;
  club: ClubItem;
}

// Staff roles that grant organizer powers in-app. Presidents (owners) always
// qualify — this is how a student holds both a student profile and an
// organizer account in one login.
export const ORGANIZER_ROLES: ClubRole[] = ['owner', 'admin', 'event_manager'];

export function membershipGrantsOrganizer(m: { role: ClubRole; status: MembershipStatus }): boolean {
  return m.status === 'active' && (ORGANIZER_ROLES as string[]).includes(m.role);
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  college: string;
  collegeId?: string | null;
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
  profile: StudentProfile | null;
  club?: unknown | null;
  clubs?: ClubItem[];
  memberships?: MembershipItem[];
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
  collegeId?: string;
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

export async function fetchMe(): Promise<{
  user: AuthUser;
  profile: StudentProfile | null;
  club?: unknown | null;
  clubs?: ClubItem[];
  memberships?: MembershipItem[];
}> {
  return api.get('/auth/me');
}

export interface CollegeItem {
  id?: string;
  name: string;
  code: string;
  vtuCode?: string;
  region: string;
}

export async function fetchColleges(query?: { search?: string; region?: string }): Promise<CollegeItem[]> {
  const params = new URLSearchParams();
  if (query?.search) params.append('search', query.search);
  if (query?.region) params.append('region', query.region);
  const qs = params.toString();
  const rows = await api.get<any[]>(`/colleges${qs ? `?${qs}` : ''}`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.vtuCode || r.shortName || '',
    vtuCode: r.vtuCode || undefined,
    region: r.region || 'Bangalore',
  }));
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

// ---- Clubs: browse, join (verified by club), leave ----
export async function fetchClubs(query?: { search?: string; collegeId?: string }): Promise<ClubItem[]> {
  const params = new URLSearchParams({ limit: '50' });
  if (query?.search) params.append('search', query.search);
  if (query?.collegeId) params.append('collegeId', query.collegeId);
  return api.get<ClubItem[]>(`/clubs?${params}`);
}

export interface MembershipRow {
  membership: {
    id: string;
    accountId: string;
    clubId: string;
    role: ClubRole;
    status: MembershipStatus;
  };
  club: ClubItem;
}

export async function fetchMyMemberships(includePending = true): Promise<MembershipRow[]> {
  return api.get<MembershipRow[]>(
    `/clubs/my-memberships${includePending ? '?includePending=true' : ''}`
  );
}

export async function joinClub(clubId: string): Promise<unknown> {
  return api.post(`/clubs/${clubId}/join`, {}, { idempotencyKey: newIdempotencyKey() });
}

export async function leaveClub(clubId: string, membershipId: string): Promise<void> {
  await api.del(`/clubs/${clubId}/members/${membershipId}`);
}

// ---- Club verification (owners/admins approve member requests) ----
export interface ClubMemberRow {
  membershipId: string;
  accountId: string;
  role: ClubRole;
  status: MembershipStatus;
  joinedAt: string;
  studentName: string | null;
  studentEmail: string | null;
  usn: string | null;
}

export async function fetchClubMembers(clubId: string, status?: MembershipStatus): Promise<ClubMemberRow[]> {
  const qs = status ? `?status=${status}` : '';
  return api.get<ClubMemberRow[]>(`/clubs/${clubId}/members${qs}`);
}

export async function moderateMember(
  clubId: string,
  membershipId: string,
  status: 'active' | 'rejected' | 'removed',
  role?: ClubRole
): Promise<unknown> {
  return api.patch(`/clubs/${clubId}/members/${membershipId}`, { status, role });
}

// ---- Organizer events (same API the web dashboard uses) ----
export interface OrgEvent {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startDate?: string;
  location?: string | null;
  points: number;
  capacity: number;
  openToAll: boolean;
  attendeeCount?: number;
  checkedInCount?: number;
}

export async function fetchMyOrgEvents(): Promise<OrgEvent[]> {
  return api.get<OrgEvent[]>('/events/mine?limit=100');
}

export async function createOrgEvent(payload: {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  points?: number;
  capacity?: number;
  openToAll?: boolean;
  images?: string[];
}): Promise<OrgEvent> {
  return api.post<OrgEvent>('/events', payload, { idempotencyKey: newIdempotencyKey() });
}

export async function deleteOrgEvent(eventId: string): Promise<void> {
  await api.del(`/events/${eventId}`);
}

export async function setAttendeeStatus(
  attendeeId: string,
  status: 'checked-in' | 'rejected',
  engagement = 'High'
): Promise<unknown> {
  return api.patch(`/attendees/${attendeeId}`, { status, engagement });
}
