# AIventure — Pickup

Last session: 2026-06-04. Hackathon due June 5 (Agent track). Style LOCKED: lush peaceful pixel landscapes, NO emojis, lucide icons + initials/image avatars.

## Foundation — Plan = activity-slots model
A plan is ordered **slots** ("Brunch", "Main thing", "Drinks"), each holding voteable options; pick one per slot. One renderer (`PlanView`) for everything: one-thing = 1 slot, adventure = N slots day 1, trip = slots across days. `/a/[slug]` redirects to `/p/[slug]`. Slots + scaffold + recurrence live entirely in `plan_options` (no DDL).

## This session — AI opt-in, manual build, recurring, map, polish
- **AI is opt-in, not default.** `/new` ends in two CTAs: "Build it with AI" vs "I'll build it myself". `createPlanFromDrop(aiBuild)` → AI fills slots OR creates an empty named **scaffold** per scope (single=1, adventure=Food/Main/After, trip=Morning/Lunch/Afternoon/Evening × days). Scaffold persisted in a **meta row** (`plan_options` kind=`time`, title=`__meta`, payload.meta={scaffold,recurrence}).
- **Per-slot AI on tap** — empty slot shows "Suggest with AI" (`refineSlot` with no feedback); populated slot shows the refine box. Every slot also has "add your own".
- **Add steps** — per-day "Add a step" appends a slot to the scaffold (`addSlot`).
- **General feedback** — one box re-rolls the whole plan (single-day) or a whole day (multi-day) in one shot (`refineAll`, `/api/plans/refine` with `all:true`).
- **Proper titles** — `generateDrop` returns a `title`; multi-slot plans keep it as the hero (never name themselves after the first venue; `deriveHeadline` is scaffold-aware). Single-slot still adopts the chosen venue name.
- **General-area "where"** — multi-slot plans show the area (`place_address`) + stop count; single shows the venue.
- **Per-activity times** — each decided slot has an on-brand time chip (`setSlotTime`). AI prose times ("lunch") are sanitized out; only `HH:MM` kept.
- **Multi-pin map** — `components/PlanMap.tsx`: Leaflet via CDN + OSM tiles (no key), geocodes each chosen activity via Nominatim, numbered pins + fit bounds. Shows when ≥1 located stop.
- **Recurring weekly series** — `setRecurrence` stores `{cadence:weekly, weekday, time}` in meta. PlanView "Recurring" control + "Weekly" badge + "in this week" RSVP framing. `CalendarView` expands recurring plans across a −4wk…+26wk window so they repeat on each weekday. (Per-occurrence RSVP/time-shift deferred — MVP shares one RSVP/time.)
- **Delete plans** — confirm-then-delete button (`deletePlan`), routes to /plans.
- **Location search** — `/new` "add an area" is now a debounced OSM Nominatim typeahead (tap a result) + "Use my location" (geolocation reverse-geocode) + multi-area chips.
- **Pickers** — `WhenPicker` popout is now a centered ~380px panel; today highlighted in both `WhenPicker` and `CalendarView`. Calendar day thumbnails use `cover-*.png` (all exist).

Verified end-to-end vs live Postgres: manual create (empty scaffold) → AI-suggest empty slot → add step → set recurrence → choose → per-activity time → refineAll (re-rolls all incl manual step) → delete. `next build` green. Test plans cleaned.

## Open / next
- Per-occurrence recurring state (this-week RSVP, per-week time shift) — currently one shared RSVP/time across occurrences.
- `PlanMap` geocodes client-side each load (Nominatim, ~1 req/place); fine for demo, could cache coords on choose.
- `log/page.tsx` still uses `<Tile>` (sparse `/img/tiles`) — switch to cover if it matters.
- Optional: magic-link auth, Vercel deploy.

## Stack notes
- Next 16 / React 19 / Tailwind v4. OpenRouter: chat `anthropic/claude-sonnet-4.5`. No Google Places key → location search + map use free OSM (Nominatim + Leaflet/OSM tiles).
- Supabase service-role server-only (`lib/supabase/admin.ts`), RLS on, untyped client → `as never`. DEMO_USER_ID = 11111111-1111-1111-1111-111111111111.
- All slot/scaffold/recurrence data in `plan_options` (meta row pattern, no DDL).
- Secrets in `.env.local` only. Commit as newroot-git. Dev on :3210.
