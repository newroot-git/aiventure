#!/usr/bin/env node
// Pressure-test: stream the (app) shell + cut per-request round-trips to fix the
// slow app-entry / onboarding landing (measured ~1s save + ~1s /plans render).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname);
const OUT_DIR = join(ROOT, '_audit');
function loadEnv() {
  const p = join(ROOT, '.env.local'); const out = {};
  if (!existsSync(p)) return out;
  for (const l of readFileSync(p, 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
  return out;
}
const env = loadEnv();
const KEY = process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY;
if (!KEY) { console.error('Missing OPENROUTER_API_KEY'); process.exit(1); }

const FILES = [
  'app/(app)/layout.tsx',
  'components/AppShell.tsx',
  'components/NotificationsMenu.tsx',
  'app/(app)/plans/page.tsx',
  'app/onboard/page.tsx',
];
let bundle = '';
for (const rel of FILES) { const p = join(ROOT, rel); if (existsSync(p)) bundle += `\n\n===== FILE: ${rel} =====\n${readFileSync(p, 'utf8')}`; }
// relevant db.ts functions
const db = readFileSync(join(ROOT, 'lib/db.ts'), 'utf8').split('\n');
function slice(name) {
  const i = db.findIndex((l) => l.includes(name));
  if (i < 0) return '';
  let end = i + 1; let depth = 0; let started = false;
  for (; end < db.length && end < i + 60; end++) { const l = db[end]; for (const c of l) { if (c === '{') { depth++; started = true; } else if (c === '}') depth--; } if (started && depth === 0) break; }
  return db.slice(i, end + 1).join('\n');
}
bundle += `\n\n===== lib/db.ts excerpts =====\n` +
  ['export const currentUserId', 'export async function getUserPlans', 'export async function updateMyProfile', 'export const getCurrentProfile', 'export const getInvites', 'export const getNudges', 'export const getNotifications']
    .map(slice).filter(Boolean).join('\n\n');

const CONTEXT = `
MEASURED (dev, server render time excluding compile):
- POST /api/me (onboarding profile save) = ~1043ms; app-code 960ms. updateMyProfile does 3 sequential Supabase round-trips: currentUserId resolve, update name/interests, then a SEPARATE update for home_area (split defensively in case the column is unmigrated).
- GET /plans (the landing after onboarding) = ~984ms; app-code 941ms. getUserPlans is itself a sequential 3-4 query chain; the page also reads profile/invites/nudges/openEvents (those are Promise.all'd already).
- Onboarding final step = ~1s save THEN ~1s /plans render, sequential. A spinner only covers the first half.

KEY STRUCTURAL ISSUE (Claude's hypothesis):
- app/(app)/layout.tsx awaits Promise.all([getInvites, getNudges, getNotifications, getCurrentProfile (+ getAllProfiles when dev)]) BEFORE rendering AppShell. AppShell is "use client". So on every entry into the (app) route group (e.g. onboard -> /plans, signin -> /plans), the shell + the (app)/loading.tsx page skeleton can't appear until the layout's inbox queries resolve. The layout has no Suspense boundary, so it blocks the whole subtree.
- getCurrentProfile/getInvites/getNudges/getNotifications are now React cache()-wrapped (dedup across layout+page in one request).

PROPOSED FIX (Claude):
1. Stream the (app) shell: layout awaits only what the chrome needs (me, maybe profiles), and passes the inbox data (invites/nudges/notifications) to AppShell as an UNAWAITED promise. AppShell wraps NotificationsMenu in <Suspense> and the menu reads the promise via React 19 use(). Shell + page skeleton then paint immediately; the notification badge streams in.
2. Optionally pass 'me' as a promise too and show the neutral FALLBACK_USER until it resolves, so even the 'me' query doesn't block the shell.
3. Cut updateMyProfile to fewer round-trips (merge the two profile updates) IF home_area is confirmed migrated.
`;

const SYSTEM = `You are a Next.js 16 / React 19 App Router + RSC streaming expert. Adversarially pressure-test the proposed "stream the (app) shell" change. This touches the SHARED app shell (high blast radius), so be precise about what breaks. State agree/disagree, cite file:line, and give the cleanest correct implementation. No filler.`;

const USER = `# Pressure-test: stream the (app) shell to fix slow app-entry / onboarding

${CONTEXT}

Answer:
1. **Is streaming the shell the right fix** for the perceived slowness, or is the real win elsewhere (cutting query count, parallelizing getUserPlans, caching, edge/colocation, navigating optimistically from onboard)? Rank the levers by impact.
2. **What breaks / gotchas** with passing an unawaited promise from a Server Component layout into a "use client" AppShell and use()-ing it: serialization of the promise across the RSC boundary, error handling if a query rejects, the NotificationsMenu currently seeds local state from props (useState(data.x)) — how does that interact with use(promise)?, Suspense fallback layout shift, hydration, the dev profile-switcher path.
3. **Cleanest implementation** — exact shape: what layout awaits vs streams, how AppShell receives + Suspends the inbox, how NotificationsMenu consumes a promise while keeping its optimistic local-list behaviour (it removes nudges/notes locally). Show the key code.
4. **The updateMyProfile round-trip cut** — safe or not given the defensive split? Better alternative?
5. **Single highest-leverage change to ship first** for the onboarding-feels-slow complaint specifically.

---
# SOURCE
${bundle}`;

const t0 = Date.now();
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AIventure Codex Shell-Stream Probe' },
  body: JSON.stringify({ model: process.env.OPENROUTER_MODEL_AUDIT || 'openai/gpt-5-codex', messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }], max_tokens: 18000 }),
});
if (!res.ok) { console.error(`API error ${res.status}: ${await res.text()}`); process.exit(1); }
const data = await res.json();
const report = data.choices?.[0]?.message?.content || '(no content)';
const u = data.usage || {};
const cost = ((u.prompt_tokens || 0) * 1.25 + (u.completion_tokens || 0) * 10) / 1e6;
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outPath = join(OUT_DIR, `shellstream-secondopinion-${stamp}.md`);
writeFileSync(outPath, `# Codex shell-stream pressure test — ${stamp}\n\nin ${u.prompt_tokens} / out ${u.completion_tokens} · ~$${cost.toFixed(2)} · ${secs}s\n\n---\n\n${report}`);
console.error(`Report: ${relative(ROOT, outPath)} · in ${u.prompt_tokens}/out ${u.completion_tokens} · ~$${cost.toFixed(2)} · ${secs}s`);
console.log('\n' + report);
