import { AppShell } from "@/components/AppShell";
import { getInvites, getNudges, getNotifications, getCurrentProfile, getAllProfiles } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [invites, nudges, notifications, me, profiles] = await Promise.all([
    getInvites(), getNudges(), getNotifications(), getCurrentProfile(), getAllProfiles(),
  ]);
  return (
    <AppShell notifs={{ invites, nudges, notifications }} me={me} profiles={profiles}>
      {children}
    </AppShell>
  );
}
