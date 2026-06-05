# Codex draft-model pressure test — 2026-06-05

in 14587 / out 3558 · ~$0.05 · 27s

---

### 1. Local-first vs optimistic server writes

- **What problem we’re solving:** the `persist` helper (PlanView.tsx:~178-207) does a POST and then unconditional `router.refresh()`, which re-runs the whole RSC tree (PlanPage.tsx:~9-37) and all Supabase queries. That’s the 1.2 s + 0.3 s you measured. Killing `router.refresh()` is the real win.
- **Local-first (draft) wins** when the owner is the only person mutating structural fields, edits are multi-step, and we can tolerate occasional merge prompts. It lets the UI feel instant and batches writes. But it introduces a second source of truth and needs heavy reconciliation logic.
- **Optimistic per-action + targeted invalidation** wins when we can cheaply compute the new state from the server response. Here every API already knows what changed; we’re just throwing the result away. Teach the API routes to return the mutated payload and update client state without refreshing. That’s a smaller change with far fewer concurrency traps. Revalidate tags or mutate caches only when needed.
- Given current scope, local-first is a large rewrite with nasty edge cases (below). Start by eliminating `router.refresh()`; evaluate if latency is still a problem before adding draft caching.

### 2. Edge cases / what breaks

1. **Owner autosaves vs participant live writes.** Owner’s draft holding the whole plan collides with participant RSVPs/votes that still go straight to `/api/plans/edit` (`changeRsvp` PlanView.tsx:~235-252, `vote` PlanView.tsx:~218-234). If the owner later flushes “plan draft”, that payload must not overwrite participant counts, RSVP lists, etc. Without field-level diffing you’ll stomp them.
2. **Versioning / stale drafts.** Owner leaves a tab open with a draft, someone else (co-owner?) or the AI bot mutates server state, owner comes back and autosave pushes stale content, overwriting newer data. Need an `updated_at` or `meta_version` check in the batch endpoint. `/lib/db.writeMeta` already has race issues; layering local caching on top makes it worse.
3. **AI actions** (`/api/plans/refine`, `/api/plans/add-option`, PlanView.tsx:~260-321) produce server-side content (LLM + Supabase stored options). Local draft can’t spoof those results; you must wait for server completion. If your in-memory plan is the source of truth, you need to merge in the returned options. Existing handlers assume a full page refresh to pick them up.
4. **Series materialisation.** `move("locked")` (PlanView.tsx:~340-371) hits `/api/plans/status`. That triggers `materializeSeries` server-side. Owner’s local draft has to be flushed *before* that call, otherwise the series locks on stale data. Same for `toggleRecurring` (PlanView.tsx:~305-332) which is a read-modify-write of recurrence metadata.
5. **SendBeacon on unload.** `navigator.sendBeacon` can’t set custom headers; you’ll need to send a Blob with `type: "application/json"` and rely on cookie auth. It only fires on `beforeunload`; client-side route transitions inside Next.js often skip the unload path. You’ll need `router.events`/`useRouter` `onBeforeUnload` shims, and mobile Safari throttles background beacons.
6. **Offline / crash recovery.** If the autosave fails (network offline) you have to queue retries. Otherwise “local-first” gives a false sense of safety. Also need persistence (IndexedDB/localStorage) for real crash recovery; memory-only state loses data if the tab reloads.
7. **Partial saves.** What shape is the draft? If you only mutate part of the plan, the autosave still has to send enough context to keep the server consistent. Today each API endpoint enforces its own constraints; a batch endpoint must reimplement all of that logic or call the same service functions.
8. **Multi-tab owners.** Two owner tabs with local drafts race each other. Need per-draft session IDs and conflict resolution UI.

### 3. Clean implementation outline (if we still pursue local-first)

**State model**

- Split plan state into:
  - `serverPlan` (last good payload from server).
  - `draftPlan` (owner-only mutable copy).
  - `pendingOps` (array of actions to save).
- Store version: `serverVersion = plan.updated_at` (add to `getPlanBySlug` result).
- Owner edits mutate `draftPlan` + push semantic ops (`{type: "setTitle", value}` etc.).
- Participants use existing handlers (`vote`, `rsvp`) but update local state optimistically from server response (see below). Their actions should patch both `serverPlan` and `draftPlan` if the owner view is open, otherwise counts drift.

