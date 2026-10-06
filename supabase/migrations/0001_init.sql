-- ============================================================================
-- HackSprint — initial schema
-- Works on Supabase (SQL Editor) and any PostgreSQL 13+ database.
-- The app always talks to Postgres server-side (service role / connection
-- string), so RLS is intentionally left disabled. If you want RLS, grant
-- access only to the service role.
-- ============================================================================

create extension if not exists pgcrypto;

-- priority enum ----------------------------------------------------------------
do $$
begin
  create type priority as enum ('critical', 'high', 'medium', 'low');
exception
  when duplicate_object then null;
end $$;

-- workspaces -------------------------------------------------------------------
create table if not exists workspaces (
  id            text primary key,               -- hard-to-guess random slug
  name          text not null default 'HackSprint Workspace',
  hackathon_name text not null default 'AI Hackathon Sprint',
  deadline      date not null default '2026-10-30',
  theme_default text not null default 'light',
  created_at    timestamptz not null default now()
);

-- team_members -----------------------------------------------------------------
create table if not exists team_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspaces(id) on delete cascade,
  name         text not null,
  avatar       text not null default 'v1'
);
create index if not exists team_members_workspace_idx on team_members (workspace_id);

-- phases -----------------------------------------------------------------------
create table if not exists phases (
  id           uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspaces(id) on delete cascade,
  phase_number integer not null,
  name         text not null,
  description  text not null default '',
  start_date   date not null,
  end_date     date not null
);
create index if not exists phases_workspace_idx on phases (workspace_id);

-- tasks ------------------------------------------------------------------------
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspaces(id) on delete cascade,
  phase_id     uuid not null references phases(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  assigned_to  text not null default 'everyone',   -- team_members.id or 'everyone'
  priority     priority not null default 'medium',
  due_date     date,
  completed    boolean not null default false,
  completed_at timestamptz,
  tags         text[] not null default '{}'::text[],
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tasks_workspace_idx on tasks (workspace_id);
create index if not exists tasks_phase_idx on tasks (phase_id);
create index if not exists tasks_due_date_idx on tasks (due_date);

-- activity ---------------------------------------------------------------------
create table if not exists activity (
  id           uuid primary key default gen_random_uuid(),
  workspace_id text not null references workspaces(id) on delete cascade,
  task_id      uuid references tasks(id) on delete set null,
  action       text not null,                      -- created | updated | completed | reopened | deleted
  created_at   timestamptz not null default now()
);
create index if not exists activity_workspace_idx on activity (workspace_id);

-- keep tasks.updated_at fresh ----------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_updated_at on tasks;
create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();
