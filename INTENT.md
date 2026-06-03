# INTENT — AIventure

## One sentence
AIventure is the anti-social-media adventure app: instead of watching other people's lives, an AI helps you and your friends actually go *do* things together — and keeps a record of every adventure you've had.

## Target user
People (any social temperament — extrovert crews, introverts planning solo, couples, big communities) who want to do more real-world things with friends but get blocked by group-chat admin, indecision, and "we should hang out more" that never happens.

## Problem
The group chat is the worst tool for planning. Plans die in 200 unread messages; nobody owns the decision; everyone's "easygoing" so nothing gets picked; logistics smear across a dozen apps. It's a connection problem dressed as a productivity one. (Backed by research: 40% feel overwhelmed by group chats; 56% of under-30s flake on plans; the "easygoing" deadlock measurably erodes friendships.)

## The shift vs social media
Social media promised connection and delivered passive watching. AIventure inverts it: no feed, no following, no stalking. The unit isn't a post — it's a **Plan** (an intention to go do something real). Success = you went outside and did a thing with people, and you have a shareable record of it.

## Core user loop
1. Someone has a loose intent ("something Saturday with the boys").
2. AIventure's agent turns it into a **Plan** — a living micro-site with a real, grounded activity, time, place, who's in, key info.
3. Friends join via link (no install needed — web works), react, and lock details through structured suggestions (not chat).
4. They go do it.
5. Mark complete → a **shareable Adventure card** (Strava-style trophy). It's logged to everyone's adventure history.

## Three entities
- **Plans** — the atom. An intention rendered as a micro-site. Visibility: group / invite-only / open / interest-filtered.
- **Groups** — your recurring crews ("the boys"). Plans live inside them.
- **Communities** — discovery at scale (100+), getting you into bigger things. *(Post-MVP.)*

## Two ethos rules (load-bearing)
- **No exclusivity / no-install:** anyone can interact with a Plan via web link; drop an email to get it on your calendar or be notified. Never blocked by "I don't want another app."
- **One paid member empowers the Plan:** if any member is paid, the Plan gets AI features for everyone on it. Free users are never locked out of participating.

## Differentiator (from research)
No one at scale does "AI tells your *existing* friend group what to actually do, grounded in real local options, tuned to combined interests + history." Competitors chase making *new* friends (Pie, Timeleft, Clyx) or *trip* planning (Mindtrip, Troupe). The moat is **per-group taste + outcome history that compounds** — not the suggestions (cloneable). Grounding every suggestion in real data with a source link is what separates magic from hallucinated slop.

## MVP scope (ships Fri Jun 5 — UCWS Singapore Hackathon, Agent track)
**Must-have:**
- Quick interest onboarding (tags + free text, go-deeper optional)
- Create a Plan → **AI Drop**: Claude agent returns 3–4 real grounded options (Google Places / Ticketmaster / Tavily), each with source link + why-you'll-like-it + key info
- The **Plan micro-site** (`/p/[slug]`): hero, activity, time, place + map, who's-in RSVP, AI key-info, structured suggestions + voting, light comments, invite-by-link
- **No-install web join** (name only) + add-to-calendar (.ics / Google URL)
- **Completion → shareable Adventure card**
- Light groups; dev tools (reset + dev notes)
- Free/paid gate UI (one paid member empowers the Plan)

**Should-have (if time):** group-scoped plan creation, interest-filtered visibility, basic adventure history list.

**Could-have / explicitly OUT for MVP:** communities/discovery at scale, real photo upload (stub only), realtime presence, stats dashboards, real billing/Stripe, real push/email sending, native app.

## Signature elements
1. The **Plan micro-site** — every plan is its own little living website, built to be shared.
2. The **completion Adventure card** — the Strava-style screenshot-worthy trophy when a plan is done.

## Emotional direction (3–5 adjectives)
Friendly · adventurous · warm/comforting · satisfying · un-showy.
(Light mode — social warmth, daytime, approachable. NOT dark.)

## Competitive research (summary)
- **Make-new-friends players** (Pie, Timeleft, Clyx): solve loneliness via stranger-matching, not activating existing crews.
- **Trip/AI-itinerary** (Mindtrip, Troupe, Wanderlog): trips only; Troupe owns voting, Mindtrip attempts AI vibe-merge loosely. Nobody merges N preference profiles into a generated plan.
- **Coordination graveyard** (IRL, Cluster, Squad, Down): killed by the whole-group install tax, iMessage gravity, utility≠desire. AIventure's counters: deliver value from one person's input pre-group-join; be useful via web with zero install; make the output a desirable trophy, not a chore.
- Full brief: `docs/brief.html`.
