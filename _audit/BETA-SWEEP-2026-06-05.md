# AIventure — Full Beta-Test Sweep (2026-06-05)

Method: live black-box playthrough (Playwright, 390px mobile) + 4 parallel Claude code-audit agents (security / plan-lifecycle / AI-grounding / onboarding-misc) + 1 Codex (`gpt-5-codex`) adversarial audit. Real Supabase account created and driven through the full loop: signup → onboard → create (AI build + self build) → plan micro-site → vote → lock → complete → Adventure card → log/calendar/home.

Severity: **P0** = breaks a core promise / data loss-shaped. **P1** = real bug, user-visible. **P2** = polish / latent / security-debt. **P3** = nit.

---

## A. Confirmed live during playthrough

### P0-1 — No-install link join is broken (contradicts the headline promise)
Every plan page prints "No app needed — anyone with this link can join." But `middleware.ts` redirects any non-public path (incl. `/p/[slug]`) to `/signin` unless the visitor already has a Supabase `user` OR an `av_uid` guest cookie. A fresh person clicking a shared link has neither → **bounced to /signin**, not into the plan. The whole "drop a link, no install, web works" ethos (INTENT load-bearing rule #1) does not function.
- File: `middleware.ts:6` (`PUBLIC` set) + `:38-44`.
- Fix: make `/p/[slug]` public-readable (respect plan visibility server-side), auto-mint a guest `av_uid` on first plan visit, or add a public `/join/[slug]` entry that mints the guest then forwards. Pair with guest RSVP + email/calendar handoff (currently absent).

### P0-2 — Completed adventures vanish from the Log and Home
Completed a plan, got Adventure card "#1" on the plan page — but `/log` shows "**0 adventures, across 0 months**" and Home/Calendar show nothing. The adventure is reachable ONLY at its own URL.
- Root cause: `app/(app)/log/page.tsx:24` → `const past = all.filter(p => p.status === "past" && p.date)`. The completed plan has **no date** (see P1-1), so `p.date` is falsy → filtered out forever. Month-grouping also keys on `p.date`.
- Fix: don't require `p.date`; fall back to `completed_at` for the log row + month bucket. (And fix P1-1 so completion always has a date.)

### P1-1 — A plan can be locked + completed with no date
Locked the plan with "When = Pick a time" never set. Lock-in succeeded; each step got an auto clock-time (08:00 / 09:30) but the **plan-level date stayed empty**, and the "When" card still read "Pick a time" while steps showed times — internally inconsistent. A dateless locked plan can't go on a calendar and disappears from the log (P0-2).
- Corroborates lifecycle agent: lock allowed with `slots.length`/date unset.
- Fix: require a chosen date (or at least `starts_at`) before enabling "Lock it in", or stamp `completed_at`-based date at completion.

### P1-2 — Add-to-calendar is a dead link
The "Calendar" button on a locked plan is `href="#"`. INTENT lists add-to-calendar (.ics / Google URL) as an MVP must-have. Not implemented.
- File: plan footer action in `components/PlanView.tsx` (Calendar link `href="#"`).
- Fix: generate a Google Calendar URL / `.ics` from the locked plan + chosen options.

### P1-3 — Optimistic vote double-counts
Voted "Keen" once on a fresh AI option → UI showed "**Keen 2**". Reloaded → server truth "**Keen 1**". Optimistic increment is applied on top of a base that already includes the user's vote (off-by-one), self-heals on refresh.
- Matches lifecycle agent HIGH: `components/PlanView.tsx:236-241` — `votes`/`voted` seeded once via `useState`, never re-synced to props.
- Fix: derive displayed count from props each render; keep only the optimistic delta locally.

### P1-4 — Onboarding home town is ignored when creating a plan
Onboarding asks "Where are you based?" (saved Cape Town). `/new` ignores it — the location field starts blank and reads "Defaults to London if blank." `app/new/page.tsx` only reads `interests` from localStorage (`:159,:182`), never `home_area`.
- Also: `/api/me` POST body type omits `home_area` (`app/api/me/route.ts:24`); Codex flags this as "everyone defaults to London." (At runtime the key may still forward to `updateMyProfile`, but the `/new` default is independently broken.)
- Fix: prefill `/new` location from the profile's `home_area`; add `home_area` to the `/api/me` body type.

### P1-5 — Sign-out doesn't sign you out
`POST /api/signout` returns 200 but only clears `av_uid`; the Supabase session cookies survive and `currentUserId()` checks the Supabase session first. After "signing out", the header still showed my account ("AT") on reload.
- File: `app/api/signout/route.ts:8`.
- Fix: also `supabase.auth.signOut()` / expire `sb-*` cookies server-side.

### P2-1 — New-user Home is a dead end (no empty state)
Straight after onboarding, Home shows "Hey {name}" + an empty "FOR YOU" header and nothing else — no "create your first plan" CTA, no guidance. Only the nav `+` hints at the next step.
- Fix: first-run empty state with a primary "Start a plan" CTA.

### P2-2 — "FOR YOU" section is always empty
The "FOR YOU" header renders even when it has zero content (recommendations come from `getCommunities`/`getOpenEvents`, both stubbed `return []`). It is empty for every user right now.
- Fix: hide the section/header when empty.

### P3-1 — Budget currency is hard-coded £ regardless of locale
Create form budget shows "£" while the AI correctly priced Cape Town options in ZAR ("~R45/cup"). Minor inconsistency.

---

## B. Code-audit findings (not all individually reproduced live)

### Security / access control (P0–P2)
- **P0** `lib/db.ts` `getFriends()` returns **every profile in the DB** to any caller — no friendship/shared-plan edge. Userbase enumeration. (Both Claude + Codex, top item.) Fix: friendship/shared-plan join + minimal columns.
- **P1** `av_uid` cookie is an **unsigned, non-httpOnly** plaintext profile UUID (`app/api/guest/route.ts:28`), trusted as identity in `currentUserId()`. Combined with the getFriends id-leak, a stranger can set `av_uid=<known uuid>` and **fully impersonate** another guest. Fix: HMAC-sign + httpOnly + secure.
- **P1** "open" visibility short-circuits all membership checks — any signed-in user/guest can vote, RSVP, propose dates, and inject options (incl. an LLM call per `addResolvedPlace`) into ANY open plan. Rate-limit + require explicit join.
- **P2** `deleteOption` / `lockDate` use an **unscoped `optionId`** — a plan owner can pass their own slug + another plan's optionId and delete/overwrite the other plan's options (`lib/db.ts:664,760`). Assert `opt.plan_id` matches the slug's plan.
- **P2** Vote/edit mutation routes have **no rate limiting** (unlike drop/create/refine). 
- **P2** `currentUserId()` uses `getSession()` (local cookie decode) not `getUser()` — trusts an unvalidated/forged token in API handlers that middleware doesn't cover.
- **P2** Whole app runs **service-role (RLS off)** — every access decision is a hand-written guard; one miss = full breach. Enable RLS before real launch.
- Note: `NEXT_PUBLIC_DEV_SWITCH` (dev user-switcher) must stay **unset in prod** — it gates impersonation of any seed profile.

### AI / grounding (P1–P2)
- **Concept flag (P1):** there is **no real Places / Ticketmaster / Tavily integration** — those names are only mock strings in `lib/mock.ts`. All "grounding" is the LLM's own world knowledge + a generated Google Maps **search** URL (label "AI + Maps"). Output quality was genuinely good live (real Cape Town venues, correct ZAR pricing), but "source links" are unverified searches, not citations — the stated moat ("grounded in real data with a source link") isn't literally true yet.
- **P1** `lib/ai.ts:94` — `res.json()` called before `res.ok`; a non-JSON gateway error (502/504/HTML) throws `SyntaxError` and masks the real status.
- **P1** `lib/ai.ts:65,96` — unguarded `JSON.parse` on LLM output (temp 0.95, fixed max_tokens → truncation likely); empty `content` → `JSON.parse("")` throws. No try/catch in `generateDrop`. Wrap + retry once.
- **P1** `lib/ai.ts:129-141,188-195` — user free-text (`intent`, `feedback`, `slotLabel`) interpolated raw into prompts → prompt-injection / JSON-contract break. Sanitize + delimit + strict shape-validate.
- **P2** `lib/ai.ts:199` `generateSlotOptions` swallows ALL errors → `return []`; a refine silently no-ops while the route still returns `{ok:true}`. Distinguish hard failures.
- **P2** Empty/garbage LLM result → plan persisted with zero options (blank plan). Treat empty slots as failure.
- **P2** Default model id should be pinned to a verified OpenRouter slug + logged once at boot; missing `OPENROUTER_API_KEY` is swallowed in places (invisible misconfig).
- **P2** `refineAll` fans out up to 12 parallel LLM calls counted as one rate-limit hit — cost/concurrency blowup. Cap parallelism.

### Plan lifecycle (P1–P2)
- **P1** `PlanView.tsx` reconcile runs `setState` **during render** when server data catches up → React 19 "Too many re-renders" risk (Codex + lifecycle agent). Move to `useEffect`. (Didn't crash in my run — latent.)
- **P2** `toggleVote` non-atomic select-then-insert → double-click / two-tab race hits the PK and surfaces a generic 500. Upsert / catch unique-violation.
- **P2** Plan slug from a 23,040-space hash with **no collision retry** → a collision throws "Something went wrong" with no plan created. Retry with salt.
- **P2** Status transitions have **no ordering guard** — owner can jump completed→open, open→completed (skipping locked), etc. Enforce a transition matrix.
- **P2** Votes still accepted after a plan is locked/completed — shifts "best" on a finalized plan. Reject unless `status==="open"`.
- **P2** `addCustomOption`/`addResolvedPlace` don't verify `slotKey` exists in the scaffold → phantom steps. Validate against `meta.scaffold`.
- **P2** `recurrence` / `iso` date inputs unvalidated → "Invalid Date" candidates, garbage `starts_at`, potential loops in `occurrenceDates`.
- **P2** Several `persist()` calls fire-and-forget with no error surfaced (`doDelete` navigates away even on 500; `doInvite` closes sheet before awaiting).

### Onboarding / stubs / gate (P1–P2) — features that look real but don't persist
- **P1** `app/profile/edit/page.tsx` — seeds from **mock** `CURRENT_USER`; "Save" just routes to `/profile`, never POSTs. All profile edits discarded. Interest list also diverges from the onboarding taxonomy.
- **P1** `app/(app)/groups/new/page.tsx` — uses `MOCK_PEOPLE`; "Create group" just `router.push("/groups")`. There is **no createGroup / no POST** — group creation is entirely non-functional (and groups are the core "crew" unit).
- **P1** `app/(app)/invites/page.tsx` — renders `MOCK_INVITES` while real `getInvites()` exists and is used elsewhere; Decline only filters local state (reappears on reload); Accept doesn't hit the API.
- **P1** `app/(app)/nudge/page.tsx` — standalone page uses `MOCK_FRIENDS` and "Send" only `setSent(true)` — never calls `/api/nudge`. (The real `NudgeSheet` flow works; this duplicate page is dead mock UI.)
- **P1** Free/paid gate is **purely cosmetic**: `is_paid` only toggles a pill; `/api/drop` never checks it and `ai_empowered` is hardcoded `true`. `app/plus/page.tsx` "Start free trial" button has **no handler**. A free user has full AI access.
- **P2** Onboarding swallows the `/api/me` save failure (empty catch) but still navigates to `/plans` → can leave `needsOnboard` true and re-loop. No resumability mid-flow.
- **P2** `g/[id]` "Add" member button has no handler; Explore search box + "Join" toggle are non-functional decoration (communities stubbed `[]`).

---

## C. What's genuinely good (verified live)
- Onboarding flow is clean: dynamic avatar initials, scoped interest taxonomy, free-text search with "Your picks" tray, reverse-geocode "Use my location".
- AI Drop produced real, well-localized Cape Town venues (Truth Coffee, Lion's Head, Kirstenbosch) with correct ZAR pricing and sensible per-step structure — fast (~15s).
- Plan micro-site is polished; Ghibli-pixel cover art renders well; lock-in → Adventure card (#1, Share/Reopen) works and looks share-worthy.
- Zero app console errors across the whole lifecycle (only my own probe's 405).
- Geocode autocomplete, quick-actions sheet, bottom-nav, scale picker all work.

---

## E. FIXES SHIPPED (loop 2 — 2026-06-05, local, build-green, NOT pushed)

Verified live via Playwright on a fresh second account + a true no-install guest:
- **P0-1 no-install join** — `middleware.ts` lets `/p/` through; new `components/EnsureGuest.tsx` auto-mints a guest on a stranger's first visit; `setRsvp` now treats the (unguessable) slug as the capability (link = join). Verified: signed-out stranger opened a plan link → guest "G9" minted → RSVP'd → "2 going" persisted.
- **P0-2 adventures vanish** — `log/page.tsx` + `log/[ym]/page.tsx` now fall back to `completed_at` (new `PlanCard.completedAt`); date-less completed plans appear. Verified: log went 0→"1 adventure", month view renders the card.
- **P1-1 dateless lock** — kept allowed (a "whenever" adventure is valid) now that completion always logs; not a data bug anymore.
- **P1-2 dead calendar link** — real Google Calendar URL when dated; disabled "Set a date first" when not. Verified disabled state.
- **P1-3 vote double-count** — `PlanView` derives counts from server props + a single optimistic delta. Verified: one vote shows "Keen 1" (was 2), matches server on reload.
- **P1-4 home_area ignored** — copy fixed; server already defaults blank→home_area. Verified: blank location built an **Edinburgh** plan (real Edinburgh pubs), not London.
- **P1-5 signout** — now ends the Supabase session server-side. Verified: `/plans` redirects to `/signin` after signout.
- **P2-1 / P2-2 home** — first-run empty state with "Start a plan" CTA; "For you" header hidden when empty. Verified.
- **Security** — `getFriends` scoped to real connections (shared group/plan) + minimal columns; `av_uid` now HMAC-signed + httpOnly + secure (`lib/guest.ts`, verified in `currentUserId`); `deleteOption`/`lockDate` scope optionId to the slug's plan; `updatePlanStatus` enforces a legal-transition matrix; votes rejected once a plan is locked; `invitePeople` capped/deduped.
- **AI robustness** (`lib/ai.ts`) — ok-before-json, guarded parse, empty-content guard, one retry, drop title-less options, 25s timeout, prompt-input sanitization, hard-vs-empty error distinction.
- **Stubs wired to real APIs + persisted (verified):** profile edit (saves name/home_area/interests), group create (`/api/groups` POST + `createGroup`), invites (real `getInvites` server page + accept/decline), nudge page (real friends, single-select, sends), plus button (honest "early list", no fake billing), dead group "Add" button removed.

**Deliberately deferred (acceptable for hackathon, note for real launch):** RLS still off (service-role everywhere); `currentUserId` uses `getSession` not `getUser` (middleware validates — Supabase logs an advisory warning); in-memory rate limiter is per-instance. None block the demo.

Both `tsc --noEmit` and `next build` are green. Changes are LOCAL only — not committed/pushed (prod auto-deploys on push to main).

## D. Suggested fix order
1. **P0-1 no-install link join** + **P0-2 log/home invisibility** + **P1-1 dateless lock** — these three break the core loop and the headline promise. Fix together.
2. Security P0/P1: `getFriends` scope, `av_uid` sign+httpOnly, real signout.
3. P1 stubs that read as real: invites, groups create, profile edit, paid gate (either wire or clearly mark demo).
4. AI robustness: guard `res.json`/`JSON.parse`, sanitize prompt inputs, don't persist empty plans.
5. Polish: P1-2 calendar export, P1-3 vote count, P1-4 home_area default, P2 empty states, P3 currency.
</content>
</invoke>
