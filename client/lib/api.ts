const SERVER = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export async function fetchPhotos(): Promise<Response> {
  return fetch(`${SERVER}/photos-list`);
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
