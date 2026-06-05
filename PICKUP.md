# AIventure — Pickup

Last session: 2026-06-05 (tester-feedback batch — 8 fixes). UCWS Singapore hackathon (Agent track). Style LOCKED: lush pixel landscapes, **NO emojis**, lucide icons + initials/image avatars. Brand "Earthbound & Stargazing".

## LIVE
- **Prod: https://aiventure-swart.vercel.app** — repo `newroot-git/aiventure` @ **`4b188ec`** → push main auto-deploys. Vercel project `newroot/aiventure` (account `newrootio`, team `newroot`). Local dev `PORT=3210 npm run dev`; `.env.local` has `NEXT_PUBLIC_DEV_SWITCH=1` (dev profile-switcher; OFF in prod — verified).

## Tester-feedback batch (2026-06-05) — all 8 SHIPPED + verified live via Playwright
- **#7 broken mock plans KILLED (this also explained #1):** `/p/[slug]` now `notFound()` instead of falling back to `MOCK_PLAN`. The community "Around you"/Explore cards pointed at a seed demo slug (`wild-otter-42`) with no real DB row, so every action on them silently failed — that's why "adding a custom spot didn't add it." On a REAL plan, add-custom works (verified, both typed + search-result paths). `getOpenEvents`/`getCommunities` return `[]` for now (code commented-kept for the real community rebuild later); Home around-you hidden, Explore shows a "Communities are coming" empty state. **Community is a deliberate later rebuild — back it onto real `visibility='open'` plans.**
- **#2 date+time:** WhenPicker multiple-mode now stores day-coords and applies the chosen TIME to all picked dates at Done — changing time after picking dates no longer loses it. Verified (picked 20+27 June, set 14:00 after → both show 14:00).
- **#3:** Planning/Locked lifecycle pill on plan cards (home + calendar). PlanCard gained `phase`.
- **#8:** Recurring control moved up to sit with the date/time selection (above "When works?").
- **#4:** Slot controls consolidated into ONE `+ Add to this step` menu (Search a place / Ask AI). `SlotAddMenu` + `SlotAskAi` in PlanView.
- **#6:** Ask-AI now APPENDS ideas (keeps existing); `Replace all with fresh ideas` is a separate link. `refineSlot(...append)`, regenSlotOptions skips delete when append. Verified (Dishoom kept + 3 added).
- **#5:** `Ask AI to find "<text>"` resolves a specific named venue OSM can't surface (restored `resolvePlace` in ai.ts + `addResolvedPlace` + add-option `ai:true` path, auth+rate-limited). Verified (Dishoom Shoreditch resolved).
- Zero console errors across the live run; all test plans cleaned up.

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
- ✅ **DONE 2026-06-05: RLS enabled on all 15 tables + `profiles.home_area` column added** (Josh ran combined SQL). Auth model now fully closed: RLS deny-by-default behind the hand-rolled db.ts guards. Home-location default no longer falls back to London.
- ✅ **DONE 2026-06-05: live click-through passed on prod** (Playwright, as judge guest): judge login → AI plan create → vote (optimistic + count) → AI refine (regenerated central/cheaper options) → delete. Zero console errors. The memoized PlanSlot refactor holds. **Found + fixed a real bug en route:** `go()` in signin cleared `av_uid` unconditionally, so "I'm a judge" wiped its own guest cookie and bounced to /signin — now `go(false)` keeps it (`2259a39`).
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
