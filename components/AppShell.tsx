"use client";
import * as React from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, CalendarDays, Compass, ChevronsUpDown, Loader2 } from "lucide-react";
import { Avatar } from "./ui";
import { QuickMenu } from "./QuickMenu";
import type { Profile } from "@/lib/types";

// neutral fallback — never masquerade as a seeded user when identity is unresolved
const FALLBACK_USER = { id: "", name: "You", avatar: null } as unknown as Profile;

const TABS = [
  { href: "/plans", label: "Home", Icon: Home },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/groups", label: "Crew", Icon: Users },
];

export function AppShell({
  children, notifications, me, profiles = [],
}: {
  children: React.ReactNode;
  notifications: { side: React.ReactNode; icon: React.ReactNode };
  me?: Profile | null;
  profiles?: Profile[];
}) {
  const path = usePathname();
  const isActive = (href: string) => path.startsWith(href);
  const user = me ?? FALLBACK_USER;

  return (
    // app-shell: locked to the dynamic viewport height and never scrolls itself;
    // only <main> scrolls, so the header/nav can't drift on iOS (no fixed/sticky).
    <div className="flex h-dvh overflow-hidden">
      {/* ---- desktop sidebar (in-flow flex column, full height) ---- */}
      <aside className="hidden w-60 shrink-0 flex-col border-r-2 border-line bg-surface/50 px-4 py-6 md:flex">
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
          {notifications.side}
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-md px-3 py-2 transition ${
              isActive("/profile") ? "bg-primary-soft" : "hover:bg-surface-2"
            }`}
          >
            <Avatar name={user.name} src={user.avatar} size={30} />
            <span className="text-[15px] font-bold">{user.name}</span>
          </Link>
          {process.env.NEXT_PUBLIC_DEV_SWITCH === "1" && profiles.length > 1 && <ProfileSwitcher me={user} profiles={profiles} />}
        </div>
      </aside>

      {/* ---- main column: pinned header · scrolling main · pinned bottom nav ---- */}
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
      >
        {/* mobile top bar (flex-none — stays pinned, notch-safe) */}
        <header
          className="flex-none border-b-2 border-ink bg-bg/90 backdrop-blur md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between px-5 py-3">
            <Link href="/plans" className="font-display text-xl font-bold tracking-tight">
              AI<span className="text-primary">venture</span>
            </Link>
            <div className="flex items-center gap-3">
              {process.env.NEXT_PUBLIC_DEV_SWITCH === "1" && profiles.length > 1 && <ProfileSwitcher me={user} profiles={profiles} compact />}
              {notifications.icon}
              <Link href="/profile" aria-label="Profile" className="grid h-11 w-11 place-items-center">
                <Avatar name={user.name} src={user.avatar} size={32} />
              </Link>
            </div>
          </div>
        </header>

        {/* the ONLY scrolling region (min-h-0 lets the flex child shrink + scroll) */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-2xl px-5 pb-10 pt-4 md:max-w-4xl md:px-8 md:pb-12 md:pt-10">
            {children}
          </div>
        </main>

        {/* mobile bottom nav (flex-none — stays pinned, home-indicator-safe) */}
        <nav
          className="flex-none border-t-2 border-ink bg-surface/95 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto grid w-full max-w-lg grid-cols-5 items-center px-3 py-1">
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

// Pending indicator — reads the enclosing <Link>'s navigation status so the tab the
// user clicked shows a spinner the instant they click, before the new page streams in.
function LinkPending({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 size={16} className={`animate-spin text-primary ${className}`} aria-label="Loading" />;
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
      <LinkPending className="ml-auto" />
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
      className="flex min-h-[44px] flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold"
    >
      {/* active tab = chunky pixel chip (ink border + tint fill), like the section bubbles */}
      <span
        className={`relative grid h-9 w-9 place-items-center rounded-md border-2 transition ${
          active ? "border-ink bg-primary-soft text-primary-deep" : "border-transparent text-muted"
        }`}
      >
        <Icon size={20} />
        <span className="absolute -right-2 -top-2"><LinkPending /></span>
      </span>
      <span className={active ? "text-primary-deep" : "text-muted"}>{label}</span>
    </Link>
  );
}
