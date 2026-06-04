"use client";
import * as React from "react";
import Link from "next/link";
import { Hand, UserPlus, Plus, ChevronRight, X, Boxes, Check } from "lucide-react";
import { Card, Button, Avatar, AvatarStack, SelectTag, Textarea } from "./ui";
import type { GroupCard, NudgeCard } from "@/lib/db";
import type { Profile } from "@/lib/types";

const NUDGE_WHEN = ["Whenever", "This week", "This weekend", "Soon"];

function NudgeSheet({ friend, onClose }: { friend: Profile; onClose: () => void }) {
  const [when, setWhen] = React.useState("This weekend");
  const [note, setNote] = React.useState("");
  const [sent, setSent] = React.useState(false);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md p-4">
        <div className="rounded-xl border-2 border-ink bg-surface p-4 shadow-hard">
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-md border-2 border-ink bg-success-soft text-success shadow-hard"><Check size={28} /></span>
              <p className="mt-4 font-display text-xl font-bold">Nudge sent to {friend.name}</p>
              <p className="mt-1 text-sm text-muted">They can suggest, set a condition, or rain-check.</p>
              <Button variant="soft" className="mt-4" onClick={onClose}>Done</Button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 font-display text-lg font-bold">
                  <Avatar name={friend.name} src={friend.avatar} size={32} /> Nudge {friend.name}
                </span>
                <button onClick={onClose} className="text-muted"><X size={20} /></button>
              </div>
              <p className="text-sm text-muted">Poke them to make plans with you — vague or specific.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {NUDGE_WHEN.map((w) => (
                  <SelectTag key={w} selected={when === w} onClick={() => setWhen(w)}>{w}</SelectTag>
                ))}
              </div>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-3" placeholder="Anything specific? (optional)" />
              <Button variant="primary" className="mt-3 w-full" onClick={() => setSent(true)}>
                <Hand size={16} /> Send nudge
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Heading({ icon, children, action }: { icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between first:mt-0">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">{icon} {children}</h2>
      {action}
    </div>
  );
}

export function CrewView({
  groups,
  friends,
  nudges: initialNudges,
}: {
  groups: GroupCard[];
  friends: { profile: Profile; shared: string[] }[];
  nudges: NudgeCard[];
}) {
  const [nudges, setNudges] = React.useState(initialNudges);
  const [nudgeTarget, setNudgeTarget] = React.useState<Profile | null>(null);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Crew</h1>
      <p className="mt-1 text-[15px] text-muted">Your friends and the groups you run with.</p>

      <Heading icon={<Hand size={20} className="text-primary" />}
        action={<Link href="/nudge"><Button size="sm" variant="soft"><Hand size={14} /> Nudge</Button></Link>}>
        Nudges
      </Heading>
      {nudges.length === 0 ? (
        <Card className="p-5 text-center text-sm text-muted">No nudges right now.</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {nudges.map((n) => (
            <Card key={n.id} className="flex items-center gap-3 p-3">
              <Avatar name={n.from.name} src={n.from.avatar} size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-sm"><b>{n.from.name}</b> · {n.message}</div>
                <div className="text-xs text-muted">{n.when}</div>
              </div>
              <Link href="/new"><Button size="sm" variant="primary">Plan it</Button></Link>
              <button onClick={() => setNudges((s) => s.filter((x) => x.id !== n.id))} className="text-muted"><X size={18} /></button>
            </Card>
          ))}
        </div>
      )}

      <Heading icon={<Boxes size={20} className="text-secondary" />}
        action={<Link href="/groups/new"><Button size="sm" variant="soft"><Plus size={14} /> New</Button></Link>}>
        Your groups
      </Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <Link key={g.id} href={`/g/${g.id}`} className="block">
            <Card hard className="p-5 transition active:scale-[0.99]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold">{g.name}</h3>
                  <p className="mt-0.5 text-sm text-muted">{g.members.length} members</p>
                </div>
                <ChevronRight size={20} className="text-muted" />
              </div>
              <div className="mt-4"><AvatarStack people={g.members} max={6} /></div>
            </Card>
          </Link>
        ))}
      </div>

      <Heading icon={<UserPlus size={20} className="text-success" />}
        action={<Button size="sm" variant="soft"><UserPlus size={14} /> Add</Button>}>
        Friends
      </Heading>
      <div className="flex flex-col gap-2">
        {friends.map(({ profile: f, shared }) => (
          <Card key={f.id} className="flex items-center gap-3 p-3">
            <Avatar name={f.name} src={f.avatar} size={52} />
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold">{f.name}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {f.interests.slice(0, 3).map((t) => (
                  <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-bold text-muted">{t}</span>
                ))}
              </div>
              {shared.length > 0 && <div className="mt-1 text-xs text-muted">Shared: {shared.join(", ")}</div>}
            </div>
            <Button size="sm" variant="soft" onClick={() => setNudgeTarget(f)}><Hand size={14} /></Button>
          </Card>
        ))}
      </div>

      {nudgeTarget && <NudgeSheet friend={nudgeTarget} onClose={() => setNudgeTarget(null)} />}
    </div>
  );
}
