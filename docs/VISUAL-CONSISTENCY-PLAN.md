# Visual consistency plan — pixel-language pass

**Goal:** one visual language across the app. Today two coexist:
- **Pixel (canonical)** — 2px **full ink** borders, **hard offset** shadows (`shadow-hard` = `4px 4px 0 ink`, `shadow-hard-sm` = `3px`), `press-hard` sink, chunky `rounded-md`, retro primaries. Already used by `Button`, `SelectTag`, list cards with `hard`, the hero.
- **Soft (legacy, to retire)** — blurry `shadow-soft` / `shadow-pop`, faint `border-ink/10`, soft-tint icon bubbles with no border, `rounded-xl` pills, `active:scale-95`. This is what looks "off" in the When/Where/Who cards and the I'm in/Maybe/Can't buttons.

**Canonical source = `app/globals.css` `@theme` + `.shadow-hard*`.** `DESIGN.md`'s body still describes the old soft system ("Shadows soft, never harsh", `shadow-soft` cards, `rounded-full` `shadow-pop` buttons, old terracotta palette `#BF5A2A`/`#F7EFE3`) — it contradicts the shipped pixel system. Fix the doc too (last item) so it stops misleading.

---

## The rule (apply everywhere)
1. **Surfaces (cards/sections/sheets/bubbles):** `border-2 border-ink` (full ink, not `/10`) + `shadow-hard` (large surfaces) or `shadow-hard-sm` (small/inline/dense). No `shadow-soft`.
2. **Interactive (buttons/toggles/tags):** `border-2 border-ink` + hard shadow + `press-hard` (not `active:scale-95`). Use the `Button`/`SelectTag` pattern.
3. **Radius:** chunky — `rounded-md` default, `rounded-lg`/`xl` only for big hero/sheet. Kill `rounded-xl` pill toggles.
4. **Icon bubbles:** soft-tint fill is fine for *meaning colour*, but add `border-2 border-ink` + `shadow-hard-sm` so they read as pixel chips, not soft blobs.
5. **Retire** `shadow-soft` and `shadow-pop` from UI chrome (keep `aurora`/gradient hero treatments as-is — those are intentional).

---

## Component fixes (file → change)

### 1. `components/ui.tsx` — `Card` (the root offender; cascades everywhere)
- L54: `"rounded-xl border-2 border-ink/10 bg-surface"` + default `shadow-soft`.
- **→** `"rounded-xl border-2 border-ink bg-surface"`, default shadow `shadow-hard-sm` (or make `hard` the default and add a `flat` opt-out). Every `<Card>` (home list, calendar, explore, nudges) inherits the pixel edge. Verify list density doesn't get too heavy — if it does, use `shadow-hard-sm` for cards, `shadow-hard` for hero/feature cards.

### 2. `components/ui.tsx` — `Pill` (status chips)
- L82: soft tint, no border/shadow. For cohesion add `border-2 border-ink` (keep tint fill). Small enough that no shadow is fine. (Lower priority — but the "Planning/Locked in" pills will look intentional with an ink edge.)

### 3. `components/ui.tsx` — `Avatar`
- L147/160: `border-ink/15` → `border-2 border-ink` (the `G4` avatar + all stacks get a crisp pixel edge). Check `AvatarStack` ring still reads.

### 4. `components/plan.tsx` — `RSVPControl` (Image #3 — I'm in / Maybe / Can't)
- Currently `rounded-xl … border` (1px), active "in" = `bg-success text-white border-success shadow-pop`, `active:scale-95`.
- **→** pixel toggle: `rounded-md border-2 border-ink press-hard`, active "in" = `bg-success text-white shadow-hard-sm`, active "maybe" = `bg-accent text-ink shadow-hard-sm`, active "out" = `bg-surface-2 text-muted`, inactive = `bg-surface text-ink` (ink border throughout). Drop `shadow-pop`/`scale-95`. This is the most visible win.

### 5. `components/PlanView.tsx` — `Section` (Image #4 — When/Where/Who/availability cards)
- Root: `rounded-xl border-2 border-ink/10 bg-surface p-5 shadow-soft` → `border-ink … shadow-hard` (or `shadow-hard-sm`).
- Icon bubble: `grid h-7 w-7 rounded-md bg-{tone}-soft` → add `border-2 border-ink shadow-hard-sm` (keep tint fill for meaning colour). This directly fixes "icons + bubbles + drop shadows don't match."

### 6. `components/plan.tsx` — `OptionCard`, `KeyInfoChips`, `WhenPicker`, `AdventureCard`
- Audit each for `shadow-soft`/`border-ink/10`/`border-line`/`rounded-xl` and bring to the rule. OptionCard selected/unselected states should use ink border + hard shadow (match `SelectTag`).

### 7. Sweep for stragglers
Grep and bring each to the rule:
```
grep -rn "shadow-soft\|shadow-pop\|border-ink/10\|border-ink/15\|rounded-2xl\|rounded-xl" components app --include='*.tsx'
```
Likely hits: `Countdown`, `CalendarView` day cells, `CrewView`, `ExploreView` cards, `NotificationsMenu`, `NudgeSheet`, `QuickMenu` panel, `Tile`. Keep `aurora`/PixelScene/AdventureCard gradient treatments — those are intentional dark/hero surfaces, not soft-system chrome.

### 8. `DESIGN.md` — stop the contradiction
- Replace the "Shadows (soft, never harsh)" section + the `shadow-soft`/`shadow-pop`/`rounded-full` component specs with the pixel rule above.
- Replace the stale palette table (terracotta `#BF5A2A`, bg `#F7EFE3`) with the real `@theme` values (red `#CE3B2A`, bg `#EAE1CF`, …) or just point to `globals.css` as the single source.

---

## Suggested order (each is independent + shippable)
1. `RSVPControl` + `Section` (the two screenshots — biggest visible win, low blast radius).
2. `Card` default (cascades to all list pages — verify density after).
3. `Avatar` + `Pill` ink edges.
4. `OptionCard`/pickers + the grep sweep.
5. `DESIGN.md` cleanup.

## Risks / watch-outs
- Hard shadows are **directional** (offset down-right) — they need right/bottom clearance. Cards in tight grids may clip; add a little gap or use `shadow-hard-sm`.
- Don't pixel-ify the `aurora`/gradient hero, `PixelScene`, or `AdventureCard` — those are intentionally atmospheric.
- `press-hard` translates the element 4px on click — make sure it's not inside `overflow-hidden` that clips the motion.
- No emojis (standing rule); icons stay lucide.
