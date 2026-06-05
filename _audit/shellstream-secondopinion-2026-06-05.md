# Codex shell-stream pressure test — 2026-06-05

in 10512 / out 10847 · ~$0.12 · 73s

---

**Position:** Disagree. The idea of “pass an un-awaited promise from `app/(app)/layout.tsx` into the client `AppShell` and call `use(promise)`” cannot work — Next will eagerly resolve/serialize anything sent to a client boundary, so the layout still stalls (`app/(app)/layout.tsx:13-21`). You do get the benefit if you move the inbox fetch behind a server-side `<Suspense>` boundary.

---

### 1. Impact ranking for onboarding entry speed (largest win first)

| Rank | Change | Why (baseline timings) |
| ---- | ------ | ---------------------- |
| ① | **Collapse the sequential Supabase round-trips in `updateMyProfile`** | `POST /api/me` is ~1 s, of which ~960 ms is app time because we pay for three back-to-back RPCs (`lib/db.ts:updateMyProfile`, sequential calls to `currentUserId` + two `update`s). Cutting to one `update` + keeping the cached `currentUserId` knocks ~600–700 ms off the first leg, instantly halves perceived latency. |
| ② | **Parallelise / denormalise the `/plans` data path** | `GET /plans` spends ~940 ms server-side (`app/(app)/plans/page.tsx:6-27`); `getUserPlans` chains 3–4 queries serially. Either parallelise the joins or expose a single Supabase function. That removes the second 1 s chunk after onboarding. |
| ③ | **Stream the app chrome (with a server Suspense boundary) so the shell + loading UI render immediately** | Today the layout blocks on invites/nudges/notifications/profile (`app/(app)/layout.tsx:13-21`), so users stare at a blank viewport while the above slow queries run. Moving only the inbox behind Suspense lets the skeleton render fast, but it doesn’t fix the two 1 s backend costs above — it just masks them. |
| ④ | Opportunistic nav (`router.push` immediately, optimistic cache) | Useful polish once the backend work above lands; without backend speedups you still wait on the real data before anything useful renders. |
| ⑤ | Edge colocation / caching | Helps if Supabase stays in one region and users elsewhere, but the dominant cost is query count / sequencing, not network hops. |

---

### 2. Gotchas with “stream the shell” as described

1. **Promise serialization:** Client components can’t receive raw promises. Next will await them before streaming because props must be JSON-serialisable. The layout therefore blocks exactly as it does today if you try to hand `notifsPromise` to `AppShell` (`app/(app)/layout.tsx:14-20`).  
2. **`NotificationsMenu` state bootstrapping:** It seeds local state once from `data` (`components/NotificationsMenu.tsx:30-45`). If you wrap the menu in `Suspense`, that initial render now happens when the promise resolves, so local optimistic clears still work. But if you attempted to `use(promise)` inside the component, the first render would suspend and you’d never hit the `useState` initialiser — you must feed it concrete data from a server component.  
3. **Errors bubbling:** A rejected fetch will now skip straight to the nearest error boundary, which is currently the root error page. You need an explicit error boundary around the inbox slot so a failed fetch shows a toast / badge error instead of nuking the shell.  
4. **Fallback layout shift:** Both desktop (`variant="side"`) and mobile badge (`variant="icon"`) need placeholders with identical box dimensions or the header/sidebar will jump when the real menu streams in.  
5. **DEV profile switcher:** Profiles are still loaded in the layout (`process.env.NEXT_PUBLIC_DEV_SWITCH` guard, `app/(app)/layout.tsx:11-22`). Don’t move them behind Suspense or you’ll hide the switcher until data arrives.  
6. **Hydration:** Because `AppShell` remains client-rendered, its markup must be deterministic on the first pass. Slotting in `<Suspense fallback={…}>` is safe; trying to conditionally add/remove nav elements after hydration will produce warnings.

---

### 3. Clean implementation (server Suspense boundary + shared fetcher)

**a. Add a server wrapper for the inbox**

```tsx
// components/NotificationsMenu.server.tsx
import { cache } from "react";
import { getInvites, getNudges, getNotifications } from "@/lib/db";
import { NotificationsMenu } from "./NotificationsMenu";

const loadInbox = cache(async () => {
  const [invites, nudges, notifications] = await Promise.all([
    getInvites(),
    getNudges(),
    getNotifications(),
  ]);
  return { invites, nudges, notifications };
});

export async function NotificationsMenuServer({ variant }: { variant: "icon" | "side" }) {
  const data = await loadInbox();
  return <NotificationsMenu variant={variant} data={data} />;
}

export function NotificationsMenuFallback({ variant }: { variant: "icon" | "side" }) {
  if (variant === "side") {
    return (
      <div className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-bold text-muted">
        <span className="relative"><span className="h-5 w-5 animate-pulse rounded-full bg-surface-3" /></span>
        Notifications
      </div>
    );
  }
  return (
    <button aria-label="Notifications" className="relative grid h-9 w-9 place-items-center">
      <span className="h-5 w-5 animate-pulse rounded-full bg-surface-3" />
    </button>
  );
}
```

