import type { Availability, Currency, InstagramConnection, StoreStatus } from '../types';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type ProfileRow = { id: string; is_operator: boolean; created_at: string };
export type StoreRow = {
  id: string;
  owner_id: string | null;
  slug: string;
  name: string;
  tagline: string | null;
  about_text: string | null;
  email: string | null;
  whatsapp_number: string | null;
  instagram_handle: string | null;
  logo_url: string | null;
  theme_color: string;
  currency: Currency;
  status: StoreStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};
export type ProductRow = {
  id: string;
  store_id: string;
  sku: string | null;
  title: string;
  description: string | null;
  price: number;
  currency: Currency;
  image_urls: string[];
  category: string | null;
  availability: Availability;
  sort_order: number;
  external_link: string | null;
  is_draft: boolean;
  source: string | null;
  source_id: string | null;
  source_user_id: string | null;
  created_at: string;
  updated_at: string;
};
export type ImportRow = {
  id: string;
  store_id: string;
  created_by: string;
  filename: string;
  row_count: number;
  imported_count: number;
  error_report: Json;
  status: 'previewed' | 'committed' | 'cancelled';
  created_at: string;
};
export type InstagramConnectionRow = {
  id: string;
  store_id: string;
  meta_user_id: string | null;
  ig_user_id: string;
  page_id: string;
  page_name: string | null;
  username: string | null;
  profile_picture_url: string | null;
  encrypted_access_token: string;
  token_expires_at: string | null;
  status: InstagramConnection['status'];
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};
export type InstagramDeletionRequestRow = {
  id: string;
  meta_user_id: string;
  confirmation_code: string;
  status: 'received' | 'completed' | 'error';
  created_at: string;
  completed_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      stores: Table<StoreRow>;
      products: Table<ProductRow>;
      imports: Table<ImportRow>;
      instagram_connections: Table<InstagramConnectionRow>;
      instagram_deletion_requests: Table<InstagramDeletionRequestRow>;
    };
    Views: { [key in never]: never };
    Functions: {
      commit_import: { Args: { p_store_id: string; p_import_id: string }; Returns: Json };
      ensure_profile: { Args: { p_user_id: string }; Returns: { id: string; is_operator: boolean }[] };
      is_operator: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      store_status: StoreStatus;
      availability_status: Availability;
      import_status: ImportRow['status'];
      instagram_connection_status: InstagramConnection['status'];
    };
    CompositeTypes: { [key in never]: never };
  };
};
