import Link from "next/link";
import { MapPin, CalendarDays, ChevronRight, Sparkles, Users } from "lucide-react";
import { Card, Pill, AvatarStack } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { getUserPlans, getCurrentProfile, type PlanCard } from "@/lib/db";
import { MOCK_INVITES, MOCK_NUDGES, MOCK_OPEN } from "@/lib/mock";

export default async function HomePage() {
  const [plans, me] = await Promise.all([getUserPlans(), getCurrentProfile()]);
  const upcoming = plans.filter((p) => p.status === "upcoming");
  const next = upcoming.find((p) => p.date);
  const rest = upcoming.filter((p) => p.slug !== next?.slug);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Hey {me?.name ?? "there"}</h1>
      <p className="mt-1 text-[15px] text-muted">Here&apos;s what&apos;s happening.</p>

      {next && (
        <div className="mt-5">
          <Countdown slug={next.slug} activity={next.activity} cover={next.cover} place={next.place} targetISO={`${next.date}T16:00:00`} />
        </div>
      )}

      {/* for you — inbox */}
      <h2 className="mt-7 mb-3 text-xs font-bold uppercase tracking-wider text-muted">For you</h2>
      <div className="flex flex-col gap-2">
        {MOCK_INVITES.map((iv) => (
          <Link key={iv.id} href="/invites" className="block">
            <Card className="flex items-center gap-3 p-3 transition active:scale-[0.99]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/icons/invite.png" alt="" className="pixelated h-10 w-10 shrink-0 rounded-md border-2 border-ink/10 object-cover" />
              <div className="min-w-0 flex-1 text-sm"><b>{iv.fromLabel}</b> invited you · <span className="text-muted">{iv.activity}</span></div>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </Card>
          </Link>
        ))}
        {MOCK_NUDGES.map((n) => (
          <Link key={n.id} href="/groups" className="block">
            <Card className="flex items-center gap-3 p-3 transition active:scale-[0.99]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/icons/nudge.png" alt="" className="pixelated h-10 w-10 shrink-0 rounded-md border-2 border-ink/10 object-cover" />
              <div className="min-w-0 flex-1 text-sm"><b>{n.from.name}</b> nudged you · <span className="text-muted">{n.message}</span></div>
              <ChevronRight size={18} className="shrink-0 text-muted" />
            </Card>
          </Link>
        ))}
      </div>

      {rest.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 text-xs font-bold uppercase tracking-wider text-muted">Also coming up</h2>
          <div className="grid gap-3 sm:grid-cols-2">{rest.map((p) => <PlanRow key={p.slug} plan={p} />)}</div>
        </>
      )}

      {/* around you — placeholder discovery */}
      <h2 className="mt-7 mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
        <Sparkles size={14} className="text-primary" /> Around you
      </h2>
      <p className="mb-3 text-sm text-muted">Open plans near you, picked for your interests.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {MOCK_OPEN.map((op) => (
          <Link key={op.id} href={`/p/${op.slug}`} className="block">
            <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={op.cover} alt="" className="h-32 w-full border-b-2 border-ink/10 object-cover" />
                <div className="absolute left-3 top-3"><Pill tone="secondary" className="border-2 border-ink/10"><Users size={12} /> {op.community}</Pill></div>
              </div>
              <div className="p-4">
                <h3 className="font-heading font-bold leading-snug">{op.activity}</h3>
                <div className="mt-1.5 flex flex-wrap gap-x-3 text-sm text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {op.dateLabel}</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={13} /> {op.place}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-primary">{op.going} going · tap to join</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PlanRow({ plan }: { plan: PlanCard }) {
  return (
    <Link href={`/p/${plan.slug}`} className="block">
      <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plan.cover} alt="" className="h-40 w-full border-b-2 border-ink/10 object-cover" />
          <div className="absolute left-3 top-3"><Pill tone="secondary" className="border-2 border-ink/10">{plan.groupName}</Pill></div>
        </div>
        <div className="p-4">
          <h3 className="font-heading text-lg font-bold leading-snug">{plan.activity}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> {plan.dateLabel}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={14} /> {plan.place}</span>
          </div>
          <div className="mt-3"><AvatarStack people={plan.members} /></div>
        </div>
      </Card>
    </Link>
  );
}