**b. Update the layout to stop awaiting the inbox**

```diff
// app/(app)/layout.tsx
-import { AppShell } from "@/components/AppShell";
-import { getInvites, getNudges, getNotifications, getCurrentProfile, getAllProfiles } from "@/lib/db";
+import { Suspense } from "react";
+import { AppShell } from "@/components/AppShell";
+import { NotificationsMenuServer, NotificationsMenuFallback } from "@/components/NotificationsMenu.server";
+import { getCurrentProfile, getAllProfiles } from "@/lib/db";

 export default async function AppLayout({ children }: { children: React.ReactNode; }) {
   const devSwitch = process.env.NEXT_PUBLIC_DEV_SWITCH === "1";
-  const [invites, nudges, notifications, me, profiles] = await Promise.all([
-    getInvites(), getNudges(), getNotifications(), getCurrentProfile(),
-    devSwitch ? getAllProfiles() : Promise.resolve([]),
-  ]);
+  const [me, profiles] = await Promise.all([
+    getCurrentProfile(),
+    devSwitch ? getAllProfiles() : Promise.resolve([]),
+  ]);

   return (
-    <AppShell notifs={{ invites, nudges, notifications }} me={me} profiles={profiles}>
+    <AppShell
+      me={me}
+      profiles={profiles}
+      notifications={{
+        side: (
+          <NotificationsErrorBoundary>
+            <Suspense fallback={<NotificationsMenuFallback variant="side" />}>
+              <NotificationsMenuServer variant="side" />
+            </Suspense>
+          </NotificationsErrorBoundary>
+        ),
+        icon: (
+          <NotificationsErrorBoundary>
+            <Suspense fallback={<NotificationsMenuFallback variant="icon" />}>
+              <NotificationsMenuServer variant="icon" />
+            </Suspense>
+          </NotificationsErrorBoundary>
+        ),
+      }}
+    >
       {children}
     </AppShell>
   );
 }
```

`NotificationsErrorBoundary` is a tiny client class component to localise failures:

```tsx
// components/NotificationsErrorBoundary.tsx
"use client";
import * as React from "react";

export function NotificationsErrorBoundary({ children }: { children: React.ReactNode }) {
  return <Boundary>{children}</Boundary>;
}

class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <button className="relative grid h-9 w-9 place-items-center text-destructive" aria-label="Notifications unavailable">
          !
        </button>
      );
    }
    return this.props.children;
  }
}
```

**c. Teach `AppShell` to accept the streamed slots**

```diff
// components/AppShell.tsx
-export function AppShell({ children, notifs, me, profiles = [] }: {
-  children: React.ReactNode; notifs: NotifData; me?: Profile | null; profiles?: Profile[];
+export function AppShell({ children, me, profiles = [], notifications }: {
+  children: React.ReactNode;
+  me?: Profile | null;
+  profiles?: Profile[];
+  notifications: { side: React.ReactNode; icon: React.ReactNode; };
 }) {
   ...
-          <NotificationsMenu variant="side" data={notifs} />
+          {notifications.side}
   ...
-              <NotificationsMenu variant="icon" data={notifs} />
+              {notifications.icon}
```

The rest of `NotificationsMenu.tsx` remains unchanged; it still receives fully-hydrated data once the Suspense boundary resolves, so the optimistic local mutations continue to work.

---

### 4. `updateMyProfile` round-trip reduction

Safe to merge into one update once we confirm `home_area` exists everywhere. Instead of doing two `.update()` calls, build a single partial object:

```ts
export async function updateMyProfile(patch: { name?: string; interests?: string[]; interest_notes?: string; home_area?: string }) {
  const me = await currentUserId();
  if (!me) return;
  const db = supabaseAdmin();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.interests !== undefined) update.interests = patch.interests;
  if (patch.interest_notes !== undefined) update.interest_notes = patch.interest_notes;
  if (patch.home_area !== undefined) update.home_area = patch.home_area;
  if (Object.keys(update).length === 0) return;
  await db.from("profiles").update(update).eq("id", me);
}
```

If the defensive split is still required for unmigrated rows, gate the new property by checking `hasColumn('profiles', 'home_area')` once at boot, cache the result, and conditionally include the key instead of issuing a second update.

---

### 5. Highest-leverage fix for “onboarding feels slow”

**Ship the single write-path consolidation first.** Bringing `POST /api/me` down from ~1 s to sub-300 ms removes the dead-air spinner that users notice most (they’re staring at a submit button). The shell streaming work smooths the transition, but the user still waits if the write stays slow.

---