"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hand, UserPlus, Plus, ChevronRight, X, Boxes, Check, Loader2 } from "lucide-react";
import { Card, Button, Avatar, AvatarStack } from "./ui";
import { NudgeSheet } from "./NudgeSheet";
import type { GroupCard, NudgeCard } from "@/lib/db";
import type { Profile } from "@/lib/types";

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
  const router = useRouter();
  const [nudges, setNudges] = React.useState(initialNudges);
  const [nudgeTarget, setNudgeTarget] = React.useState<Profile | null>(null);
  const [busyNudge, setBusyNudge] = React.useState<string | null>(null);

  // Respond to an INCOMING nudge. Accept → respondNudge creates the shared plan with
  // BOTH people already in it and routes there (do NOT send them to a blank /new where
  // they could exclude the nudger). Decline → just clears it.
  async function respond(id: string, accept: boolean) {
    setBusyNudge(id);
    try {
      const res = await fetch("/api/nudge/respond", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nudgeId: id, accept }),
      });
      const d = await res.json().catch(() => ({}));
      setNudges((s) => s.filter((x) => x.id !== id));
      if (accept && d.slug) { router.push(`/p/${d.slug}`); router.refresh(); }
    } finally { setBusyNudge(null); }
  }

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
              <Button size="sm" variant="primary" disabled={busyNudge === n.id} onClick={() => respond(n.id, true)}>
                {busyNudge === n.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Let&apos;s plan
              </Button>
              <button onClick={() => respond(n.id, false)} disabled={busyNudge === n.id} className="text-muted" aria-label="Dismiss nudge"><X size={18} /></button>
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
