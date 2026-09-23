-- Run this once in the Supabase project's SQL Editor (Dashboard -> SQL Editor
-- -> New query) before starting the server against Supabase.
--
-- Column names are camelCase (quoted) to match the API's existing JSON shape
-- exactly (see server/src/modules/users/users.types.ts and
-- images.types.ts) — no snake_case <-> camelCase mapping layer needed.
--
-- RLS is intentionally left disabled: only this Express server ever talks to
-- these tables, authenticated with the service_role key (which bypasses RLS
-- anyway). Never expose that key, or these tables via the anon key, to the
-- frontend.


create table if not exists public.users (
  id text primary key,
  "firstName" text not null,
  "lastName" text not null,
  email text not null,
  phone text not null,
  username text not null,
  age integer,
  gender text,
  image text,
  document jsonb,
  -- Drives the default "newest first" list ordering (see
  -- server/src/modules/users/users.service.ts) — not returned to the
  -- frontend and not one of the user-facing sortable columns.
  "created_at" timestamptz not null default now()
);

-- Additive migration for a users table that already existed before
-- "created_at" was introduced — safe to re-run.
alter table public.users
  add column if not exists "created_at" timestamptz not null default now();

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  "originalName" text not null,
  "dataUrl" text not null,
  "mimeType" text not null,
  size bigint not null
);

