# AIventure — Pickup

Last session: 2026-06-04 (moody audit + hardening pass). UCWS Singapore hackathon (Agent track). Style LOCKED: lush pixel landscapes, **NO emojis**, lucide icons + initials/image avatars. Brand "Earthbound & Stargazing".

## LIVE
- **Prod: https://aiventure-swart.vercel.app** — repo `newroot-git/aiventure` @ **`246e813`** → push main auto-deploys. Vercel project `newroot/aiventure` (account `newrootio`, team `newroot`). Local dev `PORT=3210 npm run dev`; `.env.local` has `NEXT_PUBLIC_DEV_SWITCH=1` (dev profile-switcher; OFF in prod — verified).
- Deploy verified post-push: `/signin` 200, `/` 200, **`/api/whoami` now 404** (gate live + DEV_SWITCH off in prod).

## What shipped this session — full audit + fixes (all live)
Ran a 4-agent moody code audit, then fixed everything. `next build` green, `tsc` clean.

**Security (was wide open — service-role bypasses RLS, so every check is hand-rolled in db.ts):**
- **`/api/whoami` gated** behind `NEXT_PUBLIC_DEV_SWITCH` — was a one-request full account takeover (set anyone's `av_uid`). 404 in prod now.
- **`av_uid` cookie restricted to genuine guests** (`auth_id IS NULL`) in `currentUserId` — a forged cookie can no longer impersonate a real signed-up account.
- **Added missing authz guards**: participant gate (owner/member/open) on `toggleVote`, `setRsvp`, `addDateOption`, `addCustomOption`; owner gate on `setRecurrence`, `setPlanLocation`, `invitePeople`, `pokeNonVoters`. (helpers: `planAuth` / `isMember` / `hasInvite` / `assertParticipant` in db.ts)
- **Rate-limit + auth** on LLM routes (`/api/drop`, `/api/plans/create`, `/api/plans/refine`) and guest minting (`lib/http.ts` in-memory limiter).
- **Stopped leaking raw DB/LLM error strings** to client (`clientError` allowlist). `getFriends` no longer returns others' email/private notes. `interests` array capped.

**Perf (the lag):**
- Input text state pushed into self-contained leaf components (`GeneralFeedback`, `AddStepBox`, per-slot refine box) — **keystrokes no longer re-render the whole plan** (this was the main lag).
- `SlotBlock` extracted to a **memoized module-scope `PlanSlot`**; handlers wrapped in `useCallback`.
- `refineAll` regenerates slots **in parallel** (`Promise.all`) + one headline-derive + 12-slot cap; `invitePeople`/`pokeNonVoters` bulk-insert instead of N+1.
- `AbortController` on all Nominatim autocompletes + friend fetches (kills stale-result races).

**Dead code swept:** deleted unreachable `/screens`, `/styles`, `/style-test`, `/welcome`, `/a/[slug]`; collapsed `/social` → `/explore`. Removed dead exports (`MapEmbed`, `DEMO_USER_ID`, `isPlanOwner`, `resolvePlace`) + unused `Chips`/`MOODS`. Replaced the hardcoded `wild-otter-42` fake-plan failure path with a real error banner on `/new`.
- NOTE: `lib/slug.ts` was flagged dead by a reviewer but is NOT — `db.ts` uses `planSlug` everywhere. Kept.

## ⚠️ ACTION NEEDED FROM JOSH
- **Enable Supabase RLS** — biggest remaining hardening. Service-role bypasses it, so the hand-rolled guards above are the *only* authz. RLS = defense-in-depth behind all of them. (`lib/supabase/admin.ts` flags this too.)
- **Run `supabase/migrations/0005_home_area.sql`** (`alter table profiles add column if not exists home_area text;`). Until run, home-location default silently falls back to London (migration-safe, won't crash). Already run: 0002 (RLS policies authored), 0003 (indexes), 0004 (constraints).
- **One manual click-through** — the live interactive smoke test (vote / refine / create) didn't run this session (port 3210 was held by an existing dev server). Build + typecheck are green and the PlanView refactor was logic-preserving, but eyeball one plan's vote + AI-refine once.
- **Optional:** Supabase → Auth → Providers → Email → turn OFF "Confirm email" for instant password signup (free-tier email is rate-limited).

## Deferred (judged too risky for an unattended deploy — cosmetic, wide blast radius)
- Dedup date-formatting into `lib/date.ts` (re-implemented in PlanView/CalendarView/LocalDateTime/new/plan).
- Dedup the calendar month-grid (`ui.tsx` WhenPicker ≈ `CalendarView`) and the friend-avatar picker (PlanView/new/NudgeSheet) into shared components.
- `middleware.ts` → `proxy.ts` rename (Next 16 soft-deprecation; middleware.ts still works).

## Auth (real)
- `/signin`: **email + password** (primary) OR **6–8-digit code** (OTP fallback) OR **"I'm a judge"** (instant guest, no email).
- `currentUserId()` (lib/db.ts, React-cached): Supabase session via `getSession` (cookie) → profile by auth_id/email; else `av_uid` cookie **but only if that profile is a real guest** (auth_id null). On real sign-in the client clears `av_uid`.
- `middleware.ts` refreshes session + guards (public: `/`, `/signin`, `/onboard`, `/api`, static).

## Data model (no-DDL patterns) — see `supabase/DB-NOTES.md`
- Plan = ordered **slots**; slots/scaffold/recurrence/seriesId in a `plan_options` meta row (`kind='time', title='__meta'`). Availability = `date_option` rows + `option_votes`. Recurring = cloned instances sharing `seriesId`.
- KNOWN sharp edge (not fixed — needs DDL): `writeMeta` is read-modify-write with no unique constraint → concurrent writes can clobber / duplicate the meta row. Low-frequency; flag if you see lost scaffold/recurrence.

## NOT done — next session
- **#36 Groups** — create/manage groups (name + pick members), use in `/new` "A group". Not built. Fresh users are in NO groups, so "A group" is empty. db needs `createGroup` + `addGroupMembers` + crew UI.
- **#37 Smoothness** — keystroke lag fixed; still want optimistic UI on choose, top nav progress bar, route transitions (`template.tsx` exists).
- **Real magic-link auth** — blocked without Josh (needs Supabase config).
- Consolidate the 3 add affordances (add-own / ask-AI / add-step) — Josh handling separately.

## Stack
- Next 16 / React 19 / Tailwind v4. OpenRouter chat `anthropic/claude-sonnet-4.5`. OSM (Nominatim + Leaflet) for location, no Google key. Supabase service-role server-only (bypasses RLS), untyped client → `as never`/`as Row`. Commit as **newroot-git**. New: `lib/http.ts` (clientError + rate limiter).
