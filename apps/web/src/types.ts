export interface Album {
  id: string;
  name: string;
  description: string;
  cover_photo_id: string | null;
  share_token: string;
  is_public: number;
  created_at: string;
  updated_at: string;
  photo_count?: number;
  allowed_emails?: string[];
}

export interface Photo {
  id: string;
  album_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  share_token: string;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: number;
  created_at: string;
}
