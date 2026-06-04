"use client";
import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Route, Hand, Sparkles, X } from "lucide-react";
import { NudgeSheet } from "./NudgeSheet";

const ACTIONS = [
  { href: "/new", Icon: Route, title: "Create a plan", sub: "One thing, an adventure, or a trip" },
  { href: "/new?scope=surprise", Icon: Sparkles, title: "Give me something now", sub: "AI picks something for today" },
];

export function QuickMenu({ variant = "fab" }: { variant?: "fab" | "side" }) {
  const [open, setOpen] = React.useState(false);
  const [nudgeOpen, setNudgeOpen] = React.useState(false);

  return (
    <>
      {variant === "fab" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Quick actions"
          className="mx-auto grid h-16 w-16 -translate-y-5 place-items-center rounded-lg border-2 border-ink bg-primary text-white shadow-hard-sm transition active:scale-95"
        >
          <Plus size={30} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="press-hard inline-flex w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-primary px-4 py-2.5 font-bold text-white shadow-hard"
        >
          <Plus size={18} /> New
        </button>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-32 z-50 mx-auto w-full max-w-md px-4 md:bottom-6"
            >
              <div className="rounded-xl border-2 border-ink bg-surface p-2 shadow-hard">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-display text-lg font-bold">Quick actions</span>
                  <button onClick={() => setOpen(false)} className="text-muted">
                    <X size={20} />
                  </button>
                </div>
                {ACTIONS.map((a, i) => (
                  <motion.div
                    key={a.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + i * 0.05, duration: 0.2 }}
                  >
                    <Link
                      href={a.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-3 transition hover:bg-surface-2 active:scale-[0.99]"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep">
                        <a.Icon size={22} />
                      </span>
                      <div>
                        <div className="font-bold leading-tight">{a.title}</div>
                        <div className="text-sm text-muted">{a.sub}</div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 + ACTIONS.length * 0.05, duration: 0.2 }}>
                  <button
                    onClick={() => { setOpen(false); setNudgeOpen(true); }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition hover:bg-surface-2 active:scale-[0.99]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep">
                      <Hand size={22} />
                    </span>
                    <div>
                      <div className="font-bold leading-tight">Send a nudge</div>
                      <div className="text-sm text-muted">Poke a mate — land in a shared plan to figure it out</div>
                    </div>
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {nudgeOpen && <NudgeSheet onClose={() => setNudgeOpen(false)} />}
    </>
  );
}
