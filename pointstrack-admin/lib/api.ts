// Thin client for the PointsTrack API (replaces Firebase Auth/Firestore/Storage).
// Handles token storage, the Authorization header, and transparent access-token
// refresh on 401.

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '')

const ACCESS_KEY = 'pt_access'
const REFRESH_KEY = 'pt_refresh'

// ---- Token storage (localStorage; SSR-safe) ----
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(REFRESH_KEY)
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACCESS_KEY, accessToken)
  window.localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ACCESS_KEY)
  window.localStorage.removeItem(REFRESH_KEY)
}

// Error carrying the HTTP status so callers can branch on it if needed.
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.error === 'string') return body.error
    if (body?.details) return Object.values(body.details).flat().join(', ')
  } catch {
    /* non-JSON response */
  }
  return res.statusText || 'Request failed'
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    return null
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string }
  setTokens(data.accessToken, data.refreshToken)
  return data.accessToken
}

async function request<T>(
  path: string,
  init: RequestInit & { isUpload?: boolean } = {},
  isRetry = false
): Promise<T> {
  const { isUpload, headers, ...rest } = init
  const token = getAccessToken()

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(isUpload ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (res.status === 401 && !isRetry && getRefreshToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return request<T>(path, init, true)
  }

  if (!res.ok) throw new ApiError(res.status, await parseError(res))
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
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
}

// ---- File uploads ----
export async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { url } = await request<{ url: string }>('/upload', {
    method: 'POST',
    body: form,
    isUpload: true,
  })
  return url
}

export async function uploadFiles(files: File[]): Promise<string[]> {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const { urls } = await request<{ urls: string[] }>('/upload/multiple', {
    method: 'POST',
    body: form,
    isUpload: true,
  })
  return urls
}

// ---- Shared shapes ----
export interface AuthUser {
  id: string
  email: string
  role: 'organizer' | 'student'
}

export interface College {
  id: string
  name: string
  shortName?: string | null
  vtuCode?: string | null
  region?: string | null
  isActive: boolean
}

export interface Club {
  id: string
  name: string
  slug: string
  collegeId?: string | null
  college?: string | null
  description?: string | null
  status: 'pending' | 'active' | 'rejected' | 'suspended' | 'archived'
  role?: string
  branding?: {
    logoUrl?: string | null
    coverImageUrl?: string | null
    accentColor?: string | null
    secondaryColor?: string | null
    coverStyle?: string | null
  } | null
}

export interface OrganizerProfile {
  id: string
  email: string
  fullName?: string | null
  clubName: string
  college: string
  bio?: string | null
  establishedDate?: string | null
  coreTeam?: string | null
  logo?: string | null
  coverImage?: string | null
  accentColor?: string | null
  links?: { type: string; url: string }[]
  gallery?: string[]
  announcement?: string | null
  announcementLink?: string | null
  coverStyle?: 'gradient' | 'solid' | null
  secondaryColor?: string | null
  hiddenSections?: string[]
}

export const DEFAULT_ACCENT = '#06B6D4'

export const LINK_TYPES = ['website', 'instagram', 'whatsapp', 'email', 'twitter', 'linkedin', 'youtube', 'facebook'] as const

export const CLUB_SECTIONS = [
  { key: 'announcement', label: 'Announcement' },
  { key: 'about', label: 'About / bio' },
  { key: 'stats', label: 'Established & team' },
  { key: 'links', label: 'Links' },
  { key: 'gallery', label: 'Photo gallery' },
  { key: 'events', label: 'Events' },
] as const

interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  profile: unknown
  club: OrganizerProfile | null
  clubs?: Club[]
  memberships?: any[]
}

// ---- Auth & Club helpers ----
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/login', { email, password })
  setTokens(data.accessToken, data.refreshToken)
  return data
}

export async function registerOrganizer(payload: {
  email: string
  password: string
  fullName?: string
  clubName: string
  college: string
  collegeId?: string
  bio?: string
  establishedDate?: string
  coreTeam?: string
}): Promise<AuthResponse> {
  const data = await api.post<AuthResponse>('/auth/register/organizer', payload)
  setTokens(data.accessToken, data.refreshToken)
  return data
}

export async function fetchMe(): Promise<{
  user: AuthUser
  profile: unknown
  club: OrganizerProfile | null
  clubs?: Club[]
  memberships?: any[]
}> {
  return api.get('/auth/me')
}

export async function fetchColleges(query?: { search?: string; region?: string }): Promise<College[]> {
  const params = new URLSearchParams()
  if (query?.search) params.append('search', query.search)
  if (query?.region) params.append('region', query.region)
  const qs = params.toString()
  return api.get(`/colleges${qs ? `?${qs}` : ''}`)
}

export async function createClub(payload: {
  name: string
  collegeId?: string
  college?: string
  description?: string
}): Promise<{ club: Club }> {
  return api.post('/clubs', payload)
}

export async function fetchMyClubs(): Promise<{ membership: any; club: Club }[]> {
  return api.get('/clubs/my-memberships')
}

export interface Volunteer {
  studentId: string
  name: string
  email: string
  usn: string
  addedAt?: string
}

export async function listVolunteers(eventId: string): Promise<Volunteer[]> {
  return api.get(`/events/${eventId}/volunteers`)
}

export async function addVolunteer(eventId: string, by: { usn?: string; email?: string }): Promise<Volunteer> {
  return api.post(`/events/${eventId}/volunteers`, by)
}

export async function removeVolunteer(eventId: string, studentId: string): Promise<void> {
  await api.del(`/events/${eventId}/volunteers/${studentId}`)
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  try {
    if (refreshToken) await api.post('/auth/logout', { refreshToken })
  } finally {
    clearTokens()
  }
}
