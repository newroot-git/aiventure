# Codex actions/latency second opinion — 2026-06-05

in 13786 / out 5535 · ~$0.07 · 51s

---

**1. Root cause? – AGREE, with nuances**

- The “dead press” and “full reload” sensation are driven by the shared `persist` helper (components/PlanView.tsx:118-133). It `await fetch("/api/plans/edit")` and **only then** calls `router.refresh()`, forcing two sequential network trips per click. `router.refresh()` invalidates the entire segment, so `getPlanBySlug()` and `getFriends()` re-run (app/(app)/p/[slug]/page.tsx:12-32). That’s effectively a soft page reload.
- The API routes only return `{ ok: true }` (app/api/plans/edit/route.ts:58, app/api/plans/status/route.ts:22), so the client has no fresh data and is forced to refresh.
- No optimistic/UI feedback for all the `persist`-based mutations (choose option, add slot, add date, etc.), so users wait through both round trips before seeing anything. That matches the complaint.

**2. Where Claude overstated / misstated**

- `move()` does show a spinner, not merely disable the button. The conditional `<Loader2 … />` is in the button body (components/PlanView.tsx:589-598). The UX is still slow, but the “no spinner” claim is wrong.
- `changeRsvp()` and the primary option vote path **do** perform optimistic updates before hitting the network (components/PlanView.tsx:168-176 and 137-147). The blanket “no optimistic state” assertion ignores those cases.
- Not “every mutation” calls `router.refresh()`: the general vote endpoint bypasses it; only the date-vote path does `.then(() => router.refresh())` (components/PlanView.tsx:180-188). The major buttons still do, but precision matters.

**3. What Claude missed**

- `getFriends()` re-runs on every `router.refresh()` even when the mutation has nothing to do with the friend list. That’s wasted DB work Claude didn’t mention (app/(app)/p/[slug]/page.tsx:22-27).
- The helpers fire POSTs with shared `setBusy` state; locking, completing, deleting, and inviting compete on the same `busy` flag (components/PlanView.tsx:87-94, 148-160, 245-258, 530-563). When two actions overlap, one can clear the spinner of another. Claude didn’t flag that coordination bug.
- Replacing API routes with server actions is not free: today’s client component consumes plain props. With server actions you still need to surface updated data — either via `revalidateTag` or by returning a payload and wiring client state. Claude glossed over the data-flow rewrite that implies.
- `router.refresh()` after `.catch(() => {})` in `voteDate` (components/PlanView.tsx:184-188) means even failed network responses trigger a refresh, compounding latency.

**4. Recommended fix (concrete)**

- Stop refreshing the whole route. Create server actions that both mutate and return the minimal plan diff; update local state immediately; revalidate narrowly when needed.

  a. Tag the plan query so you can revalidate without a full refresh:

  ```ts
  // lib/db.ts
  import { unstable_cache } from "next/cache";

  export const getPlanBySlug = unstable_cache(
    async (slug: string) => { /* existing query */ },
    (slug) => [`plan:${slug}`],
    { tags: (slug) => [`plan:${slug}`] }
  );
  ```

  b. Add targeted server actions:

  ```ts
  // app/(app)/p/[slug]/actions.ts
  "use server";

  import { revalidateTag } from "next/cache";
  import { updatePlanStatus, choosePlanOption /* … */ } from "@/lib/db";

  export async function chooseOptionAction(slug: string, optionId: string) {
    await choosePlanOption(slug, optionId);
    revalidateTag(`plan:${slug}`);
    return { optionId };
  }

  export async function updateStatusAction(slug: string, status: "open" | "locked" | "completed") {
    await updatePlanStatus(slug, status);
    revalidateTag(`plan:${slug}`);
    return { status };
  }
  ```

  c. Hold the relevant bits of plan state in the client and patch them optimistically:

  ```tsx
  // components/PlanView.tsx
  import { useOptimistic, useTransition } from "react";
  import { chooseOptionAction, updateStatusAction } from "@/app/(app)/p/[slug]/actions";

  const [optimisticPlan, applyOptimisticPlan] = useOptimistic(plan, (draft, action) => {
    if (action.type === "choose") {
      return { ...draft, options: draft.options.map(o =>
        o.id === action.optionId ? { ...o, chosen: true } : { ...o, chosen: false }
      ) };
    }
    if (action.type === "status") {
      return { ...draft, status: action.status };
    }
    return draft;
  });

  const [pending, startTransition] = useTransition();

  const choose = React.useCallback((id: string) => {
    applyOptimisticPlan({ type: "choose", optionId: id });
    startTransition(async () => {
      await chooseOptionAction(plan.slug, id);
    });
  }, [plan.slug]);

  async function move(status: "open" | "locked" | "completed") {
    applyOptimisticPlan({ type: "status", status });
    startTransition(async () => {
      await updateStatusAction(plan.slug, status);
    });
  }
  ```

  d. Since `revalidateTag` runs in the action, the next navigation back to this route will see fresh data, but the current view stays responsive without `router.refresh()`.

  e. For actions where optimistic data is harder (e.g. AI refinements), at least wrap the action in `startTransition` + per-slot `working` flags so the UI shows pending state while avoiding a full refresh.

- Phase out `/api/plans/*` for UI-driven mutations once the actions are in place. Keep the REST endpoints only for external calls (if needed).

**5. Highest-leverage change**

Replace `persist` (components/PlanView.tsx:118-133) with server-action wiring that eliminates `router.refresh()` and applies an optimistic patch. That single refactor rips out the double round-trip and the full tree re-render that currently makes every primary button feel dead.