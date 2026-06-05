# Codex perf second opinion — 2026-06-05

in 19182 / out 7257 · ~$0.10 · 66s

---

1. **Verdict on Claude’s root cause — partially agree.**  
   He’s right that the lack of `loading.tsx` or Suspense is why the UI looks “stuck,” but it’s only half the story. Every in-app navigation has to wait for the blocking Supabase bundle in `app/(app)/layout.tsx` before anything new can render (`Promise.all` of invites, nudges, notifications, profile; app/(app)/layout.tsx:10‑21). On top of that, the pages themselves pull more Supabase data (e.g. plans page, app/(app)/plans/page.tsx:9‑16). So the user isn’t just missing a spinner—they’re sitting through real server latency twice per click. Skeletons will hide the freeze, but the layout-level fetch waterfall is the actual source of the lag.

2. **Where Claude overstated or was off.**
   - The “dead-click router.push” claim doesn’t hold up. Critical mutations already show pending state (e.g. plan status buttons toggle `busy` and swap in `<Loader2>` while awaiting the POST; components/PlanView.tsx:273‑307. Nudge accept/decline also flips a spinner; components/NotificationsMenu.tsx:40‑88). Adding `useTransition` would be nice-to-have polish, not a root fix.
   - “currentUserId is cache()-wrapped” isn’t in the code provided; the layout simply awaits Supabase calls directly (app/(app)/layout.tsx:10‑21).  
   - “Every route is dynamic” might be true in practice, but it’s inferred—not demonstrated. The big regression here is specifically the `(app)` layout becoming dynamic because of those Supabase calls, not necessarily every single route.

3. **What Claude missed.**
   - **Duplicate queries per navigation.** The layout fetches invites/nudges/notifications, and the plans page fetches the same data again for its inbox cards (`getInvites()`/`getNudges()` in both places; app/(app)/layout.tsx:10‑18 vs. app/(app)/plans/page.tsx:10‑14). That doubles the Supabase round-trips on the slowest page.
   - **Client-only shell blocks streaming.** `AppShell` is a `use client` component (components/AppShell.tsx:1), so the server has to finish all layout queries before it can even hydrate the static chrome. You can’t stream the shell or show partial content until those promises resolve.
   - **Plan page hydration weight.** `PlanView` (components/PlanView.tsx) is an enormous client component that re-renders the whole plan after every `router.refresh()` call (`persist` helper sets busy flag then refreshes the entire route; components/PlanView.tsx:204‑229). That means expensive hydration and data refetch for small edits, adding to the sluggish feel after actions complete.

4. **My ranked fix list (biggest leverage first).**
   1. **Stop blocking the shared layout on Supabase.** Move the notifications/invite queries behind Suspense inside the shell, or fetch them client-side after the shell renders. That lets navigation stream immediately and removes the current hard wait. Effort: Medium. (Claude had this buried in his #4 “stream the shell”—I’d treat it as the top priority.)  
   2. **Add a segment-level `loading.tsx` for `(app)`** so route transitions at least show a new frame while data flows. Effort: Extra small. (Same as Claude’s #1, just second after removing the server bottleneck.)  
   3. **Deduplicate inbox data.** Cache `getInvites`/`getNudges` with `cache()` or lift the results from the layout into the plans page so they’re fetched once per navigation. Effort: Small.  
   4. **Split `PlanView` into lighter client islands.** Keep read-only sections server-rendered, defer the heavy interactive editors behind Suspense so hydration doesn’t drag after navigation. Effort: Large. (Claude didn’t mention this.)  
   5. **Add a top-level progress indicator (`useLinkStatus`/nprogress).** Pure perception boost once the bigger blockers are addressed. Effort: Small.

5. **One thing to ship today.** Drop an `(app)/loading.tsx` that mirrors the shell chrome and shows a skeleton for the page body. It’s a fast change that immediately fixes the “I clicked but nothing happened” complaint while you untangle the layout fetch bottleneck.