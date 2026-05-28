import type { Photo } from '@/types';

// Derive server URL from the browser's own hostname so the build works on
// any network without rebuilding. Falls back to env / localhost for SSR.
const SERVER =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

function adminFetch(input: string, init?: RequestInit) {
  return fetch(input, { ...init, credentials: 'include' });
}

export interface AdminGuestSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: number;
  lastSeen: number;
  photoCount: number;
  status?: 'Active' | 'Idle' | 'Left event';
}

export interface AdminEventSettingsResponse {
  id: string;
  name: string;
  organizerName: string;
  eventDate: string;
  eventType: string;
  expectedGuests: number;
  retentionPolicy: string;
  storageWarning: number;
  status: string;
  createdAt: number;
  handoffPreparedAt: number | null;
  handoffCompletedAt: number | null;
  mediaDeletedAt: number | null;
  closedAt: number | null;
  photoCount: number;
  guestCount: number;
  activeGuests: number;
  storageUsed: number;
  storageTotal: number;
}

export interface AdminPhotoRecord extends Photo {
  sizeBytes?: number;
  flagged?: boolean;
}

export async function joinEvent(params: {
  username: string;
  avatar?: File | null;
  userId?: string | null;
  deviceId?: string | null;
  eventId?: string;
}): Promise<{ userId: string; username: string; avatarUrl: string | null }> {
  const form = new FormData();
  form.append('username', params.username);
  form.append('eventId', params.eventId || 'demo');
  if (params.userId)   form.append('userId', params.userId);
  if (params.deviceId) form.append('deviceId', params.deviceId);
  if (params.avatar)   form.append('avatar', params.avatar);

  const res = await fetch(`${SERVER}/users/join`, { method: 'POST', body: form });
  if (res.status === 409) throw new Error('That nickname is already taken');
  if (!res.ok) throw new Error('Failed to join');
  return res.json();
}

export async function updateAvatar(
  userId: string,
  avatar: File,
): Promise<{ userId: string; username: string; avatarUrl: string | null }> {
  const form = new FormData();
  form.append('avatar', avatar);
  const res = await fetch(`${SERVER}/users/${userId}/avatar`, { method: 'PATCH', body: form });
  if (!res.ok) throw new Error('Failed to update photo');
  return res.json();
}

export async function changeUsername(
  userId: string,
  username: string,
  eventId = 'demo',
): Promise<{ username: string }> {
  const res = await fetch(`${SERVER}/users/${userId}/username`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, eventId }),
  });
  if (res.status === 409) throw new Error('That nickname is already taken');
  if (!res.ok) throw new Error('Failed to update nickname');
  return res.json();
}

export async function uploadPhoto(file: File, username: string): Promise<Response> {
  const form = new FormData();
  form.append('photo', file);
  form.append('username', username);
  return fetch(`${SERVER}/upload/demo`, { method: 'POST', body: form });
}

export function uploadPhotoWithProgress(
  file: File,
  username: string,
  onProgress: (pct: number) => void,
): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('photo', file);
    form.append('username', username);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error('Upload failed'));
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('POST', `${SERVER}/upload/demo`);
    xhr.send(form);
  });
}

