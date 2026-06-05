# AIventure — Pickup

Last session: 2026-06-05 (full beta-test sweep + fix-all). UCWS Singapore hackathon (Agent track). **NO emojis**. Brand "Earthbound & Stargazing".

## Pickup — 2026-06-05 (beta sweep + fix-all — LATEST)
- **Was doing:** full black-box beta test (Playwright, fresh signups/onboards) + Claude×4 + Codex audits, then fixed everything found and re-tested in a second loop. All shipped.
- **Done (all verified live, tsc + build green):**
  - **P0 no-install join** — `/p/` public in `middleware.ts` + `components/EnsureGuest.tsx` auto-mints a guest on a stranger's first visit; `setRsvp` = link is the capability. Stranger→link→guest→RSVP persists.
  - **P0 adventures vanished from Log** — `log/page.tsx` + `log/[ym]` fall back to `completed_at` (new `PlanCard.completedAt`); date-less completed plans now show.
  - Vote double-count fixed (PlanView derives from props + single optimistic delta); real Google-Calendar export (disabled "Set a date first" when undated); home first-run empty state + "For you" hidden-when-empty; `/new` copy fixed (server already defaults blank→home_area).
  - **Security:** `getFriends` scoped to shared group/plan (was whole userbase); `av_uid` HMAC-signed + httpOnly + secure (`lib/guest.ts`, verified in `currentUserId`); `deleteOption`/`lockDate` optionId scoped to the slug's plan; `updatePlanStatus` legal-transition matrix; votes blocked once locked; real signout (ends Supabase session).
  - **AI** (`lib/ai.ts`): ok-before-json, guarded parse, empty-content guard, 1 retry, 25s timeout, prompt-input sanitize, drop title-less options.
  - **Stubs wired + persisted:** profile edit, group create (`/api/groups` POST + `createGroup`), invites (real server page + accept/decline), nudge (real friends, single-select), plus (honest "early list").
- **Next step / deferred (note, not blockers):** RLS still OFF (service-role everywhere); `currentUserId` uses `getSession` not `getUser` (middleware validates — Supabase logs an advisory warning); in-memory rate limiter per-instance. Close pre-real-launch.
- **Key files:** `_audit/BETA-SWEEP-2026-06-05.md` (full report + fix log), `lib/db.ts`, `lib/ai.ts`, `lib/guest.ts`, `components/PlanView.tsx`, `components/EnsureGuest.tsx`, `middleware.ts`.

