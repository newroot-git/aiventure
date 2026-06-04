# AIventure — database notes

The source of truth for how the data layer actually works, its known debt, and the
roadmap. Read before touching schema or `lib/db.ts`.

## How to apply schema changes
DDL can't be run headlessly here (the Supabase MCP token is unauthorized and the
service-role key can't run DDL via PostgREST). Apply migrations in the **Supabase
SQL editor** (project `wzthtphvdsyzkwupbmjp`), in order:

1. `migrations/0002_rls.sql` — **security-critical, do this first.**
2. `migrations/0003_indexes.sql` — performance.
3. `migrations/0004_constraints.sql` — value guards.

(`schema.sql` is the original 9-table create; the 6 community/social tables were
added later via the editor. The `migrations/` files are additive on top of live.)

## Security model (important)
- **Server reads/writes use the service-role client** (`lib/supabase/admin.ts`),
  which **bypasses RLS**. This is the trusted gateway; never import it client-side.
- **The browser/anon client** (`lib/supabase/client.ts`) is used for **auth only**
  (sign-in, sign-out) — it never queries app tables.
- The anon/publishable key is **public** (`NEXT_PUBLIC_...`). With **RLS OFF**
  (current state) anyone with it can read/write every table via Supabase REST.
  → `0002_rls.sql` enables RLS on all tables with no policies = deny anon, while
  the service role keeps the app working. **Apply it.**
- Per-row authorization in the app is enforced in `lib/db.ts` (`assertOwner`,
  `currentUserId`), not in the DB yet. When client-side data reads are added,
  add RLS policies keyed on `auth.uid() = profiles.auth_id` (examples in 0002).

## Identity
- `profiles.auth_id` links a row to a Supabase auth user. `currentUserId()`
  resolves: auth session → profile by `auth_id`, else by `email` (links), else
  creates one. Guests ("I'm a judge") get a profile + an `av_uid` cookie (no auth).
- Seeded demo profiles use fixed UUIDs (Josh = `11111111-…`). Josh's email is set
  to `afiredeck@gmail.com` so his real login links to the seeded profile. Conor's
  email still needs setting for the same.

## Schema patterns (and why)
DDL access has been limited, so several things ride existing columns instead of new
ones. This works but is the main cleanliness debt:
- **Slots / scaffold / recurrence / seriesId** live in a single `plan_options`
  **meta row** (`kind='time', title='__meta'`, `payload.meta = {...}`) — no columns
  added. `readMeta`/`writeMeta` in `lib/db.ts`.
- **Date candidates** (availability) = `plan_options` rows with
  `payload.date_option=true`; **availability votes** reuse `option_votes`.
- **Recurring instances** = full cloned `plans` rows sharing `payload.meta.seriesId`.
- Repurposed columns: `avatar`→`avatar_emoji`, cover→`cover_hue` (tile key),
  search location→`place_address`.
- The Supabase client is **untyped** → inserts cast `as never`, rows `as Row`
  (`Record<string,unknown>`). Type-safety is the biggest code-quality debt.

## Roadmap (highest value first)
1. **Apply `0002_rls.sql`** — closes the public-key data hole. (security)
2. **Typed `Database` type + typed clients** — run
   `npx supabase gen types typescript --project-id wzthtphvdsyzkwupbmjp > lib/supabase/types.gen.ts`
   (needs `supabase login` / access token), then type `createClient<Database>` and
   drop the `as never`/`as Row` casts. Catches whole classes of bugs.
3. **Promote the jsonb hacks to real columns** once DDL is easy:
   `plans.recurrence jsonb`, `plans.series_id uuid`, a `plan_slots` table (or
   `slot/slot_label/slot_order/day/fixed` columns on `plan_options`), and
   `plan_options.is_date_option boolean`. Lets the DB query/index them directly
   instead of JS-side filtering of payload.
4. **RLS policies** when any client-side data read is introduced (see 0002).
5. **`option_votes` cleanup on option delete** is handled by FK cascade; verify
   cascades exist on the 6 later tables (added via editor — confirm in dashboard).
