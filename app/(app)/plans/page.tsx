import Link from "next/link";
import { MapPin, CalendarDays, ChevronRight, Sparkles, Users, Lock, Plus, Mail, Hand, Compass } from "lucide-react";
import { Card, Pill, AvatarStack, Button } from "@/components/ui";
import { Countdown } from "@/components/Countdown";
import { LocalDateTime } from "@/components/LocalDateTime";
import { getUserPlans, getCurrentProfile, getInvites, getNudges, getOpenEvents, type PlanCard } from "@/lib/db";

export default async function HomePage() {
  const [plans, me, invites, nudges, openEvents] = await Promise.all([
    getUserPlans(), getCurrentProfile(), getInvites(), getNudges(), getOpenEvents(),
  ]);
  const upcoming = plans.filter((p) => p.status === "upcoming");
  const next = upcoming.find((p) => p.date);
  const rest = upcoming.filter((p) => p.slug !== next?.slug);

  const names = next ? next.members.map((m) => m.name).filter((n) => n && n !== me?.name) : [];
  const nextWho = next
    ? next.groupName && next.groupName !== "You"
      ? `with ${next.groupName}`
      : names.length
        ? "with " + (names.length <= 2 ? names.join(" & ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`)
        : undefined
    : undefined;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Hey {me?.name ?? "there"}</h1>
      <p className="mt-1 text-[15px] text-muted">Here&apos;s what&apos;s happening.</p>

      {next && (
        <div className="mt-5">
          <Countdown slug={next.slug} activity={next.activity} cover={next.cover} place={next.place} targetISO={next.startsAtISO || `${next.date}T16:00:00`} who={nextWho} />
        </div>
      )}

      {/* first-run — no plans yet */}
      {plans.length === 0 && (
        <Card hard className="mt-6 p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep"><Compass size={26} /></span>
          <h2 className="mt-4 font-display text-2xl font-bold">No plans yet. Let&apos;s fix that.</h2>
          <p className="mx-auto mt-2 max-w-xs text-[15px] text-muted">
            Start something — a hike, a dinner, a whole adventure. We&apos;ll do the legwork.
          </p>
          <Link href="/new" className="mt-5 inline-block">
            <Button variant="primary" size="lg"><Plus size={18} /> Start a plan</Button>
          </Link>
        </Card>
      )}

      {/* for you — inbox (only when there's actually something here) */}
      {(invites.length > 0 || nudges.length > 0) && (
        <>
          <h2 className="mt-7 mb-3 text-xs font-bold uppercase tracking-wider text-muted">For you</h2>
          <div className="flex flex-col gap-2">
            {invites.map((iv) => (
              <Link key={iv.id} href="/invites" className="block">
                <Card className="flex items-center gap-3 p-3 transition active:scale-[0.99]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-ink bg-secondary-soft text-secondary"><Mail size={20} /></span>
                  <div className="min-w-0 flex-1 text-sm"><b>{iv.fromLabel}</b> invited you · <span className="text-muted">{iv.activity}</span></div>
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </Card>
              </Link>
            ))}
            {nudges.length > 0 && (
              <Link href="/groups">
                <Card className="flex items-center gap-3 p-3 transition active:scale-[0.99]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep"><Hand size={20} /></span>
                  <div className="min-w-0 flex-1 text-sm">
                    <b>{nudges.length} nudge{nudges.length > 1 ? "s" : ""}</b> waiting · <span className="text-muted">tap to respond</span>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </Card>
              </Link>
            )}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 text-xs font-bold uppercase tracking-wider text-muted">Also coming up</h2>
          <div className="grid gap-3 sm:grid-cols-2">{rest.map((p) => <PlanRow key={p.slug} plan={p} />)}</div>
        </>
      )}

      {/* around you — placeholder discovery */}
      {/* around you — discovery hidden until real community plans exist (see #7) */}
      {openEvents.length > 0 && (
        <>
          <h2 className="mt-7 mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
            <Sparkles size={14} className="text-primary" /> Around you
          </h2>
          <p className="mb-3 text-sm text-muted">Open plans near you, picked for your interests.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {openEvents.map((op) => (
              <Link key={op.id} href={`/p/${op.slug}`} className="block">
                <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={op.cover} alt="" className="h-32 w-full border-b-2 border-ink/10 object-cover" />
                    <div className="absolute left-3 top-3"><Pill tone="secondary"><Users size={12} /> {op.community}</Pill></div>
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
        </>
      )}
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
          <div className="absolute left-3 top-3"><Pill tone="secondary">{plan.groupName}</Pill></div>
          {plan.phase === "locked" ? (
            <div className="absolute right-3 top-3"><Pill tone="success"><Lock size={12} /> Locked in</Pill></div>
          ) : plan.phase === "open" ? (
            <div className="absolute right-3 top-3"><Pill tone="accent"><Sparkles size={12} /> Planning</Pill></div>
          ) : null}
        </div>
        <div className="p-4">
          <h3 className="font-heading text-lg font-bold leading-snug">{plan.activity}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> <LocalDateTime iso={plan.startsAtISO} /></span>
            <span className="inline-flex items-center gap-1"><MapPin size={14} /> {plan.place}</span>
          </div>
          <div className="mt-3"><AvatarStack people={plan.members} /></div>
        </div>
      </Card>
    </Link>
  );
}
