import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://yuhjyyomcwtnlpeserpa.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  'sb_publishable_TLnYWnciULqqLZNu7sC-Dw_lzA84-ox';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  reorder_level: number;
  unit_price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type WarehouseActivity = {
  id: string;
  action: 'received' | 'dispatched' | 'audit' | 'alert';
  title: string;
  detail: string;
  quantity: number;
  created_at: string;
};
