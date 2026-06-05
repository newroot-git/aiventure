import { Inbox } from "lucide-react";
import { getInvites, getNudges, getNotifications } from "@/lib/db";
import { NotificationsMenu } from "./NotificationsMenu";

// Server wrapper: awaits the inbox data on its own, so wrapping THIS in <Suspense>
// in the layout lets the app shell + page skeleton paint immediately while the
// (slow) inbox queries stream in behind the fallback. The client NotificationsMenu
// still receives fully-resolved data, so its optimistic local-list behaviour is intact.
export async function NotificationsMenuServer({ variant }: { variant: "icon" | "side" }) {
  const [invites, nudges, notifications] = await Promise.all([
    getInvites(), getNudges(), getNotifications(),
  ]);
  return <NotificationsMenu variant={variant} data={{ invites, nudges, notifications }} />;
}

// Same footprint as the real control (badge-less) so nothing shifts when it streams in.
export function NotificationsMenuFallback({ variant }: { variant: "icon" | "side" }) {
  if (variant === "side") {
    return (
      <div className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-bold text-ink">
        <Inbox size={20} /> Notifications
      </div>
    );
  }
  return (
    <div className="grid h-9 w-9 place-items-center" aria-hidden="true">
      <Inbox size={22} className="text-ink" />
    </div>
  );
}
