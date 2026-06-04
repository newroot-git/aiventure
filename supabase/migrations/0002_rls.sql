-- 0002_rls.sql — enable Row Level Security on every table.
--
-- WHY: the publishable/anon key is public (NEXT_PUBLIC_SUPABASE_ANON_KEY). With RLS
-- OFF, anyone with that key can read/write every row through Supabase's REST API.
-- The app itself never reads data with the anon key — all data access goes through
-- the service-role client (lib/supabase/admin.ts), and the service role ALWAYS
-- bypasses RLS. So enabling RLS with NO data policies:
--   • blocks anon/authenticated direct API access (safe default = deny), and
--   • leaves the app fully working (service role bypasses).
--
-- The browser client (lib/supabase/client.ts) is used for AUTH ONLY (sign-in,
-- sign-out) — it never queries these tables — so deny-by-default is safe today.
--
-- WHEN you add client-side data reads, add explicit policies (see the commented
-- examples at the bottom) keyed on auth.uid() = profiles.auth_id.
--
-- Apply in the Supabase SQL editor (DDL needs the editor or DB password).

alter table profiles          enable row level security;
alter table groups            enable row level security;
alter table group_members     enable row level security;
alter table plans             enable row level security;
alter table plan_options      enable row level security;
alter table option_votes      enable row level security;
alter table plan_members      enable row level security;
alter table plan_comments     enable row level security;
alter table ai_usage          enable row level security;
alter table communities       enable row level security;
alter table community_members enable row level security;
alter table open_events       enable row level security;
alter table nudges            enable row level security;
alter table invites           enable row level security;
alter table notifications     enable row level security;

-- No policies = deny all for anon/authenticated. Service role bypasses RLS, so the
-- app keeps working. (Verify in the dashboard: Table editor should no longer warn.)

-- ───────────────────────────────────────────────────────────────────────────
-- FUTURE: when the browser client starts reading data directly, add policies like:
--
-- -- a person can read their own profile + profiles they share a plan/group with
-- create policy "read own profile" on profiles for select
--   using (auth.uid() = auth_id);
--
-- -- members can read plans they belong to
-- create policy "read my plans" on plans for select
--   using (
--     exists (
--       select 1 from plan_members m
--       join profiles p on p.id = m.profile_id
--       where m.plan_id = plans.id and p.auth_id = auth.uid()
--     )
--   );
--
-- NOTE: wrap auth.uid() as (select auth.uid()) inside policies for performance —
-- it lets Postgres cache the value per-statement instead of per-row.
-- ───────────────────────────────────────────────────────────────────────────
