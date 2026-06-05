#!/usr/bin/env node
// Pressure-test a proposed architecture change: local-first draft editing for plans,
// persist on commit (lock-in) / exit, instead of per-action fetch + router.refresh.

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
  'app/(app)/p/[slug]/page.tsx',
  'app/api/plans/edit/route.ts',
  'app/api/plans/status/route.ts',
];
let bundle = '';
for (const rel of FILES) { const p = join(ROOT, rel); if (existsSync(p)) bundle += `\n\n===== FILE: ${rel} =====\n${readFileSync(p, 'utf8')}`; }
// db.ts is big — include only the mutation surface signatures for context
const dbPath = join(ROOT, 'lib/db.ts');
if (existsSync(dbPath)) {
  const sigs = readFileSync(dbPath, 'utf8').split('\n').filter((l) => /export (async function|const) \w+|^async function (writeMeta|materializ|notify)/.test(l)).join('\n');
  bundle += `\n\n===== lib/db.ts (exported mutation/read signatures only) =====\n${sigs}`;
}

const CONTEXT = `
MEASURED (live, clicking RSVP "Maybe" once on a plan page):
- POST /api/plans/edit (the mutation) = 1135ms, then router.refresh() RSC refetch of the plan route = 307ms on top. A second edit = 1223ms. So each micro-action ≈ 1.2s server write + ~0.3s full-tree refetch before the UI settles. (An AI refine was 8705ms — inherently slow, separate concern.)
- Cause: every handler does fetch("/api/plans/*") then router.refresh(); the API routes return only { ok: true } so the client is forced to refresh; router.refresh() re-runs the ENTIRE route's server components + Supabase queries.

PROPOSED CHANGE (founder's idea + Claude's hybrid):
Local-first draft editing for the plan editor. Goal: editing feels instant; real saves/loads only happen at deliberate moments.
1. PlanView holds the whole plan in client state. Owner edits (choose option, add/delete step, dates, recurrence, title, location) mutate LOCAL state only — instant, no network, no router.refresh.
2. Background debounced autosave (~2s idle, fire-and-forget, no router.refresh, no UI block) so nothing is lost.
3. One genuine save + reload on "Lock it in" (deliberate commit; a load is acceptable there).
4. On page leave: navigator.sendBeacon flushes pending edits.
5. Remove router.refresh() from the edit path entirely.
6. CAVEAT (collaborative app): plans are shared via link — multiple people RSVP/vote. So RSVP/vote signals from PARTICIPANTS must persist IMMEDIATELY (optimistic, no refresh) so the crew sees them; only the OWNER's structural edits get the draft/batch treatment.
`;

const SYSTEM = `You are a senior Next.js 16 / React 19 architect. Adversarially pressure-test the proposed "local-first draft editing" change for this plan editor. Be concrete and skeptical. Your job: find what breaks, what's underspecified, and the cleanest correct implementation. Cite file:line where relevant. No filler, no cheerleading.`;

const USER = `# Pressure-test: local-first draft editing for AIventure plans

${CONTEXT}

Answer:
1. **Is this the right approach** vs the alternative (keep per-action saves but make them optimistic + revalidateTag instead of router.refresh)? When does local-first win, when does it lose?
2. **What breaks / edge cases** — concurrency between owner draft-save and participant immediate writes clobbering each other; sendBeacon reliability + auth (guest av_uid cookie) on unload; lock-in that MATERIALIZES recurrence (writeMeta / series) needing server truth; the meta read-modify-write race already in writeMeta; AI refine/add-option which generate server-side data the client can't fake; partial-save / offline / crash data loss; stale draft overwriting newer server state on return.
3. **Cleanest implementation** — exact state model (what lives in client draft vs server), where the draft persists (memory / localStorage / debounced endpoint), how a single batched save endpoint should be shaped, how to reconcile on lock-in, how to keep participant RSVP/vote immediate while owner structure is drafted. Give the concrete pattern.
4. **What to ship first** — the smallest change that kills most of the 1.2s-per-click lag without the full rewrite.
5. **Any reason NOT to do this** / a simpler higher-leverage alternative.

---
# SOURCE
${bundle}`;

const t0 = Date.now();
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AIventure Codex Draft-Model Probe' },
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
const outPath = join(OUT_DIR, `draftmodel-secondopinion-${stamp}.md`);
writeFileSync(outPath, `# Codex draft-model pressure test — ${stamp}\n\nin ${u.prompt_tokens} / out ${u.completion_tokens} · ~$${cost.toFixed(2)} · ${secs}s\n\n---\n\n${report}`);
console.error(`Report: ${relative(ROOT, outPath)} · in ${u.prompt_tokens}/out ${u.completion_tokens} · ~$${cost.toFixed(2)} · ${secs}s`);
console.log('\n' + report);
