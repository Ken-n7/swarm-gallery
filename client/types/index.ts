export interface Photo {
  id: string;
  filename: string;
  url: string;
  uploadedAt: number;
  uploader: string;
  likeCount?: number;
}

export interface User {
  userId: string;
  username: string;
  avatarUrl: string | null;
}
