# AIventure — Pickup

Last session: 2026-06-04. Hackathon due June 5 (Agent track, submit by 23:59 SGT). Style LOCKED: lush pixel landscapes, NO emojis, lucide icons + initials/image avatars.

## LIVE
- **Production: https://aiventure-swart.vercel.app** (Vercel project `newroot/aiventure`, account `newrootio`, team `newroot`, GitHub `newroot-git/aiventure` connected → push to main auto-deploys). Env vars set in Vercel (OpenRouter + Supabase, all environments).
- Discord (Elemental Studios webhook) pinged Conor with the link + how-to.

## REAL AUTH (live) — 6-digit OTP + judge mode
- Logged-out → redirected to `/signin`. Sign in = email → **6-digit code** (Supabase OTP, `signInWithOtp`/`verifyOtp`). **"I'm a judge"** button → instant guest profile (no email; `/api/guest` sets `av_uid` cookie; seed crew appear as friends). Sign out on profile page.
- `currentUserId()` (lib/db.ts, memoised): Supabase session → profile by `auth_id`/`email` (links/creates); else `av_uid` cookie (guest/dev); else anon "". `middleware.ts` refreshes session + guards (public: `/`, `/welcome`, `/signin`, `/onboard`, `/api`, static). `lib/supabase/server.ts` = cookie auth client.
- Dev profile switcher gated behind `NEXT_PUBLIC_DEV_SWITCH=1` (local `.env.local` only; OFF in prod).
- **TWO THINGS PENDING JOSH for OTP email to work:** (1) Supabase dashboard → Auth → Email Templates → add `Your code: {{ .Token }}` to the **Magic Link** AND **Confirm signup** templates. (2) give Conor's email → set on seeded Conor profile (Josh's already set to afiredeck@gmail.com). The judge button works without either.

## Fixes 2026-06-04 (later)
- **Timezone discrepancy FIXED**: times were server-formatted (UTC on Vercel) on home/calendar vs client-local on plan page → disagreed. Now ALL wall-clock times format client-side from ISO (`LocalDateTime` comp + `PlanCard.startsAtISO`; calendar `timeOf` from ISO; Countdown uses real start, not hardcoded 16:00).
- **Avatar 404 FIXED**: emoji-defaulted avatars ('🙂') rendered as `<img src>`; now only path/URL avatars are images, else initials.
- **External-invite link tile** in `/new` people picker (Conor's ask) — copies app link.
- Landing CTAs → `/signin`.

## DB hardening (migrations ready, apply in Supabase SQL editor — DDL can't run headless)
`supabase/migrations/`: **0002_rls.sql (SECURITY — apply first**: RLS on all 15 tables; closes the public-anon-key hole; service-role bypasses so app unaffected), 0003_indexes.sql, 0004_constraints.sql. Full model + roadmap in **`supabase/DB-NOTES.md`** (security model, jsonb-meta patterns, identity, typed-client roadmap). RLS still OFF until applied.

## QA 2026-06-04 (guest accounts, Playwright + API)
All pages console-clean; create (all who/when/budget modes + invite tile), nudge popup→shared plan, owner/participant with real guest identities, time consistency, sign-in/out/guard, judge flow — all verified. Repo `d2f8678`.

## Architecture
Plans = ordered **slots** (each holds voteable options; pick one per slot). One renderer `PlanView` for one-thing / adventure / trip. Slots + scaffold + recurrence + seriesId all live in `plan_options` meta row (`kind='time', title='__meta'`, no DDL). `/a/[slug]` → `/p/[slug]`.

## Identity / permissions (real, cookie-switcher seam)
- `currentUserId()` reads `av_uid` cookie (default Josh). **Seam for real auth** — swap for Supabase session; everything routes through it. Dev **profile switcher** (sidebar + mobile header, `/api/whoami`) lets you act as any of 7 seeded profiles.
- **Owner = creator_id.** Owner-only (server-enforced via `assertOwner`): pick/choose, refine, refineAll, addSlot, slotTime, when, lockDate, lock/complete, delete, title, location, recurrence, stopSeries.
- **Participants**: vote (persisted `option_votes`), suggest own options (`addCustomOption`), set RSVP (persisted `plan_members`), mark availability. After lock = read-only except RSVP. UI hides owner controls + shows "the owner locks it in".

## Availability
Candidate dates = `plan_options` `payload.date_option`. Members vote which work (`option_votes`); owner `lockDate` → `starts_at` + clears candidates. Create "a few options" mode seeds these. "When works?" section in PlanView.

## Create form (`/new`)
One "Who's coming?" (just me / invite people / a group / open to all). "When?" (not sure / a few options / set date). Budget (Free toggle or £ number). Wires visibility/groupId/inviteIds/startsAt/dateOptions into create.

## Recurring = independent instances
Inert until lock. On lock, `materializeSeries` clones N future-dated **locked** plans sharing `seriesId` (weekly 8 / fortnightly 8 / monthly 6); each independent (own RSVP/edits — declining one doesn't touch others). Turn-off = `stopSeries` (confirm, deletes future, keeps current). Calendar shows real instances (synthetic expansion removed).

## Also live (earlier this session)
Nudge = shared plan + popup + notifications; editable title; update location; calendar day times + multi-event count; who-with on home; recurring number-font + Go Plus contrast fixes; typing bug fixed.

## Deferred — `docs/PLAN-logistics-availability-polish.md`
- **Real magic-link auth** — BLOCKED without Josh: seeded profiles have null email/auth_id + Supabase redirect URLs need dashboard config. Dev switcher shipped as the stand-in (great for the demo: instant owner/participant). This is the clear next step (seam ready).
- **Travel/logistics** (modes, per-leg time, ferry flags, trip flights/accom) — planned, not built.
- **Polish**: loading skeletons, optimistic vote/pick, haptics, route transitions — planned.

## Verified this session
API (both roles): create who/when/budget, vote+RSVP persist, participant gating (lock/refine blocked; vote/suggest/RSVP allowed), lockDate, choose, recurring materialize (8 instances) + decline-one-independence + stopSeries. Playwright owner-vs-participant UI. Live prod AI create. `next build` green. All test data cleaned.

## Stack
- Next 16 / React 19 / Tailwind v4. OpenRouter chat `anthropic/claude-sonnet-4.5`. No Google key → location search + map on free OSM (Nominatim + Leaflet).
- Supabase service-role server-only, RLS on, untyped client → `as never` / `as unknown as Row`. DEMO_USER_ID = 1111…1111.
- Secrets in `.env.local` (+ Vercel envs). Commit as newroot-git. Local dev on :3210.
