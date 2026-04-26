const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export async function joinEvent(params: {
  username: string;
  avatar?: File | null;
  userId?: string | null;
  eventId?: string;
}): Promise<{ userId: string; username: string; avatarUrl: string | null }> {
  const form = new FormData();
  form.append('username', params.username);
  form.append('eventId', params.eventId || 'demo');
  if (params.userId) form.append('userId', params.userId);
  if (params.avatar) form.append('avatar', params.avatar);

  const res = await fetch(`${SERVER}/users/join`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Failed to join');
  return res.json();
}

export async function uploadPhoto(file: File, username: string): Promise<Response> {
  const form = new FormData();
  form.append('photo', file);
  form.append('username', username);
  return fetch(`${SERVER}/upload/demo`, { method: 'POST', body: form });
}

export function photoUrl(url: string): string {
  return `${SERVER}${url}`;
}

export { SERVER };