## Pickup — 2026-06-05 (perf + Codex-audit session)
- **Was doing:** performance/UX overhaul + two full Claude+Codex audits. All committed + pushed to `main` (auto-deploys) @ `a453fc0`.
- **Done:**
  - **Codex-via-OpenRouter audit harness** in `_audit/` — scripted adversarial second-opinion probes (`node _audit/codex-audit.mjs` + perf/actions/draftmodel/shellstream); reports saved alongside. Reusable.
  - **Perceived-perf trio:** `(app)/loading.tsx` skeleton + `cache()` inbox getters + `useLinkStatus` nav spinners; lazy Leaflet + geocode/search caches.
  - **Optimistic plan editing** (`PlanView.tsx`): instant local edits, non-blocking `router.refresh()` bg-reconcile (12–16ms flip vs ~800ms write). `res.ok` rollback + error toast + **per-field reconcile** (NOT wholesale plan-identity reset — don't reintroduce).
  - **App-entry speedup:** `updateMyProfile` 3→2 writes (`/api/me` 1043→516ms); **streamed `(app)` shell** (inbox = server component behind `<Suspense>`: `NotificationsMenu.server.tsx` + `NotificationsErrorBoundary.tsx`).
  - **Security:** member-roster selects trimmed `profiles(*)`→`(id,name,avatar_emoji)` (closed email/notes PII leak via shareable plan links); `respondNudge` idempotent; `clientError` on status+nudge routes.
- **Next step (highest value):** deferred audit security — `getFriends` returns WHOLE userbase to any guest (needs friendship model), `av_uid` cookie unsigned + not httpOnly (guest impersonation via enumerated UUID), `deleteOption`/`lockDate` unscoped `optionId`, stranger mutations on `open` plans. Demo-safe; close pre-real-launch. Detail in `_audit/`.
- **Key files:** `components/PlanView.tsx`, `lib/db.ts`, `app/(app)/layout.tsx` + `components/NotificationsMenu.server.tsx`, `_audit/`.
- **Notes:** optimistic overlay = `optStatus/optChosen/optPlan/optRec`, reconciled per-field vs server truth, rolled back on `!res.ok`. Still-mock stubs (audits flagged, NOT bugs): `profile/edit`, `groups/new`, `nudge`, `invites`. `getUserPlans` ~880ms chain left (masked by skeleton).

## Pickup — 2026-06-05 (cover art restyle)
- **Was doing:** fixing AIventure cover/banner art — felt "too AI", inconsistent style, wrong sizing for the trip-banner slot.
- **Done:** regenerated **all 46 covers** in ONE locked style → soft **Ghibli** pixel-art (32-bit fine-dither) + **simplicity guarantee** (2–4 friends max, never crowds, setting is hero, no text/signage), anchored on approved coffee+trip refs, output **3:2 1024×683 full-bleed**. Pipeline = `scripts/rollout-covers.mjs` (retry + auto-deband). 0 fails.
- **White-band bug Josh caught:** gemini-2.5-flash-image bakes a cream **letterbox** in despite "no borders"; my center-crop kept it = white gap at banner top. Fixed via `scripts/debander.mjs` (ImageMagick `-fuzz 10% -trim` → cover-fit 1024×683). Trim folded into rollout so re-gens self-clean. **Lesson: gemini ignores aspect/no-border prompts — always trim+refit after gen.**
- **Files:** `public/img/cover-*.png` (46); test gens + original backup in `_cover-work/` (moved OUT of `public/`, won't ship). Revert = `_cover-work/_covers_backup/`. PlanView hero unchanged.
- **Next step:** eyeball in app (:3210) → if good, commit + push (main auto-deploys). NOT pushed yet.

## Pickup — 2026-06-05 (prior — visual pixel pass + mobile + nav icons)
- **Was doing:** visual/design consistency + mobile polish on top of a big audit/security/PWA session.
- **Done this session:** security+perf+dead-code audit shipped; judge-login fix; 8-item tester batch (mock cleanup, date/time, slot-control `+ Add` menu w/ append + AI-find-venue, recurring placement); mobile app-shell + installable PWA; **SW stale-RSC bug fixed** (actions now refresh live); mobile-sizing batch incl **Conor identity fix** (av_uid → guests only); full **pixel visual-consistency pass** (hard ink borders + hard shadows, DESIGN.md aligned); nav icons → **monochrome Pixelarticons** (`components/pixel-icons.tsx`) after Josh rejected AI colour sprites.
- **Next step:** if Josh likes the pixel nav, roll Pixelarticons app-wide (section bubbles, categories). Conor must reload once to clear stale SW+cookie then re-test signup = his account.
- **Key files:** `components/AppShell.tsx`, `components/pixel-icons.tsx`, `components/ui.tsx` + `plan.tsx` (pixel components), `public/sw.js`, `lib/db.ts` (currentUserId guest gate), `DESIGN.md`, `docs/VISUAL-CONSISTENCY-PLAN.md`.
- **⚠️ SHARED TREE:** another Claude has **uncommitted** work (PlanView optimistic-rollback + error toasts, `lib/db.ts`, `app/api/nudge/respond`, `app/api/plans/status`). I committed only my files. Their PlanView had a TS error I patched in the working tree (`plan as unknown as Record<...>`) but did NOT commit — it rides along when they commit. Don't clobber.

## LIVE
- **Prod: https://aiventure-swart.vercel.app** — repo `newroot-git/aiventure` @ **`bcc513a`** → push main auto-deploys. Commit only your own files (shared tree).

## Mobile sizing + identity batch (2026-06-05, `deea0f7`) — SHIPPED, verified 390px
- **#6 Conor's new account defaulted to Josh** — two causes: (a) the SW v1 cross-user RSC cache (fixed in v2 earlier); (b) a stale `av_uid` cookie resolving to seeded "Josh" (auth_id null). Now in prod `av_uid` is honoured ONLY for actual minted guest profiles (name `Guest NNNN`); dev-switcher still works under `DEV_SWITCH=1`. Real sessions already win first.
- **#1 squish/width** — PlanView had `px-5` INSIDE AppShell's `px-5` wrapper = 80px gutters on 390px. Dropped PlanView `px-5`, shell gutter → `px-4`. Content now 358/390 (16px gutters), was ~310. **Lesson: page roots inside AppShell must NOT re-add horizontal padding/max-w.**
- **#5** lock-in / done / poke buttons now full-width `size-lg` (were content-width = compressed).
- **#4** friend picker: fixed-width grid cells + `min-w-0` + `w-full truncate` so long names don't break alignment (new/page + PlanView invite sheet; NudgeSheet still has the old pattern if it recurs).
- **#3** onboarding interest search results now render under the input (were below the picks list).
- **#2** onboarding home-area step gained a "Use my location" reverse-geocode button.

## App-shell + PWA (2026-06-05) — SHIPPED + verified on prod
- **Native-feel app-shell:** `html,body` locked (overflow hidden, overscroll none); single `#app-scroll` host (h-100dvh flex-col) wraps every route; `AppShell` is a flex column locked to `h-dvh` — header `flex-none` + scrolling `<main>` (`min-h-0 flex-1`) + bottom nav `flex-none`, NO fixed/sticky (kills iOS drift). safe-area insets, viewport-fit=cover, 44px nav taps. Verified 390×844 local+prod: body never scrolls, header/nav pinned, only `<main>` scrolls; standalone pages scroll in `#app-scroll`.
- **SW STALE-RSC BUG (found+fixed 2026-06-05, `41e6676`):** the first SW (v1) was cache-first for non-navigate/non-API GETs — but `router.refresh()`/soft-nav are RSC GETs, so it served stale server-component payloads. Symptom: "Lock this in" (and any router.refresh action) appeared to do nothing until a hard reload, though the server write succeeded. Fix (sw v2): cache-first ONLY for fingerprinted immutable assets (`/_next/static`, `/icons`, image/font/css); everything dynamic (nav, RSC, `/api`) is network-first. Verified on prod (lock-in + RSVP update live, v2 took over, v1 cache cleared). **Lesson: never cache-first RSC.** A controlling old SW updates on the next page load (skipWaiting+clientsClaim) — one reload.
- **Installable PWA:** `app/manifest.ts` (standalone, theme/bg `#eae1cf`, start `/plans`, icons 192/512/maskable). `public/sw.js` = **hand-rolled** SW (Next 16 builds with Turbopack; `@serwist/next`'s webpack injection won't run under it) — precache shell, network-first navigations+`/api` (live data), cache-first static, never touches non-GET. Registered via `components/ServiceWorkerRegister` (prod + secure-context only). Middleware now lets `/manifest.webmanifest` through. Prod-verified: SW activated, caches populated, manifest `application/manifest+json`.
- **ICONS ARE PLACEHOLDERS** — `scripts/gen-pwa-icons.mjs` makes them from a brand SVG (dusk→red, cream "A", gold star). Swap for the real mark when drawn; re-run the script.
- Capacitor/native wrap NOT done (deliberately deferred); nothing here blocks it. Vercel project `newroot/aiventure` (account `newrootio`, team `newroot`). Local dev `PORT=3210 npm run dev`; `.env.local` has `NEXT_PUBLIC_DEV_SWITCH=1` (dev profile-switcher; OFF in prod — verified).

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
- **#37 Smoothness** — ✅ DONE 2026-06-05 (perf session): optimistic UI on choose/lock/edits, `useLinkStatus` nav spinners, `(app)/loading.tsx` route skeletons, streamed shell. Keystroke lag already fixed earlier.
- **Real magic-link auth** — blocked without Josh (needs Supabase config).
- Consolidate the 3 add affordances (add-own / ask-AI / add-step) — Josh handling separately.

## Stack
- Next 16 / React 19 / Tailwind v4. OpenRouter chat `anthropic/claude-sonnet-4.5`. OSM (Nominatim + Leaflet) for location, no Google key. Supabase service-role server-only (bypasses RLS), untyped client → `as never`/`as Row`. Commit as **newroot-git**. New: `lib/http.ts` (clientError + rate limiter).
