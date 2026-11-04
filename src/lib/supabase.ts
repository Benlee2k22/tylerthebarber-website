import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const hasBackend = Boolean(supabase);

export type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description: string;
  is_active?: boolean;
};

export const fallbackServices: Service[] = [
  { id: 'kids', name: 'Kids Cut', price: 10, duration_minutes: 30, description: 'Fresh, tidy cuts for the young ones.' },
  { id: 'adult', name: 'Adult Haircut', price: 15, duration_minutes: 40, description: 'A clean cut, fade or taper.' },
  { id: 'cut-beard', name: 'Haircut & Beard', price: 20, duration_minutes: 55, description: 'The full refresh: haircut and beard.' },
  { id: 'beard', name: 'Beard Trim', price: 5, duration_minutes: 20, description: 'Shape, line and tidy.' },
];

export const money = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);
