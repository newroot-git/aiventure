"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Hand, Check } from "lucide-react";
import { Button, Textarea, SelectTag, Label, Avatar } from "@/components/ui";
import { MOCK_FRIENDS } from "@/lib/mock";

const WHEN = ["Whenever", "This week", "This weekend", "Soon"];

export default function NudgePage() {
  const router = useRouter();
  const [picked, setPicked] = React.useState<string[]>([]);
  const [when, setWhen] = React.useState("This weekend");
  const [note, setNote] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (sent) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-md border-2 border-ink bg-success-soft text-success shadow-hard">
          <Check size={32} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">Nudge sent</h1>
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
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {MOCK_FRIENDS.map((f) => {
            const on = picked.includes(f.id);
            return (
              <button key={f.id} onClick={() => toggle(f.id)} className="flex flex-col items-center gap-1">
                <span className={on ? "rounded-md ring-2 ring-primary ring-offset-2 ring-offset-bg" : ""}>
                  <Avatar name={f.name} src={f.avatar} size={52} />
                </span>
                <span className="truncate text-xs font-bold">{f.name}</span>
              </button>
            );
          })}
        </div>
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

      <Button
        variant="primary"
        size="lg"
        className="mt-8 w-full"
        disabled={picked.length === 0}
        onClick={() => setSent(true)}
      >
        <Hand size={18} /> Send nudge ({picked.length})
      </Button>
    </div>
  );
}
