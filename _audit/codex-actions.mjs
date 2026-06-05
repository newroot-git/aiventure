#!/usr/bin/env node
// Second opinion: why do mutation buttons (lock-in, vote, rsvp) feel dead +
// cause a full-page-reload feel? Feeds Codex the real handlers + an API route.

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
  'components/PlanView.tsx',
  'app/api/plans/status/route.ts',
  'app/api/plans/edit/route.ts',
  'app/api/plans/vote/route.ts',
  'app/(app)/p/[slug]/page.tsx',
];
let bundle = '';
for (const rel of FILES) { const p = join(ROOT, rel); if (existsSync(p)) bundle += `\n\n===== FILE: ${rel} =====\n${readFileSync(p, 'utf8')}`; }

const HYPOTHESIS = `
USER COMPLAINT: "Lock-in and similar buttons still feel dead — press, nothing happens, then it takes effect. And it feels like a full page reload, and takes a long time. Why?"

Claude's hypothesis:
- Every mutation does fetch("/api/plans/...") and THEN router.refresh().
- The API routes return only { ok: true } (no updated data), so the client is forced to router.refresh() to see any change.
- router.refresh() re-fetches the ENTIRE route's server components (layout + page + all their Supabase queries), re-streams the RSC payload, re-reconciles — i.e. a soft full-page reload. That's the "reload feel" + slowness.
- So each click = TWO sequential server round-trips: (1) the mutation POST, (2) the full router.refresh re-render.
- persist() (the helper most buttons use) sets NO busy state and does NO optimistic update, so the UI doesn't change at all until both round-trips complete -> dead press.
- move() (lock-in) sets a busy flag but only disables the button (no spinner) and still eats the double round-trip.

Claude's proposed fix:
- Convert these to Server Actions invoked via useTransition (isPending drives the spinner), have them return the updated plan state, patch local React state instead of router.refresh() -> single round-trip, no full refetch.
- Add optimistic UI (useOptimistic / immediate local state) so the control updates instantly and reconciles on response.
`;

const SYSTEM = `You are a Next.js 16 / React 19 App Router expert giving an independent second opinion on a perceived-latency + "dead button" problem. Be adversarial and exact. State clearly where you AGREE / DISAGREE with Claude, what he got wrong or missed, and give your own concrete recommended fix with code-level specifics. Cite file:line. No filler.`;

const USER = `# AIventure — dead mutation buttons + full-reload feel, second opinion

${HYPOTHESIS}

Assess independently using the real source below. Answer:
1. Is Claude's root cause (router.refresh full refetch + no optimistic state + double round-trip) correct? Agree / partially / disagree, with reasoning + file:line.
2. Anything he got wrong or overstated.
3. Anything he missed (e.g. revalidatePath vs router.refresh cost, Server Action vs API-route tradeoffs, Supabase query count per refresh, where the real wall-clock time goes, waterfalls inside updatePlanStatus, etc).
4. Your concrete recommended fix — the actual pattern you'd use (Server Action + useOptimistic + useActionState? return-data-and-patch? revalidateTag?), with enough specificity to implement. Note where you differ from Claude.
5. The single highest-leverage change to ship first.

---
# SOURCE
${bundle}`;

const t0 = Date.now();
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AIventure Codex Actions Probe' },
  body: JSON.stringify({ model: process.env.OPENROUTER_MODEL_AUDIT || 'openai/gpt-5-codex', messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }], max_tokens: 16000 }),
});
if (!res.ok) { console.error(`API error ${res.status}: ${await res.text()}`); process.exit(1); }
const data = await res.json();
const report = data.choices?.[0]?.message?.content || '(no content)';
const u = data.usage || {};
const cost = ((u.prompt_tokens || 0) * 1.25 + (u.completion_tokens || 0) * 10) / 1e6;
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outPath = join(OUT_DIR, `actions-secondopinion-${stamp}.md`);
writeFileSync(outPath, `# Codex actions/latency second opinion — ${stamp}\n\nin ${u.prompt_tokens} / out ${u.completion_tokens} · ~$${cost.toFixed(2)} · ${secs}s\n\n---\n\n${report}`);
console.error(`Report: ${relative(ROOT, outPath)} · in ${u.prompt_tokens}/out ${u.completion_tokens} · ~$${cost.toFixed(2)} · ${secs}s`);
console.log('\n' + report);
