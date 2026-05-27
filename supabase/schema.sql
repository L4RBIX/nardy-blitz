-- ============================================================
-- Nardy Blitz — Supabase Schema  (v3)
-- Safe to re-run on an existing project:
--   • Tables created with IF NOT EXISTS
--   • CHECK constraints added idempotently
--   • Migrates any old status='active' rows to status='live'
--   • Policies dropped and recreated each run
-- ============================================================
-- PROTOTYPE NOTICE:
-- All RLS policies are public (no auth). This is intentional for
-- the incubator demo. Production requires authentication, room
-- ownership checks, and stricter row-level security policies.
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- 1. multiplayer_rooms
-- ══════════════════════════════════════════════════════════════

create table if not exists multiplayer_rooms (
  id             text        primary key,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  status         text        not null default 'waiting',
  host_name      text        not null default 'Host',
  guest_name     text,
  white_player   text        not null default 'host',
  black_player   text        not null default 'guest',
  current_turn   text        not null default 'white',
  game_state     jsonb       not null,
  winner         text,
  end_reason     text,
  last_action    text
);

-- Idempotent: add CHECK constraints (skip if already exist)
do $$ begin
  alter table multiplayer_rooms
    add constraint multiplayer_rooms_status_check
    check (status in ('waiting', 'live', 'finished'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table multiplayer_rooms
    add constraint multiplayer_rooms_white_player_check
    check (white_player in ('host', 'guest'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table multiplayer_rooms
    add constraint multiplayer_rooms_black_player_check
    check (black_player in ('host', 'guest'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table multiplayer_rooms
    add constraint multiplayer_rooms_current_turn_check
    check (current_turn in ('white', 'black'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table multiplayer_rooms
    add constraint multiplayer_rooms_winner_check
    check (winner in ('white', 'black') or winner is null);
exception when duplicate_object then null;
end $$;

-- Migrate: old status='active' rows → 'live'  (safe no-op if none exist)
update multiplayer_rooms set status = 'live' where status = 'active';

-- updated_at trigger
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_multiplayer_rooms_updated_at on multiplayer_rooms;
create trigger trg_multiplayer_rooms_updated_at
  before update on multiplayer_rooms
  for each row execute function update_updated_at_column();

-- RLS
alter table multiplayer_rooms enable row level security;

-- Drop old policies (idempotent)
drop policy if exists "public_select_rooms"  on multiplayer_rooms;
drop policy if exists "public_insert_rooms"  on multiplayer_rooms;
drop policy if exists "public_update_rooms"  on multiplayer_rooms;

-- Prototype-only public policies — replace with auth-based policies in production
create policy "public_select_rooms" on multiplayer_rooms
  for select using (true);

create policy "public_insert_rooms" on multiplayer_rooms
  for insert with check (true);

create policy "public_update_rooms" on multiplayer_rooms
  for update using (true);


-- ══════════════════════════════════════════════════════════════
-- 2. leaderboard_entries
-- ══════════════════════════════════════════════════════════════

create table if not exists leaderboard_entries (
  id                   uuid        primary key default gen_random_uuid(),
  created_at           timestamptz default now(),
  player_name          text        not null,
  city                 text        not null default 'Unknown',
  score                integer     not null,
  wins                 integer     default 0,
  losses               integer     default 0,
  games_played         integer     default 0,
  best_coach_score     numeric     default 0,
  average_coach_score  numeric     default 0,
  win_rate             numeric     default 0,
  favorite_difficulty  text
);

alter table leaderboard_entries enable row level security;

drop policy if exists "public_select_leaderboard" on leaderboard_entries;
drop policy if exists "public_insert_leaderboard" on leaderboard_entries;

create policy "public_select_leaderboard" on leaderboard_entries
  for select using (true);

create policy "public_insert_leaderboard" on leaderboard_entries
  for insert with check (true);


-- ══════════════════════════════════════════════════════════════
-- 3. pro_waitlist
-- ══════════════════════════════════════════════════════════════

create table if not exists pro_waitlist (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name       text,
  email      text,
  city       text,
  note       text
);

alter table pro_waitlist enable row level security;

drop policy if exists "public_insert_waitlist" on pro_waitlist;

create policy "public_insert_waitlist" on pro_waitlist
  for insert with check (true);

drop policy if exists "public_select_waitlist" on pro_waitlist;

create policy "public_select_waitlist" on pro_waitlist
  for select using (true);


-- ══════════════════════════════════════════════════════════════
-- 4. Enable Realtime for multiplayer_rooms
-- ══════════════════════════════════════════════════════════════
-- NOTE: Supabase's default publication already exists.
-- This adds multiplayer_rooms to it so Realtime events fire.
-- Safe to re-run — exception handler ignores duplicate.

do $$ begin
  alter publication supabase_realtime add table multiplayer_rooms;
exception when duplicate_object then null;
end $$;


-- ══════════════════════════════════════════════════════════════
-- Done. Verify with:
--   select * from multiplayer_rooms limit 5;
--   select * from leaderboard_entries limit 5;
-- ══════════════════════════════════════════════════════════════
