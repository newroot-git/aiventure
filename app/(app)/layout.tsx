import { AppShell } from "@/components/AppShell";
import { getInvites, getNudges, getNotifications, getCurrentProfile, getAllProfiles } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Profiles power only the dev profile-switcher. Fetching them for every user
  // shipped all names/emails/notes into the client payload (PII leak) and added a
  // round trip per navigation. Only load when the dev switch is actually on.
  const devSwitch = process.env.NEXT_PUBLIC_DEV_SWITCH === "1";
  const [invites, nudges, notifications, me, profiles] = await Promise.all([
    getInvites(), getNudges(), getNotifications(), getCurrentProfile(),
    devSwitch ? getAllProfiles() : Promise.resolve([]),
  ]);
  return (
    <AppShell notifs={{ invites, nudges, notifications }} me={me} profiles={profiles}>
      {children}
    </AppShell>
  );
}
