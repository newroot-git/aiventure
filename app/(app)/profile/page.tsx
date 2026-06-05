import Link from "next/link";
import type { ReactNode } from "react";
import {
  Sparkles, Pencil, ChevronRight, Compass, Users, Heart, Zap, NotebookText, Trophy,
} from "lucide-react";
import { Card, Pill, Avatar, Burst } from "@/components/ui";
import { AuroraField } from "@/components/atmosphere";
import { BadgeMedal } from "@/components/BadgeMedal";
import { ResetButton } from "@/components/ResetButton";
import { SignOutButton } from "@/components/SignOutButton";
import { CATEGORIES } from "@/lib/interests";
import { splitBadges } from "@/lib/badges";
import { getCurrentProfile, getUserPlans, getUserGroups } from "@/lib/db";

const CAT_OF = new Map<string, string>();
for (const c of CATEGORIES) for (const i of c.interests) CAT_OF.set(i.toLowerCase(), c.id);

const CLASS_BY_CAT: Record<string, string> = {
  active: "Trailblazer", food: "Tastemaker", games: "Game Master", culture: "Culture Seeker",
  nightlife: "Night Owl", trips: "Wayfarer", chill: "Free Spirit",
};

function archetype(interests: string[]): string {
  const tally = new Map<string, number>();
  for (const i of interests) { const c = CAT_OF.get(i.toLowerCase()); if (c) tally.set(c, (tally.get(c) ?? 0) + 1); }
  let best: string | null = null, max = 0;
  for (const [cat, n] of tally) if (n > max) { max = n; best = cat; }
  return (best && CLASS_BY_CAT[best]) || "Wanderer";
}

const XP_PER_LEVEL = 250;
function levelFrom(adventures: number, crews: number, interests: number) {
  const xp = adventures * 100 + crews * 40 + interests * 10;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp - (level - 1) * XP_PER_LEVEL;
  return { level, intoLevel, pct: Math.round((intoLevel / XP_PER_LEVEL) * 100) };
}

export default async function ProfilePage() {
  const [me, plans, groups] = await Promise.all([
    getCurrentProfile(), getUserPlans(), getUserGroups(),
  ]);
  const name = me?.name ?? "You";
  const interests = me?.interests ?? [];
  const adventures = plans.filter((p) => p.status === "past").length;
  const crews = groups.length;
  const cls = archetype(interests);
  const { level, intoLevel, pct } = levelFrom(adventures, crews, interests.length);
  const { earned, locked } = splitBadges({ adventures, crews, interests: interests.length });

  return (
    <div>
      {/* character hero */}
      <AuroraField stars className="rounded-2xl border-2 border-ink p-5 shadow-hard">
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <Link href="/profile/edit" aria-label="Edit profile" className="grid h-8 w-8 place-items-center rounded-md border-2 border-ink bg-white/15 text-white transition active:translate-x-[2px] active:translate-y-[2px]">
            <Pencil size={15} />
          </Link>
          {me?.is_paid ? (
            <Pill tone="accent"><Sparkles size={13} /> Plus</Pill>
          ) : (
            <span className="inline-flex items-center rounded-md border-2 border-ink bg-white/15 px-2.5 py-1 text-sm font-bold text-white">Free</span>
          )}
        </div>
        <div className="relative flex items-center gap-4">
          <div className="shrink-0 rounded-full border-2 border-ink shadow-hard-sm">
            <Avatar name={name} src={me?.avatar} size={72} />
          </div>
          <div className="min-w-0 flex-1 pr-16 text-white">
            <h1 className="font-display text-xl font-bold leading-tight">{name}</h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-white/90">
              <Burst size={13} className="text-accent" /> {cls}
            </div>
          </div>
        </div>

        <div className="relative mt-4 text-white">
          <div className="flex items-end justify-between">
            <span className="inline-flex items-center gap-1.5 font-display text-lg font-bold">
              <Zap size={16} className="text-accent" /> Level {level} Explorer
            </span>
            <span className="text-xs font-bold text-white/80">{intoLevel} / {XP_PER_LEVEL} XP</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink bg-black/25">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-white/75">Finish adventures to level up your explorer.</p>
        </div>
      </AuroraField>

      {/* stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat icon={<Compass size={18} />} value={adventures} label="Journeys" />
        <Stat icon={<Users size={18} />} value={crews} label="Allies" />
        <Stat icon={<Heart size={18} />} value={interests.length} label="Affinities" />
      </div>

      {/* badges — earned in one row, full set on its own page */}
      <SectionHead icon={<Trophy size={17} className="text-accent" />} title="Badges">
        <Link href="/profile/badges" className="inline-flex items-center gap-0.5 text-sm font-bold text-primary">
          See all <ChevronRight size={15} />
        </Link>
      </SectionHead>
      <Card hard className="mt-3 p-4">
        {earned.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {earned.map((b) => (
              <div key={b.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <BadgeMedal id={b.id} label={b.label} how={b.how} got />
                <span className="text-center text-[11px] font-bold leading-tight">{b.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <BadgeMedal id={locked[0].id} label={locked[0].label} how={locked[0].how} got={false} />
            <div className="text-sm">
              <p className="font-bold">No badges yet.</p>
              <p className="text-muted">{locked[0].how} to earn your first.</p>
            </div>
          </div>
        )}
      </Card>

      {/* adventure log */}
      <Link href="/log" className="mt-6 block">
        <Card hard className="flex items-center gap-4 p-4 transition active:translate-x-1 active:translate-y-1 active:shadow-none">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md border-2 border-ink bg-secondary-soft text-secondary shadow-hard-sm">
            <NotebookText size={26} />
          </span>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold">Your adventure log</h3>
            <p className="text-sm text-muted">{adventures} adventure{adventures === 1 ? "" : "s"} stacked up</p>
          </div>
          <ChevronRight size={22} className="text-muted" />
        </Card>
      </Link>

      {/* affinities */}
      <SectionHead icon={<Heart size={17} className="text-primary" />} title="Affinities">
        <Link href="/profile/edit" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><Pencil size={14} /> Edit</Link>
      </SectionHead>
      {interests.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {interests.map((t) => <Pill key={t} tone="neutral">{t}</Pill>)}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No affinities yet — add a few so we can tune your adventures.</p>
      )}
      {me?.interest_notes && (
        <p className="mt-3 rounded-xl border-2 border-line bg-surface-2 px-4 py-3 text-sm text-muted">{me.interest_notes}</p>
      )}

      {/* pay to win */}
      {!me?.is_paid && (
        <Link href="/plus" className="mt-7 block">
          <AuroraField className="rounded-2xl border-2 border-ink p-5 shadow-hard transition active:translate-x-1 active:translate-y-1 active:shadow-none">
            <div className="relative flex items-center gap-4 text-white">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border-2 border-ink bg-accent text-ink shadow-hard-sm">
                <Zap size={24} />
              </span>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold">Pay to Win</h3>
                <p className="text-sm text-white/80">Unlock unlimited AI, trip mode + the full power-up.</p>
              </div>
              <ChevronRight size={22} className="text-white/80" />
            </div>
          </AuroraField>
        </Link>
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

function SectionHead({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="mt-7 flex items-center justify-between">
      <h2 className="flex items-center gap-1.5 font-display text-lg font-bold">{icon} {title}</h2>
      {children}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <Card hard className="p-4 text-center">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center text-primary">{icon}</div>
      <div className="font-heading text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
    </Card>
  );
}
