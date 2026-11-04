// Small compatibility layer for the site's existing query calls. All data is
// served by the Vanta Core API on the VPS; PostgreSQL credentials stay server-side.
const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
export const hasBackend = Boolean(apiBase);

export type Service = { id: string; name: string; price: number; duration_minutes: number; description: string; is_active: boolean };
export const fallbackServices: Service[] = [
  { id: 'kids', name: 'Kids Cut', price: 10, duration_minutes: 30, description: 'Fresh, tidy cuts for the young ones.', is_active: true },
  { id: 'adult', name: 'Adult Haircut', price: 15, duration_minutes: 40, description: 'A clean cut, fade or taper.', is_active: true },
  { id: 'combo', name: 'Haircut & Beard', price: 20, duration_minutes: 55, description: 'The full refresh: haircut and beard.', is_active: true },
  { id: 'beard', name: 'Beard Trim', price: 5, duration_minutes: 20, description: 'Shape, line and tidy.', is_active: true },
];
export const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number(value || 0));

type Session = { access_token: string; user: { id: string; name: string; email: string; role: string } };
const TOKEN_KEY = 'tyler_barber_session';
const listeners = new Set<(event: string, session: Session | null) => void>();
function readSession(): Session | null { try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; } }
function notify(event: string, session: Session | null) { listeners.forEach(listener => listener(event, session)); }

async function request(path: string, options: RequestInit = {}) {
  if (!apiBase) throw new Error('The barber API is not configured yet.');
  const session = readSession();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

class Query {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any;
  private filters: Array<[string, string, unknown]> = [];
  private ordering: Array<[string, boolean]> = [];
  private maxRows?: number;
  private one = false;
  constructor(private table: string) {}
  select(_columns = '*') { if (this.action === 'select') this.action = 'select'; return this; }
  insert(value: any) { this.action = 'insert'; this.payload = value; return this; }
  update(value: any) { this.action = 'update'; this.payload = value; return this; }
  delete() { this.action = 'delete'; return this; }
  eq(column: string, value: unknown) { this.filters.push(['eq', column, value]); return this; }
  gte(column: string, value: unknown) { this.filters.push(['gte', column, value]); return this; }
  lt(column: string, value: unknown) { this.filters.push(['lt', column, value]); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.ordering.push([column, options?.ascending !== false]); return this; }
  limit(count: number) { this.maxRows = count; return this; }
  single() { this.one = true; return this; }
  then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) { return this.run().then(resolve, reject); }
  private async run() {
    try {
      const query = new URLSearchParams();
      for (const [op, column, value] of this.filters) query.append(`${op}.${column}`, String(value));
      for (const [column, ascending] of this.ordering) query.append('order', `${column}.${ascending ? 'asc' : 'desc'}`);
      if (this.maxRows !== undefined) query.set('limit', String(this.maxRows));
      const qs = query.size ? `?${query}` : '';
      const session = readSession();
      let result: any;
      if (this.action === 'select') {
        if (this.table === 'profiles') {
          const body = await request('/me');
          result = { role: body.user?.role, user_id: body.user?.id };
        } else if (this.table === 'services' && !session) result = await request(`/barber/services${qs}`);
        else if (this.table === 'reviews' && !session) result = await request(`/barber/reviews${qs}`);
        else if (this.table === 'barber_settings' && !session) result = await request(`/barber/settings${qs}`);
        else result = await request(`/barber/admin/${this.table}${qs}`);
      } else if (this.action === 'insert') {
        const route = (!session && ['appointments', 'reviews'].includes(this.table)) ? `/barber/${this.table}` : `/barber/admin/${this.table}`;
        result = await request(route, { method: 'POST', body: JSON.stringify(this.payload) });
      } else if (this.action === 'update') {
        const id = this.filters.find(([op, col]) => op === 'eq' && col === 'id')?.[2];
        const singleton = this.table === 'barber_settings' ? 'settings' : this.table;
        result = await request(`/barber/admin/${singleton}${id ? `/${encodeURIComponent(String(id))}` : ''}`, { method: 'PATCH', body: JSON.stringify(this.payload) });
      } else {
        const id = this.filters.find(([op, col]) => op === 'eq' && col === 'id')?.[2];
        if (!id) throw new Error('A record ID is required.');
        result = await request(`/barber/admin/${this.table}/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
      }
      let data = result.data ?? result.rows ?? result[ this.table ] ?? result;
      if (this.one && Array.isArray(data)) data = data[0] ?? null;
      return { data, error: null };
    } catch (error: any) { return { data: null, error: { message: error?.message || 'Request failed' } }; }
  }
}

export const supabase = apiBase ? {
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: Record<string, unknown>) => {
    try { return { data: await request(`/barber/busy?date=${encodeURIComponent(String(args.p_day || ''))}`), error: null }; }
    catch (error: any) { return { data: null, error: { message: error.message } }; }
  },
  auth: {
    getSession: async () => ({ data: { session: readSession() } }),
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => { listeners.add(callback); return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } }; },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try { const body = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); const session = { access_token: body.token, user: body.user }; localStorage.setItem(TOKEN_KEY, JSON.stringify(session)); notify('SIGNED_IN', session); return { error: null }; }
      catch (error: any) { return { error: { message: error.message } }; }
    },
    signOut: async () => { localStorage.removeItem(TOKEN_KEY); notify('SIGNED_OUT', null); return { error: null }; },
  },
} : null;
