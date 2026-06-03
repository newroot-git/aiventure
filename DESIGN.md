# DESIGN — AIventure

> **Status: placeholder / simple-by-intent.** Josh will run a full aesthetic pass later with references. This system is deliberately minimal but real: friendly, rounded, warm, satisfying. Everything is tokenised so a later palette swap is a 10-minute job, not a rewrite.

## Brand direction — "Pixel Adventure" (current)
**Pixel-art game aesthetic: muted-but-colorful, funky, fun** (refs: Sheepdog dusk-forest, Kingdom lush pixel scene). It should feel like a game title screen, not a boring app — visually interesting, playful animations between pages, "we may as well make it fun." Still carries the adventure soul (earth + cosmos, hiking *or* starship) and is for **everyone, any way they socialise** (hiking, D&D, board games, movie nights, golf). Heritage notes kept below.

**Pixel language:** pixel display font (Pixelify Sans) for wordmark + titles; chunky game-UI with hard offset shadows + press-sink; 2px ink borders; muted game palette; pixel dusk-forest title scenes (blocky pines, moon, stars); smooth page transitions. Body text stays clean sans (Jakarta) for legibility — pixel for character, not for paragraphs.

## Emotional intent
Adventurous · warm/earthy · expansive/cosmic · satisfying · un-showy. Light, paper-warm base with the sunset-cosmos gradient as the signature atmosphere (used on hero, the Adventure card, and dark moments). Not flat-bright; warm and grainy.

## References (Josh-supplied)
- Earthy adventure badge (terracotta line-art, mountains + sun + stars on cream).
- aurō / "Branding is" — grainy sunset→cosmos gradient squircles, glow, minimal modern sans.
- Memories/collections + social-map apps — soft white cards, avatar stacks, bottom-nav + FAB, group-trip layout.
- Travel app with modern accent — earthy photos + a clean modern pop.
- *Stored in `~/Downloads`; full design-library capture deferred to a dedicated pass.*

## Borrowing
- Strava-style screenshot-worthy completion card → reimagined as a **sunset-cosmos Adventure badge** (gradient + grain + stars + mountain silhouette).
- Ticket/boarding-pass motif for the Plan micro-site hero.
- aurō's grainy-gradient squircle for hero/atmosphere panels.

