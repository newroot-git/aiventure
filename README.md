# AIventure

**The anti-social-media adventure app.** Instead of watching other people's lives, AIventure helps you and your friends actually go *do* things together — then keeps a private record of every adventure you've had.

No feed. No following. No showing off. The unit isn't a post — it's a **Plan** (an intention to go do something real). Success = you got outside and did a thing with people.

> Built for the UCWS Singapore Hackathon 2026 (Agent track).

---

## What it does

- **Plan** = one activity (a hike, a dinner, a date). **Adventure** = multiple activities (a day out → a multi-day trip).
- **Scope-based creation** — from "give me something to do today" → "plan one thing with the crew" → "build a day's adventure" → "plan a trip". An AI agent turns a loose intent into real, grounded suggestions.
- **Crew** — your friends, groups, and nudges (poke a mate to make plans with you).
- **Explore** — discover communities and open plans near you, tuned to your interests.
- **Calendar**, **countdown to your next plan**, **notifications**, and a month-organised **adventure log**.
- **Pixel-art aesthetic** — covers, tiles, and avatars generated via Nano Banana, in a retro game style.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Styling | Tailwind CSS v4 (design tokens in `app/globals.css`) |
| Motion | `motion` (Framer Motion) |
| Icons | `lucide-react` |
| AI | OpenRouter (Claude + Nano Banana for image gen) |
| Data | Supabase (Postgres) — schema in `supabase/schema.sql` |

## Project structure

```
app/
  (app)/            # authed shell (sidebar/bottom-nav): home, calendar, explore, crew, profile, plan, adventure…
  onboard/ new/ welcome/ signin/   # standalone flows
  globals.css       # design tokens + pixel-art utilities (single source of truth)
components/         # reusable UI (ui.tsx primitives) + feature components
lib/
  types.ts          # domain types
  mock.ts           # mock data (stands in until Supabase is wired)
  interests.ts      # interest taxonomy + typo-tolerant search
  supabase/         # client/server/admin helpers
scripts/            # one-off pixel-art asset generators (Nano Banana)
supabase/schema.sql # database schema
public/img/         # generated pixel art (covers, tiles, avatars, icons)
```

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev                  # http://localhost:3000
```

### Environment variables (`.env.local`)

| Var | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | AI plan generation + image gen |
| `OPENROUTER_MODEL` | e.g. `anthropic/claude-3.5-sonnet` |
| `GOOGLE_PLACES_API_KEY` | grounding: places/restaurants |
| `TICKETMASTER_API_KEY` | grounding: events |
| `TAVILY_API_KEY` | grounding: long-tail search |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only Supabase access |

Secrets live in `.env.local` only (gitignored). Never commit keys.

## Design system

See `DESIGN.md` — palette (retro primaries on cream), the pixel display font, chunky game-UI components, grain texture, and the no-emoji rule. All visual values are Tailwind tokens in `app/globals.css`.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | dev server (Turbopack) |
| `npm run build` | production build |
| `npm run lint` | ESLint |

## Status

V1 is feature-complete on mock data. Wiring in progress: real AI plan generation (OpenRouter) and Supabase persistence. The `/screens` route renders every screen in device frames for review.
