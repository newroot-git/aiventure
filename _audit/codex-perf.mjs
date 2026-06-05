#!/usr/bin/env node
// Focused second opinion: perceived navigation lag in AIventure.
// Feeds Codex the nav/loading-relevant files + Claude's diagnosis, asks it to
// independently agree/disagree and add its own recommendations.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname);
const OUT_DIR = join(ROOT, '_audit');

function loadEnv() {
  const p = join(ROOT, '.env.local');
  const out = {};
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = loadEnv();
const KEY = process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY;
const MODEL_ID = process.env.OPENROUTER_MODEL_AUDIT || 'openai/gpt-5-codex';
if (!KEY) { console.error('Missing OPENROUTER_API_KEY'); process.exit(1); }

// nav/perf-relevant files only — keep it focused + cheap
const FILES = [
  'app/(app)/layout.tsx',
  'app/layout.tsx',
  'components/AppShell.tsx',
  'components/NotificationsMenu.tsx',
  'app/(app)/plans/page.tsx',
  'app/(app)/explore/page.tsx',
  'components/PlanView.tsx',
  'next.config.ts',
  'package.json',
];
let bundle = '';
for (const rel of FILES) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  const body = readFileSync(p, 'utf8');
  bundle += `\n\n===== FILE: ${rel} =====\n${body}`;
}

const CLAUDE_DIAGNOSIS = `
Claude's diagnosis (the thing to critique):

USER COMPLAINT: "General lag and slowness, things not loading. Click to a new page / process something, nothing happens, then suddenly the page switches. Stale, lifeless, clanky vibe."

Claude's root-cause claim:
- Every route is dynamic server-rendered (build shows all routes as ƒ Dynamic).
- There are ZERO loading.tsx files in the app, and almost no Suspense boundaries.
- In Next.js App Router, navigating to a dynamic route with no loading.tsx keeps the OLD page frozen on screen while the server runs the page's DB queries, then snaps to the new page — no spinner/skeleton. That matches the symptom exactly.
- No useTransition/isPending anywhere, so the ~12 router.push() actions (signin, create, vote, RSVP) also dead-click.
- (app)/layout.tsx does 4 awaited Supabase calls for the shell. currentUserId is React cache()-wrapped (request-dedup) already.

Claude's recommended fixes, ranked:
1. Add loading.tsx skeleton(s) per segment (or one (app)/loading.tsx) — biggest win.
2. Top progress bar (useLinkStatus / nprogress-style) for instant click feedback.
3. Wrap router.push actions in useTransition for pending spinners.
4. Stream the shell — Suspense-wrap inbox data so shell+page paint instantly.
5. Cache reads where safe (revalidate / unstable_cache) so not every route is fully dynamic.
6. Optimistic UI (useOptimistic) for votes/RSVP.
`;

const SYSTEM = `You are a Next.js 15/16 App Router performance expert giving an independent second opinion. Another AI (Claude) already diagnosed a perceived-navigation-lag problem in this app. Be adversarial and precise: say clearly where you AGREE, where you DISAGREE, what Claude got WRONG or MISSED, and what YOU would do differently. Cite file:line. No flattery, no filler. If Claude is basically right, say so plainly and just add what's missing.`;

const USER = `# AIventure — perceived navigation lag, second opinion

${CLAUDE_DIAGNOSIS}

Now here are the actual nav/perf-relevant source files. Independently assess the perceived-lag problem.

Answer in this structure:
1. **Verdict on Claude's root cause** — agree / partially / disagree, with reasoning.
2. **Anything Claude got wrong or overstated.**
3. **Anything Claude missed** (other causes of perceived lag: layout-level awaits blocking, large client bundles, waterfall queries, missing prefetch, Supabase round-trip count, hydration cost, etc).
4. **Your own ranked fix list** — what you'd actually do, highest-leverage first, with effort estimate. Note where you differ from Claude's ranking.
5. **One thing to do first** if you could only ship one change today.

Be concrete and opinionated.

---
# SOURCE
${bundle}`;

const t0 = Date.now();
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://aiventure-swart.vercel.app',
    'X-Title': 'AIventure Codex Perf Probe',
  },
  body: JSON.stringify({
    model: MODEL_ID,
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
    max_tokens: 16000,
  }),
});
if (!res.ok) { console.error(`API error ${res.status}: ${await res.text()}`); process.exit(1); }
const data = await res.json();
const report = data.choices?.[0]?.message?.content || '(no content)';
const u = data.usage || {};
const cost = ((u.prompt_tokens || 0) * 1.25 + (u.completion_tokens || 0) * 10) / 1e6;
const secs = ((Date.now() - t0) / 1000).toFixed(0);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outPath = join(OUT_DIR, `perf-secondopinion-${stamp}.md`);
writeFileSync(outPath, `# Codex perf second opinion — ${stamp}\n\nin ${u.prompt_tokens} / out ${u.completion_tokens} · ~$${cost.toFixed(2)} · ${secs}s\n\n---\n\n${report}`);
console.error(`Report: ${relative(ROOT, outPath)} · in ${u.prompt_tokens}/out ${u.completion_tokens} · ~$${cost.toFixed(2)} · ${secs}s`);
console.log('\n' + report);
