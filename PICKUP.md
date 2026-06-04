# AIventure — Pickup

Last session: 2026-06-04. UCWS Singapore hackathon (Agent track). Style LOCKED: lush pixel landscapes, **NO emojis**, lucide icons + initials/image avatars. Brand "Earthbound & Stargazing".

## LIVE
- **Prod: https://aiventure-swart.vercel.app** — repo `newroot-git/aiventure` @ **`1ab94ab`** → push main auto-deploys. Vercel project `newroot/aiventure` (account `newrootio`, team `newroot`). Local dev `PORT=3210 npm run dev`; `.env.local` has `NEXT_PUBLIC_DEV_SWITCH=1` (dev profile-switcher; OFF in prod).

## ⚠️ ACTION NEEDED FROM JOSH (in Supabase SQL editor)
- **Run `supabase/migrations/0005_home_area.sql`** (`alter table profiles add column if not exists home_area text;`). Until run, the home-location default silently falls back to London (code is migration-safe, won't crash). Already-run earlier: 0002 (RLS), 0003 (indexes), 0004 (constraints).
- **Optional, kills all email codes:** Supabase → Auth → Providers → Email → turn **OFF "Confirm email"**. Then password create = instant, no code (email is rate-limited on free tier — we keep hitting it).

## Auth (real)
- `/signin`: **email + password** (primary) OR **6-digit/8-digit code** (OTP fallback) OR **"I'm a judge"** (instant guest, no email). Sign out on profile page.
- `currentUserId()` (lib/db.ts, React-cached): Supabase **session via getSession** (cookie, fast — no per-request network) → profile by auth_id/email (links/creates); else `av_uid` cookie (guest/dev); else "". On real sign-in the client **clears `av_uid`** so a leftover guest cookie can't mask the session (this was the "defaults to Josh" bug — FIXED).
- `middleware.ts` refreshes session + guards (public: `/`, `/welcome`, `/signin`, `/onboard`, `/api`, static). `lib/supabase/server.ts` = cookie auth client.
- Email OTP length is 8 in this project; signin accepts 6–8.

## Data model (no-DDL patterns) — see `supabase/DB-NOTES.md`
- Plan = ordered **slots** (vote options, pick one). Slots/scaffold/recurrence/seriesId live in a `plan_options` **meta row** (`kind='time', title='__meta'`). Availability = `date_option` rows + `option_votes`. Recurring = real cloned instances sharing `seriesId`.
- Identity: `profiles.auth_id` links auth user; `profiles.home_area` (new, needs migration) = default plan location.

## Shipped this session (all live)
- **Real auth** (password + OTP + judge), session guard, **identity-mask bug fixed**.
- **Onboarding now runs**: new accounts → `/onboard` → saves **name + interests + home_area** to the profile (was localStorage-only, never reached). Routing via `/api/me` `needsOnboard`.
- **Home location default**: plans default to your `home_area` (not London); applies to nudge/no-location plans. (needs migration 0005)
- **Add-your-own = maps search** (`PlaceSearch.tsx`, OSM Nominatim): pick a real place or save a custom spot ("John's house"); no more AI drift to wrong country.
- **Nudge = request flow**: send creates NO plan (pending); recipient Accept/Decline in the **inbox bell**; accept → shared plan + celebratory notify ("X is KEEN — let's go!"); decline → notify. Home shows "N nudges waiting → inbox" (the old broken home link is gone). Sender sees "Nudge sent" (no premature plan).
- **Surprise me** = instant, no questions → random realistic plan (single or day).
- **Vote ordering** (most-voted option rises) + **"Best" highlight** on the top-overlap availability date. (Conor's "ranking = just ordering"; no AI auto-decide.)
- **Delete suggestions** (owner × on options). **Manual build needs no description** (AI does). **Decline drops the plan** off your lists + clears its invite/notification, with an "are you sure?". **Recurring** moved to sit with the dates.
- Earlier today: timezone display fix, avatar-404 fix, multi-date picker (tap days → add on Done), Go-Plus contrast, typing-focus bug.

## NOT done — next session (Josh approved all but the last)
- **#36 Groups** — create/manage groups (name + pick members), use in `/new` "A group". Not built. db needs `createGroup` + `addGroupMembers` + UI on crew. Fresh users are in NO groups, so "A group" is currently empty.
- **#37 Smoothness** — app feels laggy. getSession helped; still want: optimistic UI on choose/RSVP (RSVP+vote already optimistic), a top nav progress bar, route transitions (template.tsx exists). Biggest remaining UX gripe.
- **Consolidate the 3 add buttons** (add-own / ask-AI / add-step feel same) — **Josh handling separately**, leave it.

## Test state
- DB wiped fresh: 0 plans, 7 seed crew kept (Conor/Jack/Sam/Mia/Tom/Priya/Josh) as a friend pool, all auth users + guests cleared. Real signups create blank profiles; seed crew show as friends to invite/nudge. **Don't wipe real accounts again without flagging Josh.**
- QA via guest accounts + Playwright + API each change; `next build` green; prod re-verified after each deploy.

## Stack
- Next 16 / React 19 / Tailwind v4. OpenRouter chat `anthropic/claude-sonnet-4.5`. No Google key → location search + map on free OSM (Nominatim + Leaflet). Supabase service-role server-only (bypasses RLS), untyped client → `as never`/`as Row`. Commit as newroot-git.
