import Link from "next/link";
import { Sparkles, Pencil, ChevronRight } from "lucide-react";
import { Card, Pill, Button, Avatar } from "@/components/ui";
import { ResetButton } from "@/components/ResetButton";
import { SignOutButton } from "@/components/SignOutButton";
import { getCurrentProfile, getUserPlans, getUserGroups } from "@/lib/db";

export default async function ProfilePage() {
  const [me, plans, groups] = await Promise.all([
    getCurrentProfile(), getUserPlans(), getUserGroups(),
  ]);
  const adventures = plans.filter((p) => p.status === "past").length;
  const name = me?.name ?? "You";

  return (
    <div>
      {/* identity */}
      <div className="flex items-center gap-4">
        <Avatar name={name} src={me?.avatar} size={64} />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">{name}</h1>
          <div className="mt-1">
            {me?.is_paid ? (
              <Pill tone="primary"><Sparkles size={13} /> Plus</Pill>
            ) : (
              <Pill tone="neutral">Free</Pill>
            )}
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat value={adventures} label="Adventures" />
        <Stat value={groups.length} label="Crews" />
        <Stat value={me?.interests.length ?? 0} label="Interests" />
      </div>

      {/* adventure log */}
      <Link href="/log" className="mt-6 block">
        <Card hard className="flex items-center gap-4 p-4 transition active:translate-x-1 active:translate-y-1 active:shadow-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/tiles/log.png" alt="" className="pixelated h-14 w-14 shrink-0 rounded-md border-2 border-ink object-cover" />
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold">Your adventure log</h3>
            <p className="text-sm text-muted">{adventures} adventures stacked up</p>
          </div>
          <ChevronRight size={22} className="text-muted" />
        </Card>
      </Link>

      {/* interests */}
      <div className="mt-7 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">What you&apos;re into</h2>
        <Link href="/profile/edit" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><Pencil size={14} /> Edit</Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(me?.interests ?? []).map((t) => <Pill key={t} tone="neutral">{t}</Pill>)}
      </div>
      {me?.interest_notes && (
        <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">{me.interest_notes}</p>
      )}

      {/* upgrade */}
      {!me?.is_paid && (
        <Card className="mt-7 !bg-ink p-6 text-white">
          <h3 className="font-heading text-lg font-extrabold">Go Plus</h3>
          <p className="mt-1 text-sm text-white/70">Unlimited AI drops, deeper personalisation, trip mode. One Plus member unlocks AI for everyone on a plan.</p>
          <Link href="/plus"><Button variant="primary" className="mt-4">See plans</Button></Link>
        </Card>
      )}

      {/* account */}
      <div className="mt-8">
        <SignOutButton />
      </div>

      {/* dev tools */}
      <div className="mt-10 border-t border-line pt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Dev tools</h2>
        <div className="mt-3 flex flex-col gap-2">
          <ResetButton />
          <a href="/dev" className="text-center text-sm font-semibold text-muted underline">About this build</a>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="font-heading text-2xl font-extrabold text-primary">{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
    </Card>
  );
}
