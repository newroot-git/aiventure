import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { NotificationsMenuServer, NotificationsMenuFallback } from "@/components/NotificationsMenu.server";
import { NotificationsErrorBoundary } from "@/components/NotificationsErrorBoundary";
import { getCurrentProfile, getAllProfiles } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The shell only needs `me` (for the avatar/profile chip) — and `profiles` for the
  // dev switcher. The inbox queries (invites/nudges/notifications) are slow, so they
  // stream behind <Suspense> instead of blocking the shell + page skeleton on entry.
  const devSwitch = process.env.NEXT_PUBLIC_DEV_SWITCH === "1";
  const [me, profiles] = await Promise.all([
    getCurrentProfile(),
    devSwitch ? getAllProfiles() : Promise.resolve([]),
  ]);

  const slot = (variant: "icon" | "side") => (
    <NotificationsErrorBoundary key={variant}>
      <Suspense fallback={<NotificationsMenuFallback variant={variant} />}>
        <NotificationsMenuServer variant={variant} />
      </Suspense>
    </NotificationsErrorBoundary>
  );

  return (
    <AppShell me={me} profiles={profiles} notifications={{ side: slot("side"), icon: slot("icon") }}>
      {children}
    </AppShell>
  );
}
