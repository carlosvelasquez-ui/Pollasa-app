create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.leagues (
  id text primary key,
  name text not null,
  code text not null unique,
  invite_code text not null unique,
  type text not null,
  competition text not null,
  competition_id text not null,
  entry text not null,
  prize text not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  deadline text not null default 'Proxima fecha',
  scoring jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id text not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists public.join_requests (
  league_id text not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'blocked')),
  requested_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists public.league_entries (
  league_id text not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  predictions jsonb not null default '{}'::jsonb,
  bonus_picks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.league_entries enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "leagues_select_authenticated" on public.leagues;
create policy "leagues_select_authenticated"
on public.leagues for select
to authenticated
using (true);

drop policy if exists "leagues_insert_owner" on public.leagues;
create policy "leagues_insert_owner"
on public.leagues for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "leagues_update_owner" on public.leagues;
create policy "leagues_update_owner"
on public.leagues for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "leagues_delete_owner" on public.leagues;
create policy "leagues_delete_owner"
on public.leagues for delete
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "league_members_select_authenticated" on public.league_members;
create policy "league_members_select_authenticated"
on public.league_members for select
to authenticated
using (true);

drop policy if exists "league_members_insert_owner_or_self" on public.league_members;
create policy "league_members_insert_owner_or_self"
on public.league_members for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.leagues
    where leagues.id = league_members.league_id
      and leagues.owner_id = auth.uid()
  )
);

drop policy if exists "league_members_delete_owner_or_self" on public.league_members;
create policy "league_members_delete_owner_or_self"
on public.league_members for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.leagues
    where leagues.id = league_members.league_id
      and leagues.owner_id = auth.uid()
  )
);

drop policy if exists "join_requests_select_authenticated" on public.join_requests;
create policy "join_requests_select_authenticated"
on public.join_requests for select
to authenticated
using (true);

drop policy if exists "join_requests_insert_own" on public.join_requests;
create policy "join_requests_insert_own"
on public.join_requests for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "join_requests_update_owner" on public.join_requests;
create policy "join_requests_update_owner"
on public.join_requests for update
to authenticated
using (
  exists (
    select 1
    from public.leagues
    where leagues.id = join_requests.league_id
      and leagues.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.leagues
    where leagues.id = join_requests.league_id
      and leagues.owner_id = auth.uid()
  )
);

drop policy if exists "join_requests_update_own" on public.join_requests;
create policy "join_requests_update_own"
on public.join_requests for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "join_requests_delete_owner" on public.join_requests;
create policy "join_requests_delete_owner"
on public.join_requests for delete
to authenticated
using (
  exists (
    select 1
    from public.leagues
    where leagues.id = join_requests.league_id
      and leagues.owner_id = auth.uid()
  )
);

drop policy if exists "league_entries_select_authenticated" on public.league_entries;
create policy "league_entries_select_authenticated"
on public.league_entries for select
to authenticated
using (true);

drop policy if exists "league_entries_insert_owner_or_self" on public.league_entries;
create policy "league_entries_insert_owner_or_self"
on public.league_entries for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.leagues
    where leagues.id = league_entries.league_id
      and leagues.owner_id = auth.uid()
  )
);

drop policy if exists "league_entries_update_self" on public.league_entries;
create policy "league_entries_update_self"
on public.league_entries for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "league_entries_delete_owner_or_self" on public.league_entries;
create policy "league_entries_delete_owner_or_self"
on public.league_entries for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.leagues
    where leagues.id = league_entries.league_id
      and leagues.owner_id = auth.uid()
  )
);
