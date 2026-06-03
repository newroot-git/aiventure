-- AIventure schema — run in Supabase SQL editor
-- MVP: profiles, groups, plans (the atom), options/suggestions, members (RSVP + guest join), comments.

-- ============ profiles ============
create table if not exists profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique,                      -- maps to supabase auth.users (null for pure-guest)
  name          text not null,
  email         text,
  avatar_emoji  text default '🙂',
  interests     jsonb not null default '[]',      -- ["hiking","craft beer","board games"]
  interest_notes text,                            -- free-text "go deeper" blob
  is_paid       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ============ groups (recurring crews) ============
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                      -- "the boys"
  emoji       text default '🌿',
  owner_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists group_members (
  group_id    uuid references groups(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  role        text not null default 'member',     -- owner | member
  created_at  timestamptz not null default now(),
  primary key (group_id, profile_id)
);

-- ============ plans (the living micro-site) ============
create table if not exists plans (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,             -- short shareable id, e.g. "wild-otter-42"
  title         text not null,
  intent        text,                             -- raw "something with the boys saturday"
  status        text not null default 'open',     -- draft | open | locked | completed | cancelled
  visibility    text not null default 'invite',   -- group | invite | open | filtered
  creator_id    uuid references profiles(id) on delete set null,
  group_id      uuid references groups(id) on delete set null,
  interest_filter jsonb default '[]',             -- for visibility=filtered
  ai_empowered  boolean not null default false,   -- true if any member paid → AI features on for all

  -- the locked-in details (filled from a chosen option or edited)
  activity      text,                             -- "Sunset hike + craft beer"
  emoji         text default '🗺️',
  starts_at     timestamptz,
  place_name    text,
  place_address text,
  place_lat     double precision,
  place_lng     double precision,
  place_url     text,
  why           text,                             -- "because you all rate the outdoors + haven't hiked in a while"
  key_info      jsonb not null default '[]',      -- [{icon,label}] "bring water","no glass bottles"
  cover_hue     text default 'primary',           -- which accent the hero uses

  adventure_no  int,                              -- set on completion, per-creator counter
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists plans_creator_idx on plans(creator_id);
create index if not exists plans_group_idx on plans(group_id);

-- ============ plan options (AI Drop results + human suggestions to vote on) ============
create table if not exists plan_options (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid references plans(id) on delete cascade,
  kind          text not null default 'activity', -- activity | place | time
  source        text not null default 'ai',       -- ai | human
  title         text not null,
  subtitle      text,
  why           text,
  image_url     text,
  source_url    text,                             -- the "grounded ✨" proof link
  source_label  text,                             -- "Google Places" | "Ticketmaster" | "web"
  payload       jsonb default '{}',               -- lat/lng/price/time etc
  suggested_by  uuid references profiles(id) on delete set null,
  votes         int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists options_plan_idx on plan_options(plan_id);

-- who voted for what (one vote per profile per option)
create table if not exists option_votes (
  option_id   uuid references plan_options(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (option_id, profile_id)
);

-- ============ plan members (RSVP + no-install guest join) ============
create table if not exists plan_members (
  plan_id     uuid references plans(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  rsvp        text not null default 'in',         -- in | maybe | out
  joined_via  text not null default 'app',        -- app | web (no-install link)
  notify_email text,                              -- guest can drop email for calendar/notify
  created_at  timestamptz not null default now(),
  primary key (plan_id, profile_id)
);

-- ============ comments (light, anti-chat — usually attached to an aspect) ============
create table if not exists plan_comments (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid references plans(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete set null,
  body        text not null,
  attached_to uuid references plan_options(id) on delete set null,  -- comment on a specific option
  created_at  timestamptz not null default now()
);

create index if not exists comments_plan_idx on plan_comments(plan_id);

-- ============ AI usage log (hardening: per-user cost/rate tracking) ============
create table if not exists ai_usage (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references profiles(id) on delete set null,
  plan_id       uuid references plans(id) on delete set null,
  input_tokens  int default 0,
  output_tokens int default 0,
  cost_usd      numeric(10,5) default 0,
  created_at    timestamptz not null default now()
);

create index if not exists ai_usage_profile_idx on ai_usage(profile_id, created_at);
