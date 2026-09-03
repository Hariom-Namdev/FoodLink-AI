import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars missing — running in offline demo mode.');
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
  }
);

export type Role = 'restaurant' | 'ngo' | 'volunteer' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  organization: string;
  phone: string;
  city: string;
  created_at: string;
}

export interface Donation {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  food_item: string;
  category: string;
  quantity: number;
  meals: number;
  city: string;
  lat: number | null;
  lng: number | null;
  prep_time: string;
  expiry_hours: number;
  freshness_score: number;
  status: 'available' | 'claimed' | 'picked' | 'delivered' | 'removed';
  image_url: string;
  created_at: string;
}

export interface Claim {
  id: string;
  donation_id: string;
  ngo_id: string;
  ngo_name: string;
  status: 'claimed' | 'picked' | 'delivered' | 'cancelled';
  created_at: string;
}

export interface Delivery {
  id: string;
  donation_id: string;
  volunteer_id: string;
  volunteer_name: string;
  distance_km: number;
  status: 'assigned' | 'in_transit' | 'completed';
  reward_points: number;
  created_at: string;
}
