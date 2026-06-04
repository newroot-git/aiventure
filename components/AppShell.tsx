"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, CalendarDays, Compass, ChevronsUpDown } from "lucide-react";
import { Avatar } from "./ui";
import { QuickMenu } from "./QuickMenu";
import { NotificationsMenu, type NotifData } from "./NotificationsMenu";
import { CURRENT_USER } from "@/lib/mock";
import type { Profile } from "@/lib/types";

const TABS = [
  { href: "/plans", label: "Home", Icon: Home },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/groups", label: "Crew", Icon: Users },
];

export function AppShell({
  children, notifs, me, profiles = [],
}: {
  children: React.ReactNode; notifs: NotifData; me?: Profile | null; profiles?: Profile[];
}) {
  const path = usePathname();
  const isActive = (href: string) => path.startsWith(href);
  const user = me ?? CURRENT_USER;

  return (
    <div className="min-h-dvh">
      {/* ---- desktop sidebar ---- */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r-2 border-line bg-surface/50 px-4 py-6 md:flex">
        <Link href="/plans" className="px-2 font-display text-2xl font-bold tracking-tight">
          AI<span className="text-primary">venture</span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {TABS.map((t) => (
            <SideLink key={t.href} {...t} active={isActive(t.href)} />
          ))}
        </nav>
        <div className="mt-4">
          <QuickMenu variant="side" />
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t-2 border-line pt-4">
          <NotificationsMenu variant="side" data={notifs} />
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-md px-3 py-2 transition ${
              isActive("/profile") ? "bg-primary-soft" : "hover:bg-surface-2"
            }`}
          >
            <Avatar name={user.name} src={user.avatar} size={30} />
            <span className="text-[15px] font-bold">{user.name}</span>
          </Link>
          {profiles.length > 1 && <ProfileSwitcher me={user} profiles={profiles} />}
        </div>
      </aside>

      {/* ---- main column ---- */}
      <div className="flex min-h-dvh flex-col md:pl-60">
        {/* mobile top bar */}
        <header className="sticky top-0 z-10 border-b-2 border-line bg-bg/90 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-5 py-3">
            <Link href="/plans" className="font-display text-xl font-bold tracking-tight">
              AI<span className="text-primary">venture</span>
            </Link>
            <div className="flex items-center gap-3">
              {profiles.length > 1 && <ProfileSwitcher me={user} profiles={profiles} compact />}
              <NotificationsMenu variant="icon" data={notifs} />
              <Link href="/profile" aria-label="Profile">
                <Avatar name={user.name} src={user.avatar} size={32} />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-28 pt-4 md:max-w-4xl md:px-8 md:pb-12 md:pt-10">
          {children}
        </main>

        {/* mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-surface/95 backdrop-blur md:hidden">
          <div className="mx-auto grid w-full max-w-lg grid-cols-5 items-center px-3 py-2">
            {TABS.slice(0, 2).map((t) => (
              <NavItem key={t.href} {...t} active={isActive(t.href)} />
            ))}
            <QuickMenu variant="fab" />
            {TABS.slice(2).map((t) => (
              <NavItem key={t.href} {...t} active={isActive(t.href)} />
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

// Dev-only identity switcher — stands in for real auth (sets the av_uid cookie).
function ProfileSwitcher({ me, profiles, compact }: { me: Profile; profiles: Profile[]; compact?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  async function switchTo(id: string) {
    setOpen(false);
    await fetch("/api/whoami", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={compact
          ? "grid h-9 w-9 place-items-center rounded-md border-2 border-line text-muted"
          : "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold text-muted hover:bg-surface-2"}
        title="Switch user (dev)"
      >
        <ChevronsUpDown size={compact ? 18 : 14} /> {compact ? null : "Switch user (dev)"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 w-52 rounded-xl border-2 border-ink bg-surface p-1.5 shadow-hard ${compact ? "right-0 top-11" : "bottom-10 left-0"}`}>
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">Acting as (dev)</div>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => switchTo(p.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-bold transition hover:bg-surface-2 ${p.id === me.id ? "text-primary" : "text-ink"}`}
              >
                <Avatar name={p.name} src={p.avatar} size={26} /> {p.name}
                {p.id === me.id && <span className="ml-auto text-xs">●</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SideLink({
  href,
  label,
  Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  Icon: typeof Home;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-bold transition ${
        active ? "bg-primary-soft text-primary-deep" : "text-ink hover:bg-surface-2"
      }`}
    >
      <Icon size={20} />
      {label}
      {badge ? (
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-1 text-xs font-bold transition ${
        active ? "text-primary" : "text-muted"
      }`}
    >
      <Icon size={22} />
      {label}
    </Link>
  );
}
