import { AppShell } from "@/components/AppShell";
import { getInvites, getNudges, getNotifications } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [invites, nudges, notifications] = await Promise.all([
    getInvites(), getNudges(), getNotifications(),
  ]);
  return <AppShell notifs={{ invites, nudges, notifications }}>{children}</AppShell>;
}
