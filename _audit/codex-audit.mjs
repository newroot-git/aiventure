#!/usr/bin/env node
// Codex audit of AIventure — bundles source + concept docs, sends to gpt-5-codex
// via OpenRouter, writes a structured 6-goal audit report.
//
// Usage:  node _audit/codex-audit.mjs
// Requires OPENROUTER_API_KEY in .env.local (loaded below).

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname);
const OUT_DIR = join(ROOT, '_audit');
const MODEL = 'openai/gpt-5-codex'; // override-able via env below

// ---- load .env.local (key only, no deps) ----
function loadEnv() {
  const p = join(ROOT, '.env.local');
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = loadEnv();
const KEY = process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY;
const MODEL_ID = process.env.OPENROUTER_MODEL_AUDIT || MODEL;
if (!KEY) { console.error('Missing OPENROUTER_API_KEY'); process.exit(1); }

// ---- bundle source ----
const SRC_DIRS = ['app', 'components', 'lib'];
const ROOT_FILES = ['middleware.ts', 'next.config.ts', 'package.json', 'tsconfig.json'];
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css']);
const SKIP = new Set(['node_modules', '.next', '_audit', '.git']);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (EXTS.has(extname(name))) acc.push(full);
  }
  return acc;
}

let files = [];
for (const d of SRC_DIRS) { const p = join(ROOT, d); if (existsSync(p)) walk(p, files); }
for (const f of ROOT_FILES) { const p = join(ROOT, f); if (existsSync(p)) files.push(p); }

let bundle = '';
let totalChars = 0;
for (const f of files.sort()) {
  const rel = relative(ROOT, f);
  const body = readFileSync(f, 'utf8');
  bundle += `\n\n===== FILE: ${rel} (${body.split('\n').length} lines) =====\n${body}`;
  totalChars += body.length;
}

// ---- concept docs ----
function tryRead(p) { const f = join(ROOT, p); return existsSync(f) ? readFileSync(f, 'utf8') : ''; }
const concept = [
  ['INTENT.md', tryRead('INTENT.md')],
  ['DESIGN.md', tryRead('DESIGN.md')],
  ['PICKUP.md', tryRead('PICKUP.md')],
].filter(([, v]) => v).map(([k, v]) => `===== ${k} =====\n${v}`).join('\n\n');

console.error(`Bundled ${files.length} files, ${(totalChars / 1000).toFixed(0)}k chars (~${Math.round(totalChars / 4 / 1000)}k tokens). Model: ${MODEL_ID}`);

// ---- prompt ----
const SYSTEM = `You are a principal engineer + product strategist doing an independent, adversarial audit of a Next.js app called AIventure. You are a SECOND opinion — another AI already built this, so be skeptical and specific, not flattering. Find real problems. Cite file:line. No vague platitudes. Every finding must be actionable.`;

const USER = `# AIventure — full audit

Below is the concept (what we're trying to build) followed by the complete source bundle.

Produce a structured markdown report covering these 6 goals. For each finding give: severity (critical/high/med/low), file:line, the problem, and a concrete fix. Be concise — fragments fine, no filler.

## 1. Code quality & efficiency
Dead code, duplication, bad patterns, type holes, error handling gaps, leaky abstractions, anything a senior would flag in review.

## 2. Bugs
Real defects — race conditions, auth/permission holes, unhandled states, broken edge cases, data-integrity risks. Prioritise security/perms (this app has an owner/participant permission model — scrutinise it).

## 3. What could be done better
Architecture, data model, API design, state management. Where is the design fighting itself?

## 4. Lag, speed, optimization
Render perf, unnecessary re-renders, N+1 queries, oversized payloads, missing caching/memoization, bundle bloat, slow API routes.

## 5. UI improvement potential
Where the UX is weak, confusing, or unpolished. Concrete improvements tied to the concept.

## 6. Concept & product direction
Does the app actually do what it's trying to do? What's missing? What else could it do? Are there fundamentally better ways to architect the core experience? Where is it wasteful (effort, compute, API spend, scope)? Be opinionated.

End with a prioritised TOP 10 ACTION LIST (highest-leverage fixes first).

---

# CONCEPT DOCS

${concept}

---

# SOURCE BUNDLE

${bundle}`;

// ---- call ----
const t0 = Date.now();
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://aiventure-swart.vercel.app',
    'X-Title': 'AIventure Codex Audit',
  },
  body: JSON.stringify({
    model: MODEL_ID,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: USER },
    ],
    max_tokens: 32000,
  }),
});

if (!res.ok) {
  console.error(`API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const data = await res.json();
const report = data.choices?.[0]?.message?.content || '(no content)';
const usage = data.usage || {};
const cost = ((usage.prompt_tokens || 0) * 1.25 + (usage.completion_tokens || 0) * 10) / 1e6;
const secs = ((Date.now() - t0) / 1000).toFixed(0);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outPath = join(OUT_DIR, `report-${stamp}.md`);
const header = `# AIventure Codex Audit — ${stamp}\n\nModel: \`${MODEL_ID}\` · ${files.length} files · in ${usage.prompt_tokens || '?'} / out ${usage.completion_tokens || '?'} tokens · ~$${cost.toFixed(2)} · ${secs}s\n\n---\n\n`;
writeFileSync(outPath, header + report);

console.error(`\nDone. Report: ${relative(ROOT, outPath)}`);
console.error(`Tokens: in ${usage.prompt_tokens} / out ${usage.completion_tokens} · Cost ~$${cost.toFixed(2)} · ${secs}s`);
