"use client";
import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Inbox, X, Check } from "lucide-react";
import type { InviteCard, NudgeCard, NotificationCard } from "@/lib/db";

function PixelIcon({ name }: { name: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/img/icons/${name}.png`} alt="" className="pixelated h-9 w-9 shrink-0 rounded-md border-2 border-ink/10 object-cover" />;
}

export interface NotifData {
  invites: InviteCard[];
  nudges: NudgeCard[];
  notifications: NotificationCard[];
}

export function NotificationsMenu({ variant = "icon", data }: { variant?: "icon" | "side"; data: NotifData }) {
  const [open, setOpen] = React.useState(false);
  const [invites, setInvites] = React.useState(data.invites);
  const [nudges, setNudges] = React.useState(data.nudges);
  const [notes, setNotes] = React.useState(data.notifications);
  const count = invites.length + nudges.length + notes.length;
  const active = usePathActive();

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
              className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpen(false)}
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
                  <button onClick={() => setOpen(false)} className="text-muted"><X size={20} /></button>
                </div>

                {count === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-muted">All caught up.</p>
                )}

                {invites.length > 0 && (
                  <Section label="Invites">
                    {invites.map((iv) => (
                      <Row key={iv.id} href={`/p/${iv.slug}`} onClose={() => setInvites((s) => s.filter((x) => x.id !== iv.id))} onPick={() => setOpen(false)}
                        avatar={<PixelIcon name="invite" />}>
                        <b>{iv.fromLabel}</b> invited you · <span className="text-muted">{iv.activity}</span>
                      </Row>
                    ))}
                  </Section>
                )}

                {nudges.length > 0 && (
                  <Section label="Nudges">
                    {nudges.map((n) => (
                      <Row key={n.id} href="/new" onClose={() => setNudges((s) => s.filter((x) => x.id !== n.id))} onPick={() => setOpen(false)}
                        avatar={<PixelIcon name="nudge" />}>
                        <b>{n.from.name}</b> nudged you · <span className="text-muted">{n.message}</span>
                      </Row>
                    ))}
                  </Section>
                )}

                {notes.length > 0 && (
                  <Section label="Activity">
                    {notes.map((nt) => (
                      <Row key={nt.id} href={nt.slug ? `/p/${nt.slug}` : undefined} onClose={() => setNotes((s) => s.filter((x) => x.id !== nt.id))} onPick={() => setOpen(false)}
                        avatar={<PixelIcon name="bell" />}>
                        {nt.text} <span className="text-muted">· {nt.when}</span>
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

function Row({ children, avatar, href, onClose, onPick }: {
  children: React.ReactNode; avatar: React.ReactNode; href?: string; onClose: () => void; onPick: () => void;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-surface-2">
      <span className="shrink-0">{avatar}</span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} aria-label="Acknowledge" className="shrink-0 text-muted hover:text-ink">
        <Check size={18} />
      </button>
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