## Signature elements (must be visible in the build)
1. **The Plan micro-site** — every plan renders as its own little living webpage (ticket-like hero, details, map, who's-in). Not a list row — a destination.
2. **The completion Adventure card** — Strava-style trophy on completion: big, warm, screenshot-bait, stamped "Adventure #N", who/what/where/when.

## Palette (tokens live in `app/globals.css` `@theme` — source of truth)
**Retro 90s primaries on cream** (the "Nostalgia" guide): bold primary colours on a warm cream/parchment base, near-black ink, grain, playful burst/star motifs. Values: red `#CE3B2A`, blue `#2A56A8`, yellow `#EBA92C`, green `#2E7B4E`, cream bg `#EAE1CF`, surface `#F5EFE1`, ink `#1E1B16`, night `#241F33`.
Meaning system: **red = brand/action · blue = AI/info · yellow = highlight/achievement (INK text on yellow, never white) · green = nature/"you're in" · cream/ink = base/text.**
Pixel-art covers/illustrations stay **muted & earthy** (they read as real places); the bold retro primaries are for UI chrome — the two layers contrast intentionally. Retro `Burst` star motif available in `components/ui` for playful accents.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#F7EFE3` | warm paper background |
| `--color-surface` | `#FFFDF9` | cards, sheets |
| `--color-surface-2` | `#F1E7D6` | sand-tinted surface |
| `--color-ink` | `#271E16` | espresso text (AA on bg/surface) |
| `--color-muted` | `#8A7B6A` | secondary text |
| `--color-line` | `#E9DCC8` | hairlines, borders |
| `--color-primary` | `#BF5A2A` | terracotta — brand / action. White bold text on it. |
| `--color-primary-deep` | `#A2491E` | pressed / deep |
| `--color-primary-soft` | `#F6E1D2` | terracotta tint |
| `--color-secondary` | `#4E6E8E` | cosmos blue — AI / grounded / future |
| `--color-secondary-soft`| `#DCE7F0` | cosmos tint |
| `--color-accent` | `#E0A458` | gold — stars, sun, highlight |
| `--color-accent-soft` | `#F8E9CF` | gold tint |
| `--color-success` | `#4E7A4E` | forest — "you're in", nature |
| `--color-success-soft` | `#DCEBD9` | forest tint |
| `--color-night` | `#1B1F2B` | deep night for cosmic dark surfaces |
| `--color-warn` | `#D98A2B` | warning |
| `--color-error` | `#C0492F` | error |

Color carries meaning, not a left-border stripe (banned). Status via full tint / pill / icon color.

## Signature gradient, grain & motion
- **`.aurora`** — the sunset→cosmos gradient (terracotta → dusk → cosmos blue). `.aurora-soft` is its light paper variant. Use on hero, Adventure card, dark CTAs.
- **`.grain`** — SVG-turbulence film grain overlay (no asset). Layer over gradients for the analog/atmospheric feel.
- **`.drift`** — slow background drift for living gradients. `Stars` + mountain-silhouette SVG = the earth↔cosmos motif.
- **Motion:** `motion` (framer-motion) via `Reveal` (fade-up, in-view, stagger by index) and `Press`. Plus CSS `animate-fade-up`, `twinkle`. Keep it smooth and calm (ease `cubic-bezier(.22,1,.36,1)`), never bouncy-gimmicky.

## Typography
- **Family:** Plus Jakarta Sans (headings + body — friendly geometric, rounded terminals). `--font-heading` / `--font-body` both map to it. Loaded via `next/font`.
- **Scale:** 12 / 14 / 16 / 18 / 20 / 24 / 30 / 38 / 48.
- **Weights:** 400 body, 500 emphasis, 700 headings, 800 display.
- **Line height:** 1.5 body, 1.15 headings.

## Spacing
Base 4px. Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 72. Generous whitespace > density.

## Radii (generous — the "bubbly" feel comes from rounding + soft color, not a childish font)
`--radius-sm 10px` · `--radius-md 14px` · `--radius-lg 20px` · `--radius-xl 28px` · `--radius-2xl 36px` · pills `rounded-full`.

## Shadows (soft, never harsh)
- `--shadow-soft`: `0 2px 8px rgba(42,38,34,.05), 0 10px 28px rgba(42,38,34,.05)`
- `--shadow-pop`: `0 12px 30px rgba(242,84,45,.18)` (primary actions, the Adventure card)

## Components (define before building — Phase 3)
- **Button** — `rounded-full`, generous padding, `shadow-pop` on primary, gentle press-scale (active:scale-95). Variants: primary (coral), secondary (green), ghost, soft. Sizes sm/md/lg. States: default/hover/press/disabled/loading.
- **Card** — `rounded-2xl`, `bg-surface`, `shadow-soft`, soft `border-line`. No side-border accents.
- **Pill / Tag** — `rounded-full`, soft tint bg + matching text (interest tags, status, visibility). Selectable variant for onboarding.
- **Avatar / AvatarStack** — rounded, warm ring; stack shows "who's in".
- **Input / Textarea** — `rounded-xl`, soft surface-2 fill, clear focus ring (primary).
- **Sheet / Modal** — `rounded-t-2xl` bottom sheet feel, soft backdrop.
- **MapEmbed** — rounded static map (Google Static Maps or embed) for the place.
- **OptionCard** — an AI Drop / suggestion option: image, title, why-line, source-link chip, vote control. The unique bit: a "✨ grounded" source chip proving it's real.
- **RSVPControl** — in / maybe / out, big friendly toggle, fills green when "in".
- **KeyInfo list** — AI-generated "bring water / no glass" chips with icons.
- **AdventureCard** — the signature completion trophy. Bold, warm gradient, stamp, stats, "Adventure #N", share button.

### What makes components feel like THIS app
Everything is pill/blob-round, warm-tinted, soft-shadowed, with a satisfying micro press-scale. The "grounded ✨" source chip on every suggestion is unique — it's the trust signal that says *this is a real place, not AI making things up*.

## Iconography & the NO-EMOJI rule (hard)
- **Never use emojis** — not in UI, not in copy, not in data, not in avatars. This is absolute (Josh's standing rule).
- **Icons:** `lucide-react` only. Consistent stroke, rounded line caps. Default size 18–20px, `currentColor`, weight matched to text.
- **Avatars:** initials on a tinted circle (deterministic colour from the name) — never an emoji face.
- **Category / interest tags:** plain text, optionally a small lucide icon. No emoji prefixes.
- **"Grounded" trust chip:** lucide `Sparkles` + source label, in secondary tint.
- Standard icon meanings: `Check` (in / done), `HelpCircle` (maybe), `X` (out / can't), `Lock` (locked in), `MapPin` (place), `CalendarDays` (when/calendar), `Link2` (invite/share), `Sparkles` (AI drop / grounded), `Users` (group), `Compass`/`Map` (plans), `UserRound` (profile), `Plus` (new).

## Theme wiring rule
Tokens in `@theme` (globals.css) → Tailwind classes (`bg-primary`, `rounded-2xl`, `font-heading`, `shadow-pop`). No hex codes, no pixel values, no inline `style={{}}` for theming. Dynamic-only values (e.g. progress width) are the sole inline-style exception.
