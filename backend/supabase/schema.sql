-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: creates/updates users and scans tables and policies idempotently.

create table if not exists public.users (
  id            uuid primary key,
  name          text not null,
  email         text not null unique,
  organization  text,
  role          text default 'Security Analyst',
  password_hash text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists users_email_idx on public.users (email);

create table if not exists public.scans (
  id            uuid primary key,
  user_id       uuid references public.users(id) on delete set null,
  target_url    text not null,
  scan_mode     text not null default 'deep',
  status        text not null default 'queued',
  progress      text,
  findings      jsonb default '[]'::jsonb,
  summary       jsonb default '{}'::jsonb,
  score         int,
  grade         text,
  pages_crawled int default 0,
  forms_found   int default 0,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

alter table public.scans add column if not exists user_id uuid references public.users(id) on delete set null;
alter table public.scans add column if not exists scan_mode text not null default 'deep';

create index if not exists scans_created_at_idx on public.scans (created_at desc);
create index if not exists scans_user_id_idx on public.scans (user_id);

-- The backend connects with the service_role / secret key, which bypasses RLS.
alter table public.users enable row level security;
alter table public.scans enable row level security;

drop policy if exists "service manage users" on public.users;
create policy "service manage users"
  on public.users for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service manage scans" on public.scans;
create policy "service manage scans"
  on public.scans for all
  to service_role
  using (true)
  with check (true);
