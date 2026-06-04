-- 0004_constraints.sql — enum/value guards so bad writes can't slip in.
-- Run ONCE in the Supabase SQL editor. If an ADD CONSTRAINT errors, existing data
-- violates it — inspect/clean that data, then re-run the failing line.
-- (Each is wrapped so re-running is safe.)

do $$ begin
  alter table plans add constraint plans_status_chk
    check (status in ('draft','open','locked','completed','cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table plans add constraint plans_visibility_chk
    check (visibility in ('group','invite','open','filtered'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table plan_members add constraint plan_members_rsvp_chk
    check (rsvp in ('in','maybe','out'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table plan_options add constraint plan_options_kind_chk
    check (kind in ('activity','place','time'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table plan_options add constraint plan_options_source_chk
    check (source in ('ai','human'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table group_members add constraint group_members_role_chk
    check (role in ('owner','member'));
exception when duplicate_object then null; end $$;
