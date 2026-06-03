"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, RotateCcw, Pencil, ChevronRight, UserPlus } from "lucide-react";
import { Card, Pill, Button, Avatar } from "@/components/ui";
import { CURRENT_USER, MOCK_PLANS, MOCK_GROUPS, MOCK_FRIENDS } from "@/lib/mock";

export default function ProfilePage() {
  const router = useRouter();
  const adventures = MOCK_PLANS.filter((p) => p.status === "past").length;

  function reset() {
    try {
      localStorage.clear();
    } catch {}
    router.push("/");
  }

  return (
    <div>
      {/* identity */}
      <div className="flex items-center gap-4">
        <Avatar name={CURRENT_USER.name} src={CURRENT_USER.avatar} size={64} />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">
            {CURRENT_USER.name}
          </h1>
          <div className="mt-1">
            {CURRENT_USER.is_paid ? (
              <Pill tone="primary">
                <Sparkles size={13} /> Plus
              </Pill>
            ) : (
              <Pill tone="neutral">Free</Pill>
            )}
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat value={adventures} label="Adventures" />
        <Stat value={MOCK_GROUPS.length} label="Crews" />
        <Stat value={CURRENT_USER.interests.length} label="Interests" />
      </div>

      {/* adventure log */}
      <Link href="/log" className="mt-6 block">
        <Card hard className="flex items-center gap-4 p-4 transition active:translate-x-1 active:translate-y-1 active:shadow-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/tiles/log.png" alt="" className="pixelated h-14 w-14 shrink-0 rounded-md border-2 border-ink object-cover" />
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold">Your adventure log</h3>
            <p className="text-sm text-muted">
              {MOCK_PLANS.filter((p) => p.status === "past").length} adventures stacked up
            </p>
          </div>
          <ChevronRight size={22} className="text-muted" />
        </Card>
      </Link>

      {/* friends */}
      <div className="mt-7 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">Friends</h2>
        <button className="inline-flex items-center gap-1 text-sm font-bold text-primary">
          <UserPlus size={14} /> Add
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {MOCK_FRIENDS.map((f) => (
          <div key={f.id} className="flex flex-col items-center gap-1">
            <Avatar name={f.name} src={f.avatar} size={52} />
            <span className="truncate text-xs font-bold">{f.name}</span>
          </div>
        ))}
      </div>

      {/* interests */}
      <div className="mt-7 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">What you&apos;re into</h2>
        <Link
          href="/profile/edit"
          className="inline-flex items-center gap-1 text-sm font-bold text-primary"
        >
          <Pencil size={14} /> Edit
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CURRENT_USER.interests.map((t) => (
          <Pill key={t} tone="neutral">
            {t}
          </Pill>
        ))}
      </div>
      {CURRENT_USER.interest_notes && (
        <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          {CURRENT_USER.interest_notes}
        </p>
      )}

      {/* upgrade */}
      {!CURRENT_USER.is_paid && (
        <Card className="mt-7 bg-ink p-6 text-white">
          <h3 className="font-heading text-lg font-extrabold">Go Plus</h3>
          <p className="mt-1 text-sm text-white/70">
            Unlimited AI drops, deeper personalisation, trip mode. One Plus member
            unlocks AI for everyone on a plan.
          </p>
          <Link href="/plus">
            <Button variant="primary" className="mt-4">
              See plans
            </Button>
          </Link>
        </Card>
      )}

      {/* dev tools */}
      <div className="mt-10 border-t border-line pt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Dev tools
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          <Button variant="soft" onClick={reset}>
            <RotateCcw size={16} /> Reset app
          </Button>
          <a
            href="/dev"
            className="text-center text-sm font-semibold text-muted underline"
          >
            About this build
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card className="p-4 text-center">
      <div className="font-heading text-2xl font-extrabold text-primary">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
    </Card>
  );
}
