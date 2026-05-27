export interface Photo {
  id: string;
  filename: string;
  url: string;
  uploadedAt: number;
  uploader: string;
  uploaderAvatarUrl?: string | null;
  mimetype?: string;
  thumbUrl?: string | null;
  likeCount?: number;
  likedByMe?: boolean;
}

export interface User {
  userId: string;
  username: string;
  avatarUrl: string | null;
}