export async function checkDevice(
  deviceId: string,
  eventId = 'demo',
): Promise<{ userId: string; username: string; avatarUrl: string | null } | null> {
  // Returns null on 404 (not registered), throws on network/server error
  const res = await fetch(
    `${SERVER}/users/device?deviceId=${encodeURIComponent(deviceId)}&eventId=${encodeURIComponent(eventId)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Server error');
  return res.json();
}

export async function deletePhoto(photoId: string, username: string): Promise<void> {
  const res = await fetch(
    `${SERVER}/photos/${photoId}?username=${encodeURIComponent(username)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('Delete failed');
}

export async function likePhoto(photoId: string, userId: string): Promise<{ likeCount: number; likedByMe: boolean }> {
  const res = await fetch(`${SERVER}/photos/${photoId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Like failed');
  return res.json();
}

export async function unlikePhoto(photoId: string, userId: string): Promise<{ likeCount: number; likedByMe: boolean }> {
  const res = await fetch(`${SERVER}/photos/${photoId}/like?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Unlike failed');
  return res.json();
}

export function photoUrl(url: string): string {
  return `${SERVER}${url}`;
}

export async function adminLogin(password: string): Promise<{ ok: boolean }> {
  const res = await adminFetch(`${SERVER}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Invalid password');
  return res.json();
}

export async function adminLogout(): Promise<{ ok: boolean }> {
  const res = await adminFetch(`${SERVER}/admin/logout`, { method: 'GET' });
  return res.json();
}

export async function checkAdmin(): Promise<{ admin: boolean }> {
  const res = await adminFetch(`${SERVER}/admin/me`, { method: 'GET' });
  if (res.status === 401) return { admin: false };
  if (!res.ok) throw new Error('Server error');
  return res.json();
}

export async function getNetworkInfo(): Promise<{ ips: string[]; port: number }> {
  const res = await adminFetch(`${SERVER}/admin/network`);
  if (!res.ok) throw new Error('Failed to fetch network info');
  return res.json();
}

export async function getAdminStats(eventId = 'demo'): Promise<{
  photoCount: number;
  guestCount: number;
  activeGuests: number;
  storageUsed: number;
}> {
  const res = await adminFetch(`${SERVER}/admin/stats?eventId=${encodeURIComponent(eventId)}`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function getRecentPhotos(eventId = 'demo', limit = 10): Promise<Photo[]> {
  const res = await adminFetch(`${SERVER}/admin/recent-photos?eventId=${encodeURIComponent(eventId)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent photos');
  return res.json();
}

export async function getRecentGuests(eventId = 'demo', limit = 10): Promise<AdminGuestSummary[]> {
  const res = await adminFetch(`${SERVER}/admin/recent-guests?eventId=${encodeURIComponent(eventId)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent guests');
  return res.json();
}

export async function getAllPhotos(eventId = 'demo'): Promise<AdminPhotoRecord[]> {
  const res = await adminFetch(`${SERVER}/admin/photos?eventId=${encodeURIComponent(eventId)}`);
  if (!res.ok) throw new Error('Failed to fetch photos');
  return res.json();
}

export async function getAllGuests(eventId = 'demo'): Promise<AdminGuestSummary[]> {
  const res = await adminFetch(`${SERVER}/admin/guests?eventId=${encodeURIComponent(eventId)}`);
  if (!res.ok) throw new Error('Failed to fetch guests');
  return res.json();
}

export async function getAdminEventSettings(eventId = 'demo'): Promise<AdminEventSettingsResponse> {
  const res = await adminFetch(`${SERVER}/admin/event-settings?eventId=${encodeURIComponent(eventId)}`);
  if (!res.ok) throw new Error('Failed to fetch admin event settings');
  return res.json();
}

export async function saveAdminEventSettings(payload: {
  eventId?: string;
  name: string;
  organizerName: string;
  eventDate: string;
  eventType: string;
  expectedGuests: string;
  retentionPolicy: string;
  storageWarning: string;
}) {
  const res = await adminFetch(`${SERVER}/admin/event-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save admin event settings');
  return res.json() as Promise<AdminEventSettingsResponse>;
}

export async function prepareAdminEventExport(eventId = 'demo') {
  const res = await adminFetch(`${SERVER}/admin/export-package`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  if (!res.ok) throw new Error('Failed to prepare export package');
  return res.json();
}

export async function markAdminHandoffComplete(eventId = 'demo') {
  const res = await adminFetch(`${SERVER}/admin/handoff-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  if (!res.ok) throw new Error('Failed to mark handoff complete');
  return res.json();
}

export async function deleteAdminEventMedia(eventId = 'demo') {
  const res = await adminFetch(`${SERVER}/admin/delete-media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  if (!res.ok) throw new Error('Failed to delete event media');
  return res.json();
}

export async function deleteAdminEventRecord(eventId = 'demo') {
  const res = await adminFetch(`${SERVER}/admin/delete-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  if (!res.ok) throw new Error('Failed to delete event record');
  return res.json();
}

export function exportAdminPhotos(payload: { eventId?: string; photoIds?: string[]; exportAll?: boolean }) {
  const params = new URLSearchParams();
  params.set('eventId', payload.eventId || 'demo');
  if (payload.exportAll) params.set('exportAll', '1');
  if (payload.photoIds?.length) params.set('photoIds', payload.photoIds.join(','));
  return `${SERVER}/admin/photos/export?${params.toString()}`;
}

export async function deleteAdminPhotos(payload: { eventId?: string; photoIds: string[] }) {
  const res = await adminFetch(`${SERVER}/admin/photos/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: payload.eventId || 'demo', photoIds: payload.photoIds }),
  });
  if (!res.ok) throw new Error('Failed to delete selected photos');
  return res.json() as Promise<{ ok: boolean; deletedCount: number; photos: AdminPhotoRecord[] }>;
}

export async function setAdminPhotoFlag(payload: { eventId?: string; photoId: string; flagged: boolean }) {
  const res = await adminFetch(`${SERVER}/admin/photos/${payload.photoId}/flag`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: payload.eventId || 'demo', flagged: payload.flagged }),
  });
  if (!res.ok) throw new Error('Failed to update photo moderation flag');
  return res.json() as Promise<{ ok: boolean; photo: { id: string; flagged: boolean } }>;
}

export function exportAdminGuests(payload: { eventId?: string; guestIds?: string[] }) {
  const params = new URLSearchParams();
  params.set('eventId', payload.eventId || 'demo');
  if (payload.guestIds?.length) params.set('guestIds', payload.guestIds.join(','));
  return `${SERVER}/admin/guests/export?${params.toString()}`;
}

export function exportAdminGuestAlbum(payload: { eventId?: string; guestId: string }) {
  const params = new URLSearchParams();
  params.set('eventId', payload.eventId || 'demo');
  return `${SERVER}/admin/guests/${payload.guestId}/album?${params.toString()}`;
}

export async function deleteAdminGuestPhotos(payload: { eventId?: string; guestId: string }) {
  const res = await adminFetch(`${SERVER}/admin/guests/${payload.guestId}/photos/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: payload.eventId || 'demo' }),
  });
  if (!res.ok) throw new Error('Failed to delete guest photos');
  return res.json() as Promise<{ ok: boolean; deletedCount: number; guests: AdminGuestSummary[]; photos: AdminPhotoRecord[] }>;
}

export { SERVER };
