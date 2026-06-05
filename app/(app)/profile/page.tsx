import Link from "next/link";
import {
  Sparkles, Pencil, ChevronRight, Compass, Users, Heart, Footprints,
  Flame, Star, Trophy, Lock, Zap,
} from "lucide-react";
import { Card, Pill, Button, Avatar, Burst } from "@/components/ui";
import { AuroraField } from "@/components/atmosphere";
import { ResetButton } from "@/components/ResetButton";
import { SignOutButton } from "@/components/SignOutButton";
import { CATEGORIES } from "@/lib/interests";
import { getCurrentProfile, getUserPlans, getUserGroups } from "@/lib/db";

// interest -> category id, so we can read a "class" off someone's top interests
const CAT_OF = new Map<string, string>();
for (const c of CATEGORIES) for (const i of c.interests) CAT_OF.set(i.toLowerCase(), c.id);

// each interest category maps to a playful adventurer "class"
const CLASS_BY_CAT: Record<string, string> = {
  active: "Trailblazer",
  food: "Tastemaker",
  games: "Game Master",
  culture: "Culture Seeker",
  nightlife: "Night Owl",
  trips: "Wayfarer",
  chill: "Free Spirit",
};

function archetype(interests: string[]): string {
  const tally = new Map<string, number>();
  for (const i of interests) {
    const cat = CAT_OF.get(i.toLowerCase());
    if (cat) tally.set(cat, (tally.get(cat) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [cat, n] of tally) if (n > max) { max = n; best = cat; }
  return (best && CLASS_BY_CAT[best]) || "Wanderer";
}

// XP is derived from real activity now and grows as you do more. Interests give a
// little base XP so a fresh profile already shows progress. (Stats-over-time later.)
const XP_PER_LEVEL = 250;
function levelFrom(adventures: number, crews: number, interests: number) {
  const xp = adventures * 100 + crews * 40 + interests * 10;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp - (level - 1) * XP_PER_LEVEL;
  return { xp, level, intoLevel, pct: Math.round((intoLevel / XP_PER_LEVEL) * 100) };
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

  const badges = [
    { id: "first", label: "First Steps", desc: "Log your first adventure", icon: Footprints, got: adventures >= 1 },
    { id: "crew", label: "Found a crew", desc: "Join or start a crew", icon: Users, got: crews >= 1 },
    { id: "curious", label: "Curious mind", desc: "Pick 5+ interests", icon: Star, got: interests.length >= 5 },
    { id: "five", label: "Trailblazer", desc: "5 adventures done", icon: Flame, got: adventures >= 5 },
    { id: "ten", label: "Seasoned", desc: "10 adventures done", icon: Trophy, got: adventures >= 10 },
    { id: "social", label: "Connector", desc: "Run 3 crews", icon: Heart, got: crews >= 3 },
  ];
  const earned = badges.filter((b) => b.got).length;

  return (
    <div>
      {/* character hero */}
      <AuroraField stars className="rounded-2xl border-2 border-ink p-5 shadow-hard">
        <div className="absolute right-3 top-3">
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
          <div className="min-w-0 flex-1 pr-12 text-white">
            <h1 className="truncate font-display text-2xl font-bold leading-tight">{name}</h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-white/90">
              <Burst size={13} className="text-accent" /> {cls}
            </div>
          </div>
        </div>

        {/* level + xp */}
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

      {/* badges */}
      <div className="mt-7 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">Badges</h2>
        <span className="text-sm font-bold text-muted">{earned}/{badges.length} earned</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {badges.map((b) => (
          <Card key={b.id} hard={b.got} className={`p-3 text-center ${b.got ? "" : "opacity-55"}`}>
            <div className={`mx-auto grid h-11 w-11 place-items-center rounded-md border-2 border-ink ${b.got ? "bg-accent-soft text-[#8a6512] shadow-hard-sm" : "bg-surface-2 text-muted"}`}>
              {b.got ? <b.icon size={20} /> : <Lock size={18} />}
            </div>
            <div className="mt-2 text-xs font-bold leading-tight">{b.label}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-muted">{b.desc}</div>
          </Card>
        ))}
      </div>

      {/* adventure log */}
      <Link href="/log" className="mt-7 block">
        <Card hard className="flex items-center gap-4 p-4 transition active:translate-x-1 active:translate-y-1 active:shadow-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/tiles/log.png" alt="" className="pixelated h-14 w-14 shrink-0 rounded-md border-2 border-ink object-cover" />
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold">Your adventure log</h3>
            <p className="text-sm text-muted">{adventures} adventure{adventures === 1 ? "" : "s"} stacked up</p>
          </div>
          <ChevronRight size={22} className="text-muted" />
        </Card>
      </Link>

      {/* affinities (interests) */}
      <div className="mt-7 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">Affinities</h2>
        <Link href="/profile/edit" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><Pencil size={14} /> Edit</Link>
      </div>
      {interests.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {interests.map((t) => <Pill key={t} tone="neutral">{t}</Pill>)}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No affinities yet — add a few so we can tune your adventures.</p>
      )}
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

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card hard className="p-4 text-center">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center text-primary">{icon}</div>
      <div className="font-heading text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
    </Card>
  );
}
