# AIventure — Pickup

Last session: 2026-06-04. Hackathon due June 5 (Agent track, submit by 23:59 SGT). Style LOCKED: lush pixel landscapes, NO emojis, lucide icons + initials/image avatars.

## Architecture
Plans = ordered **slots** (each holds voteable options; pick one per slot). One renderer `PlanView` for one-thing / adventure / trip. Slots + scaffold + recurrence all live in `plan_options` (no DDL — meta row `kind='time', title='__meta'`). `/a/[slug]` → redirects `/p/[slug]`.

## Identity (real owner/participant — auth seam)
- `currentUserId()` in `lib/db.ts` reads the **`av_uid` cookie** (default Josh). This is the single seam — swap for a Supabase session when magic-link lands; every reader already routes through it.
- Owner = `plan.creator_id`. **Owner-only (server-enforced via `assertOwner`):** lock / complete / delete / rename. Participants: vote, pick, add options, refine, RSVP.
- Dev **profile switcher** in `AppShell` (sidebar + mobile header) → `POST /api/whoami` sets the cookie. 7 seeded profiles (Josh, Conor, Jack, Sam, Mia, Tom, Priya).
- `getPlanBySlug` returns `isOwner`; PlanView hides owner actions for participants ("the owner locks it in").

## Nudges (the intent to hang out)
- QuickMenu "Send a nudge" = inline `NudgeSheet` popup (pick friend → `POST /api/nudge`). Also on Crew (preset friend).
- Sending a nudge creates a **shared empty plan** (sender=owner, recipient=member, scaffold "What shall we do?") + a notification linking to it. Recipient clicks the notification → lands in that plan to co-build (NOT the from-scratch flow). Sender can pre-build first.
- **Poke non-voters** (owner): `POST edit {action:"poke"}` notifies members who haven't weighed in.

## Notifications (real)
- Created on: invite, nudge, lock-in, poke (`notify()` in db). `getNotifications` returns `kind` + `plan_slug`. NotificationsMenu splits nudges (→ plan link) vs activity; opening the panel marks all read (`POST /api/notifications/read`).

## This session also shipped
- **Typing bug FIXED** — `SlotBlock` was a nested component remounting inputs each keystroke; now called as a function. Multi-char typing works (verified).
- **Recurring**: weekly / fortnightly / monthly in the Recurring control; calendar expands all three.
- **Editable plan title** (owner, tap hero). **Update location** (owner, Where section). **Invite friends in `/new`** create form (→ members + notifications). **Calendar**: time + multi-event count on day cells, time/cadence on day cards. **Who-with** label on home "Next adventure" (with Conor / with the boys).
- Routes: `edit` gained title/location/poke; `/api/nudge`, `/api/whoami`, `/api/notifications/read`, `/api/friends`; create accepts `inviteIds`.

Verified vs live DB: owner gate (Conor blocked, Josh allowed), nudge → shared plan + both members + recipient notification w/ slug, typing fix. `next build` green. Test plans cleaned.

## Deferred — see `docs/PLAN-logistics-availability-polish.md`
- **Availability**: multi date/time options + overlap (reuse `option_votes` + `date_option` rows). Planned, not built.
- **Travel/logistics**: crew travel-mode chip + per-leg travel time + ferry/long-hop flags (Josh's HK case); trip flights/accom as fixed slots. Minimized UI. Planned.
- **Polish**: loading skeletons, optimistic vote/pick, tap haptics, route transitions. Planned.
- **Add-step**: kept (it's the manual-build affordance, not redundant) — revisit if it clutters AI-built plans.
- Real **magic-link auth** (cookie switcher is the stand-in).
- Legacy `/nudge` page now orphaned (QuickMenu uses popup); harmless, can delete.

## Stack
- Next 16 / React 19 / Tailwind v4. OpenRouter chat `anthropic/claude-sonnet-4.5`. No Google key → location search + map on free OSM (Nominatim + Leaflet).
- Supabase service-role server-only, RLS on, untyped client → `as never` / `as unknown as Row`. DEMO_USER_ID = 1111…1111.
- Secrets in `.env.local`. Commit as newroot-git. Dev on :3210.
