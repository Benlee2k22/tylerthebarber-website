create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now()
);

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'owner'); $$;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(8,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 240),
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.services (name, price, duration_minutes, description, sort_order) values
  ('Kids Cut', 10, 30, 'Fresh, tidy cuts for the young ones.', 1),
  ('Adult Haircut', 15, 40, 'A clean cut, fade or taper.', 2),
  ('Haircut & Beard', 20, 55, 'The full refresh: haircut and beard.', 3),
  ('Beard Trim', 5, 20, 'Shape, line and tidy.', 4)
on conflict (name) do update set price = excluded.price, duration_minutes = excluded.duration_minutes, description = excluded.description, sort_order = excluded.sort_order;

create table if not exists public.barber_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Tyler the Barber',
  opening_hours jsonb not null default '{"0":{"open":null,"close":null},"1":{"open":"09:00","close":"17:00"},"2":{"open":"09:00","close":"17:00"},"3":{"open":"09:00","close":"17:00"},"4":{"open":"09:00","close":"17:00"},"5":{"open":"09:00","close":"17:00"},"6":{"open":"09:00","close":"15:00"}}'::jsonb,
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes between 5 and 60),
  updated_at timestamptz not null default now()
);
insert into public.barber_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  service_id uuid not null references public.services(id),
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  amount numeric(8,2) not null check (amount >= 0),
  status text not null default 'confirmed' check (status in ('confirmed','completed','cancelled','no_show')),
  source text not null default 'online' check (source in ('online','walk_in')),
  is_paid boolean not null default false,
  sms_opt_in boolean not null default false,
  reminder_sent_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists appointments_date_time_idx on public.appointments (appointment_date, start_time);
alter table public.appointments drop constraint if exists appointments_no_time_overlap;
alter table public.appointments add constraint appointments_no_time_overlap
  exclude using gist (
    appointment_date with =,
    tsrange(appointment_date + start_time, appointment_date + end_time, '[)') with &&
  ) where (status <> 'cancelled');

create table if not exists public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  block_date date not null,
  start_time time not null,
  end_time time not null,
  reason text not null default 'Unavailable',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(8,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.business_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Note',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null check (length(trim(body)) between 8 and 800),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.get_busy_slots(p_day date)
returns table (start_time time, end_time time)
language sql stable security definer set search_path = public
as $$
  select a.start_time, a.end_time from public.appointments a
   where a.appointment_date = p_day and a.status <> 'cancelled'
  union all
  select b.start_time, b.end_time from public.calendar_blocks b where b.block_date = p_day;
$$;

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.barber_settings enable row level security;
alter table public.appointments enable row level security;
alter table public.calendar_blocks enable row level security;
alter table public.expenses enable row level security;
alter table public.business_notes enable row level security;
alter table public.reviews enable row level security;

create policy "Owners can read their profile" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "Public can read active services" on public.services for select to anon, authenticated using (is_active or public.is_owner());
create policy "Owners manage services" on public.services for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Public can read booking settings" on public.barber_settings for select to anon, authenticated using (true);
create policy "Owners manage booking settings" on public.barber_settings for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Public can book a service" on public.appointments for insert to anon, authenticated with check (
  status = 'confirmed' and source = 'online' and length(trim(customer_name)) > 1 and length(trim(phone)) >= 7
  and exists (select 1 from public.services s where s.id = service_id and s.is_active and s.price = amount)
);
create policy "Owners manage appointments" on public.appointments for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Public can read calendar blocks" on public.calendar_blocks for select to anon, authenticated using (true);
create policy "Owners manage calendar blocks" on public.calendar_blocks for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Owners manage expenses" on public.expenses for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Owners manage notes" on public.business_notes for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "Visitors can read published reviews" on public.reviews for select to anon, authenticated using (is_published or public.is_owner());
create policy "Visitors can submit reviews for approval" on public.reviews for insert to anon, authenticated with check (is_published = false and length(trim(customer_name)) > 1);
create policy "Owners manage reviews" on public.reviews for all to authenticated using (public.is_owner()) with check (public.is_owner());

grant usage on schema public to anon, authenticated;
grant select on public.services, public.barber_settings, public.calendar_blocks to anon, authenticated;
grant insert on public.appointments to anon, authenticated;
grant select, insert, update, delete on public.appointments, public.calendar_blocks, public.expenses, public.business_notes, public.services to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert on public.reviews to anon;
grant select on public.profiles to authenticated;
grant update on public.barber_settings to authenticated;
grant execute on function public.get_busy_slots(date) to anon, authenticated;

-- After creating the owner's account in Supabase Authentication, run:
-- insert into public.profiles (user_id, role) values ('OWNER_AUTH_USER_UUID', 'owner');
