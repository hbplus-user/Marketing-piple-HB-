-- Run this in the Supabase SQL editor for the project.
-- Adds the 'designer' role and lets a Manager provision Designer/User
-- teammates by email from inside the app, without a service-role key.

-- ── 1. Allow 'designer' wherever profiles.role is constrained ──────────────
-- profiles.role isn't defined in this repo (schema was set up in the
-- dashboard). If it has a CHECK constraint, find its name first:
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'profiles'::regclass and contype = 'c';
-- Then drop and recreate it with 'designer' added, e.g.:
--   alter table profiles drop constraint <constraint_name>;
--   alter table profiles add constraint <constraint_name>
--     check (role in ('employee','manager','founder','designer'));
-- If role has no CHECK constraint (plain text), skip this step.

-- ── 2. Pending invites table ────────────────────────────────────────────────
create table if not exists pending_invites (
  email       text primary key,
  role        text not null check (role in ('designer','employee')),
  invited_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

alter table pending_invites enable row level security;

-- Only managers can read/write invites.
create policy "managers manage invites"
  on pending_invites
  for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'manager')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'manager')
  );

-- ── 3. profiles RLS ─────────────────────────────────────────────────────────
-- Let a Manager edit only Designer/User rows, and only ever set them to
-- Designer/User — Manager/Founder rows and role values stay backend-only.
create policy "managers edit designer/employee profiles"
  on profiles
  for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'manager')
    and role in ('employee','designer')
  )
  with check (
    role in ('employee','designer')
  );

-- Let a signed-in user create their own profile row when claiming an invite
-- (or getting the default 'employee' role) on first login.
create policy "user can insert own profile"
  on profiles
  for insert
  with check (id = auth.uid());
