"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Hand, X, Loader2, Check } from "lucide-react";
import { Button, Avatar, SelectTag, Textarea } from "./ui";
import type { Profile } from "@/lib/types";

const NUDGE_WHEN = ["Whenever", "This week", "This weekend", "Soon"];

// A nudge = the intent to do something with someone. Sending it creates a shared,
// empty plan and drops the recipient a notification; the sender lands on that plan
// to start shaping it. Pass `friend` to nudge a specific person, or omit to pick.
export function NudgeSheet({ friend, onClose }: { friend?: Profile; onClose: () => void }) {
  const router = useRouter();
  const [friends, setFriends] = React.useState<Profile[]>(friend ? [friend] : []);
  const [target, setTarget] = React.useState<Profile | null>(friend ?? null);
  const [when, setWhen] = React.useState("This weekend");
  const [note, setNote] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (friend) return;
    fetch("/api/friends").then((r) => r.json()).then((d) => setFriends(d.friends ?? [])).catch(() => {});
  }, [friend]);

  async function send() {
    if (!target) return;
    setSending(true);
    try {
      const res = await fetch("/api/nudge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: target.id, message: note, when }),
      });
      const d = await res.json();
      if (res.ok && d.slug) { router.push(`/p/${d.slug}`); return; }
      throw new Error(d.error || "failed");
    } catch {
      setSending(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-night/30" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md p-4">
        <div className="rounded-xl border-2 border-ink bg-surface p-4 shadow-hard">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-lg font-bold">
              <Hand size={18} className="text-primary" /> Nudge {target ? target.name : "a mate"}
            </span>
            <button onClick={onClose} className="text-muted"><X size={20} /></button>
          </div>
          <p className="text-sm text-muted">Poke someone to do something — they land in a shared plan you both shape.</p>

          {!friend && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {friends.map((f) => {
                const on = target?.id === f.id;
                return (
                  <button key={f.id} onClick={() => setTarget(f)} className="flex flex-col items-center gap-1">
                    <span className={on ? "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}>
                      <Avatar name={f.name} src={f.avatar} size={44} />
                    </span>
                    <span className="truncate text-xs font-bold">{f.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {NUDGE_WHEN.map((w) => (
              <SelectTag key={w} selected={when === w} onClick={() => setWhen(w)}>{w}</SelectTag>
            ))}
          </div>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-3" placeholder="Anything specific? (optional) e.g. fancy a climb?" />
          <Button variant="primary" className="mt-3 w-full" disabled={!target || sending} onClick={send}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Hand size={16} />}
            {sending ? "Sending…" : "Send nudge"}
          </Button>
        </div>
      </div>
    </>
  );
}
