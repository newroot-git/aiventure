-- 0005_home_area.sql — a person's home town/area, so plans default to where they
-- actually are (not London). Captured at onboarding; used as the default location
-- for every plan they create. Run once in the Supabase SQL editor.

alter table profiles add column if not exists home_area text;
