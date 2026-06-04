-- 0003_indexes.sql — indexes for the app's hot query paths.
-- Safe to run anytime (IF NOT EXISTS). Apply in the Supabase SQL editor.

-- getUserPlans(): "plans I'm a member of" + "my created plans"
create index if not exists plan_members_profile_idx on plan_members(profile_id);

-- getUserGroups(): groups I'm in
create index if not exists group_members_profile_idx on group_members(profile_id);

-- getNotifications(): unread notifications for me, newest first
create index if not exists notifications_profile_idx on notifications(profile_id, acknowledged, created_at desc);

-- getNudges(): pending nudges to me
create index if not exists nudges_to_idx on nudges(to_id, status, created_at desc);

-- getInvites(): invites to me
create index if not exists invites_to_idx on invites(to_id, created_at desc);

-- meta-row + date-option lookups read plan_options by (plan_id) [already indexed]
-- and filter by title; this composite speeds the __meta / date lookups.
create index if not exists plan_options_plan_title_idx on plan_options(plan_id, title);

-- option_votes are read by option_id (IN ...) — leading col of the PK already
-- covers this, so no extra index needed.

-- series lookups (stopSeries / calendar): meta rows carry seriesId in payload jsonb.
-- A GIN index makes payload->meta->>seriesId filters fast if that ever moves to a
-- WHERE clause (currently filtered in JS). Uncomment if series grow large:
-- create index if not exists plan_options_payload_gin on plan_options using gin (payload);
