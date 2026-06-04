# AIventure — deferred build plan: availability, travel/logistics, polish

Written 2026-06-04. Scope notes for features we agreed to **plan now, build after** the hackathon push. Read alongside `PICKUP.md`.

---

## 1. Availability — multiple date/time options + overlap

**Goal:** a plan (especially nudge-plans) lets each person propose date/time candidates and mark which work; the group converges; the owner locks the final `starts_at`. Replaces the single `WhenPicker` for collaborative plans.

**Data (no DDL):** reuse existing tables.
- Date candidates = `plan_options` rows with `kind='time'`, `payload = { date_option: true, iso }`. (The `__meta` row already uses `kind='time'`; filter by `payload.date_option`.)
- Availability = the existing **`option_votes(option_id, profile_id)`** table — a row means "this time works for me". Already in `schema.sql`, currently unused.

**Flow:**
1. Anyone adds a candidate datetime (chip) → insert a `date_option` row.
2. Each member taps candidates that work → upsert/delete `option_votes`.
3. UI shows a tally per candidate ("4/5 free") + highlights the best overlap.
4. Owner taps a winner → `setPlanWhen(iso)` + optionally clears candidates.

**UI:** a "When works?" section in `PlanView` (collaborative plans / when `starts_at` unset). Grid of candidate chips with avatar ticks + count. Owner sees "Lock this time".

**Build size:** ~half a day. New: `addDateOption`, `toggleAvailability`, `getDateOptions` in `db.ts`; an `AvailabilityPicker` component; one route or extend `edit`. Low risk (additive).

**Note:** the nudge-plan already drops people into a shared plan with the slot scaffold "What shall we do?" — availability slots in right above the activity slots.

---

## 2. Travel / logistics (Josh's Hong Kong ferry case)

**Why:** between adventure stops, travel isn't obvious. The HK day had everything close except one stop that needed a **ferry to another island** — not surfaced when picking. The app is meant to remove logistics worry: "here's how you get A→B→C→D."

**Keep it minimal / hidden** — not bloated. Two layers:

### a) Crew travel mode (one setting per plan)
- A single chip on the plan: **Car · Walking · Public transport · Mix**. Stored in meta `payload.meta.travel = "car" | ...`.
- If "Car" → assume they drive everywhere, minimal annotation.
- Drives the tone of travel hints below.

### b) Travel between stops (adventure/trip)
- Between consecutive chosen stops, show a thin connector row: `~15 min` + mode icon (walk/transit/drive) + a flag when it's **non-trivial** (e.g. >30 min, or crosses water / needs a ferry/flight).
- Computation options (no paid API):
  - Cheap: straight-line distance from the geocoded pins (we already geocode in `PlanMap`) → rough time by mode. Flag long hops.
  - Better later: OSRM public demo server (`router.project-osrm.org`) for real routing by car/foot, or Google Directions if a key is added.
- The **ferry/island** case falls out of "crosses water + long hop" → show a clear "🚢 ferry — plan extra time" style flag (no emoji per brand → use a lucide `Ship`/`AlertTriangle` + label).
- Render minimized by default: a small "Getting around" toggle that expands the per-leg breakdown. Collapsed state just shows total travel time for the day.

### c) Trips (multi-day) — bigger logistics
- Per-trip: **flights / transport to the destination**, **accommodation**, plus the per-day travel above.
- Store as dedicated fixed slots (`fixed: true`) e.g. "Getting there", "Where you're staying" — already supported by the slot model. AI can suggest; user can fill.
- Defer real flight/hotel data; start as free-text / AI-suggested fixed slots.

**Build size:** (a) trivial. (b) ~half-day with straight-line + flags; more with OSRM. (c) mostly falls out of fixed slots — small.

**Principle:** logistics is opt-in detail, collapsed by default. The value is *clarity when it matters* (the ferry), not a dense itinerary.

---

## 3. Polish / motion / haptics

Josh's note: there's lag between sections, no transitions, no haptic feedback. Consider smoothness now or save for a more final state.

**Quick wins (low risk, do early):**
- **Perceived lag** between routes = server components re-fetching. Add `loading.tsx` skeletons per route + use `router.refresh()` more surgically (already do). Consider optimistic UI on vote/pick (we mutate then refresh — could update local state instantly).
- **Page transitions:** there's already `template.tsx` + `motion`. Add a subtle shared fade/slide on route change.
- **Press feedback:** buttons already have `active:scale`. Add `navigator.vibrate?.(10)` on key taps (mobile haptic) behind a tiny helper — cheap.
- **List/section reveals:** `Reveal` already staggers; extend to cards/calendar.

**Bigger (save for final):**
- Shared-element transitions (cover → plan hero).
- Skeleton + suspense streaming everywhere.
- Spring physics on sheets/popovers (motion layout animations).

**Recommendation:** ship the quick wins (loading skeletons + optimistic vote/pick + tap haptics) in a dedicated polish pass; defer shared-element/streaming until content + flows are locked.

---

## Priority order when resumed
1. Availability (highest user value, additive, unblocks nudge-plan convergence).
2. Travel mode chip + straight-line travel flags (the ferry clarity).
3. Polish quick wins (loading skeletons, optimistic vote/pick, haptics).
4. Trip logistics fixed slots.
5. Real routing (OSRM) + shared-element transitions.