**Persistence**

- Autosave hook debounces `pendingOps`. When triggered:
  1. POST to new endpoint `/api/plans/batch` with `{ slug, sinceVersion, ops: [...] }`.
  2. Server runs each op via existing service functions (`setPlanTitle`, `addSlot`, etc.) inside a transaction and returns `{ ok, newVersion, patch }`.
  3. Client reconciles: apply returned `patch` to both `serverPlan` and `draftPlan`, clear `pendingOps`, bump version.
- If server responds `409 version_conflict`, fetch latest plan and merge (or prompt user).

**Lock in**

- `Lock it in` button:
  1. Await current autosave (`await flushPendingOps()`).
  2. Call `/api/plans/status` as today. Consider returning updated plan state to avoid refresh.

**AI actions**

- Keep them server-first. After `/api/plans/refine`, expect JSON payload containing the new/updated options. Merge into `serverPlan` and `draftPlan`. No `router.refresh`.

**Beacon**

- On unload/navigate, attempt `flushPendingOps({ mode: "beacon" })`. Send `Blob([JSON.stringify(payload)], { type: "application/json" })`. Also call `flushPendingOps` in a `visibilitychange` handler because tab switches often kill pending timers.

**Participant immediacy**

- Convert `/api/plans/vote` and `/api/plans/edit` (RSVP case) to return the new vote totals / RSVP list. Update local state immediately; no refresh. Owner’s `draftPlan` should subscribe to those updates via context or event emitter so it doesn’t drift.

Without these pieces you’ll end up with stale overwrites or phantom data.

### 4. Minimal fix to ship first (kill the 1.2 s lag)

1. **Stop calling `router.refresh()`** in PlanView (`persist`, `voteDate`, AI handlers…). Instead have each API return the data it already knows.
   - Example: modify `/api/plans/edit` (route.ts:~11-64) so each branch returns `{ ok, planPatch }`. For `title`, return `{ plan: { title } }`; for `choose`, return updated slot data.
   - In PlanView, replace `persist` with local state updates:
     ```tsx
     const [planState, setPlanState] = useImmer(initialPlan);
     const persist = useCallback(async (action, payload, apply) => {
       const res = await fetch("/api/plans/edit", { ... });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error);
       apply(planDraft => Object.assign(planDraft, data.planPatch));
     }, []);
     ```
     (PlanView already keeps a lot of UI state; adding Immer or equivalent isolates diff application.)
2. For high-latency AI endpoints, return the generated options directly (`/api/plans/refine`, `/api/plans/add-option`) so we can append them without a refresh.
3. If you need cache invalidation for other users, call `revalidateTag("plan:"+slug)` server-side after the mutation. That keeps other clients honest without blocking the originator.
4. Only consider local-first drafts if post-optimism latency is still unacceptable.

This change touches a handful of API routes and replaces `router.refresh()` calls with local state updates; it avoids rewriting the entire editor.

### 5. Reasons to avoid full local-first right now / simpler alternatives

- **Complexity spike.** You’ll rebuild a mini-sync engine (versioning, conflict detection, offline queue) for one page. The existing API surface is already fragmented (`choose`, `slotTime`, `addSlot`, etc.); batching them client-side doesn’t reduce server load much because each op still needs dedicated business logic.
- **Risk to data integrity.** Today every action hits the DB immediately, so conflicts are limited to races inside the stored procedures. Local-first makes conflicts the happy path; you need UX for “Your draft conflicts with a newer edit.”
- **No observed need yet.** If returning the updated payload and skipping `router.refresh()` brings latency under ~150 ms, the user experience is already “instant enough” without the maintenance burden.
- **Better caching primitives exist.** Use Route Handlers with `revalidatePath`/`revalidateTag` or move mutations into Server Actions that return the new plan state. That keeps a single source of truth and leverages Next infra instead of re-inventing it.

**Recommendation:** First, refactor the mutation handlers to be optimistic and remove `router.refresh()`. Measure again. Only invest in local-first draft state if hard data shows that’s insufficient.