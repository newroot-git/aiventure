"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hand, Check, Loader2 } from "lucide-react";
import { Button, Textarea, SelectTag, Label, Avatar } from "@/components/ui";
import type { Profile } from "@/lib/types";

const WHEN = ["Whenever", "This week", "This weekend", "Soon"];

export default function NudgePage() {
  const router = useRouter();
  const [friends, setFriends] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [when, setWhen] = React.useState("This weekend");
  const [note, setNote] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/friends", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setFriends(Array.isArray(d.friends) ? d.friends : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const target = friends.find((f) => f.id === targetId) ?? null;

  async function send() {
    if (!targetId) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: targetId, message: note, when }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't send the nudge.");
      setSent(true);
    } catch (e) {
      setError((e as Error)?.message || "Couldn't send the nudge. Try again.");
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-md border-2 border-ink bg-success-soft text-success shadow-hard">
          <Check size={32} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">Nudge sent{target ? ` to ${target.name}` : ""}</h1>
        <p className="mt-2 text-[15px] text-muted">
          We&apos;ll let you know when they bite. They can suggest, set a condition,
          or rain-check.
        </p>
        <Button variant="primary" className="mt-6" onClick={() => router.push("/explore")}>
          Back to explore
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Explore
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold leading-tight">Send a nudge</h1>
      <p className="mt-2 text-[15px] text-muted">
        Poke a mate to make plans with you — vague or specific, they fill in the
        rest.
      </p>

      <div className="mt-7">
        <Label>Who?</Label>
        {loading ? (
          <div className="mt-3 flex justify-center text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-line bg-surface p-4 text-sm text-muted">
            No mates here yet. Share a plan with someone first, then you can nudge them.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {friends.map((f) => {
              const on = targetId === f.id;
              return (
                <button key={f.id} onClick={() => setTargetId(on ? null : f.id)} className="flex flex-col items-center gap-1">
                  <span className={on ? "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-bg" : ""}>
                    <Avatar name={f.name} src={f.avatar} size={52} />
                  </span>
                  <span className="truncate text-xs font-bold">{f.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-7">
        <Label>When?</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {WHEN.map((w) => (
            <SelectTag key={w} selected={when === w} onClick={() => setWhen(w)}>{w}</SelectTag>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <Label>Anything specific? (optional)</Label>
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-2"
          placeholder="e.g. fancy a climb? or just — let's do something."
        />
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-md border-2 border-[#c0392b] bg-[#c0392b]/10 px-3 py-2 text-sm font-bold text-[#c0392b]">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        size="lg"
        className="mt-8 w-full"
        disabled={!targetId || sending}
        onClick={send}
      >
        {sending ? <Loader2 size={18} className="animate-spin" /> : <Hand size={18} />}
        {sending ? "Sending…" : "Send nudge"}
      </Button>
    </div>
  );
}
