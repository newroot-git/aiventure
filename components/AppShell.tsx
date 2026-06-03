"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, Compass } from "lucide-react";
import { Avatar } from "./ui";
import { QuickMenu } from "./QuickMenu";
import { NotificationsMenu } from "./NotificationsMenu";
import { CURRENT_USER } from "@/lib/mock";

const TABS = [
  { href: "/plans", label: "Home", Icon: Home },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/groups", label: "Crew", Icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => path.startsWith(href);

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
          <NotificationsMenu variant="side" />
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-md px-3 py-2 transition ${
              isActive("/profile") ? "bg-primary-soft" : "hover:bg-surface-2"
            }`}
          >
            <Avatar name={CURRENT_USER.name} src={CURRENT_USER.avatar} size={30} />
            <span className="text-[15px] font-bold">{CURRENT_USER.name}</span>
          </Link>
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
              <NotificationsMenu variant="icon" />
              <Link href="/profile" aria-label="Profile">
                <Avatar name={CURRENT_USER.name} src={CURRENT_USER.avatar} size={32} />
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
