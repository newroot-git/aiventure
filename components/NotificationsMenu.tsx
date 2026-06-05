"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Inbox, X, Check, Loader2 } from "lucide-react";
import { Button } from "./ui";
import type { InviteCard, NudgeCard, NotificationCard } from "@/lib/db";

function PixelIcon({ name }: { name: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/img/icons/${name}.png`} alt="" className="pixelated h-9 w-9 shrink-0 rounded-md border-2 border-ink object-cover" />;
}

export interface NotifData {
  invites: InviteCard[];
  nudges: NudgeCard[];
  notifications: NotificationCard[];
}

export function NotificationsMenu({ variant = "icon", data }: { variant?: "icon" | "side"; data: NotifData }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [invites] = React.useState(data.invites);
  const [nudges, setNudges] = React.useState(data.nudges);
  const [notes, setNotes] = React.useState(data.notifications);
  const [busyNudge, setBusyNudge] = React.useState<string | null>(null);
  const otherNotes = notes.filter((n) => n.kind !== "nudge"); // the actionable nudge lives in the Nudges section
  const count = invites.length + nudges.length + otherNotes.length;
  const active = usePathActive();

  // once the panel is opened the items are seen — clear locally + mark read server-side
  const close = () => {
    setOpen(false);
    setNotes([]);
    fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
  };

  async function respondNudge(id: string, accept: boolean) {
    setBusyNudge(id);
    try {
      const res = await fetch("/api/nudge/respond", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nudgeId: id, accept }),
      });
      const d = await res.json();
      setNudges((ns) => ns.filter((n) => n.id !== id));
      if (accept && d.slug) { setOpen(false); router.push(`/p/${d.slug}`); router.refresh(); }
    } finally { setBusyNudge(null); }
  }

  return (
    <>
      {variant === "icon" ? (
        <button onClick={() => setOpen(true)} aria-label="Notifications" className="relative grid h-9 w-9 place-items-center">
          <Inbox size={22} className={active ? "text-primary" : "text-ink"} />
          {count > 0 && <Badge n={count} />}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-bold text-ink transition hover:bg-surface-2"
        >
          <span className="relative"><Inbox size={20} />{count > 0 && <Badge n={count} small />}</span>
          Notifications
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-transparent" onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 top-3 z-50 mx-auto w-full max-w-md px-4 md:left-64 md:right-auto md:top-4 md:mx-0 md:w-96"
            >
              <div className="max-h-[80vh] overflow-y-auto rounded-xl border-2 border-ink bg-surface p-2 shadow-hard">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-display text-lg font-bold">Notifications</span>
                  <button onClick={close} className="text-muted"><X size={20} /></button>
                </div>

                {count === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-muted">All caught up.</p>
                )}

                {invites.length > 0 && (
                  <Section label="Invites">
                    {invites.map((iv) => (
                      <Row key={iv.id} href={`/p/${iv.slug}`} onPick={close} avatar={<PixelIcon name="invite" />}>
                        <b>{iv.fromLabel}</b> invited you
                      </Row>
                    ))}
                  </Section>
                )}

                {nudges.length > 0 && (
                  <Section label="Nudges">
                    {nudges.map((n) => (
                      <div key={n.id} className="flex items-center gap-3 rounded-md px-3 py-2.5">
                        <PixelIcon name="nudge" />
                        <div className="min-w-0 flex-1 text-sm">
                          <div><b>{n.from.name}</b> wants to do something{n.message ? `: ${n.message}` : ""}</div>
                          <div className="mt-1.5 flex gap-2">
                            <Button variant="primary" size="sm" disabled={busyNudge === n.id} onClick={() => respondNudge(n.id, true)}>
                              {busyNudge === n.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Let&apos;s plan
                            </Button>
                            <Button variant="soft" size="sm" disabled={busyNudge === n.id} onClick={() => respondNudge(n.id, false)}>
                              Not now
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Section>
                )}

                {otherNotes.length > 0 && (
                  <Section label="Activity">
                    {otherNotes.map((nt) => (
                      <Row key={nt.id} href={nt.slug ? `/p/${nt.slug}` : undefined} onPick={close} avatar={<PixelIcon name="bell" />}>
                        {nt.text}
                      </Row>
                    ))}
                  </Section>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Badge({ n, small }: { n: number; small?: boolean }) {
  return (
    <span className={`absolute ${small ? "-right-1.5 -top-1.5 h-4 w-4 text-[9px]" : "right-0 top-0 h-[18px] w-[18px] text-[10px]"} grid place-items-center rounded-full border-2 border-bg bg-primary font-bold leading-none text-white`}>
      {n}
    </span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-1">
      <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Row({ children, avatar, href, onPick }: {
  children: React.ReactNode; avatar: React.ReactNode; href?: string; onPick: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-surface-2">
      <span className="shrink-0">{avatar}</span>
      <div className="min-w-0 flex-1 truncate text-sm">{children}</div>
    </div>
  );
  return href ? <Link href={href} onClick={onPick}>{inner}</Link> : inner;
}

// avoid importing usePathname twice; tiny inline hook
import { usePathname } from "next/navigation";
function usePathActive() {
  const p = usePathname();
  return p?.startsWith("/invites") ?? false;
}
