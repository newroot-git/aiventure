import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, CalendarDays, MapPin, Award } from "lucide-react";
import { Card, Pill, Button, Avatar } from "@/components/ui";
import { getGroup, type PlanCard } from "@/lib/db";

export default async function GroupDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getGroup(id);
  if (!data) notFound();
  const { group, plans } = data;
  const upcoming = plans.filter((p) => p.status === "upcoming");
  const past = plans.filter((p) => p.status === "past");

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Crew
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-3xl font-bold">{group.name}</h1>
        <p className="mt-1 text-[15px] text-muted">{group.members.length} members</p>
      </div>

      <Card className="mt-5 p-5">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">The crew</div>
        <div className="flex flex-wrap gap-3">
          {group.members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1">
              <Avatar name={m.name} src={m.avatar} size={48} />
              <span className="text-xs font-bold">{m.name}</span>
            </div>
          ))}
        </div>
      </Card>

      <Link href="/new" className="mt-4 block">
        <Button variant="primary" size="lg" className="w-full">
          <Plus size={18} /> Start a plan with {group.name}
        </Button>
      </Link>

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-3 mt-7 text-xs font-bold uppercase tracking-wider text-muted">Coming up</h2>
          <div className="flex flex-col gap-3">{upcoming.map((p) => <GroupPlanRow key={p.slug} plan={p} />)}</div>
        </>
      )}
      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-7 text-xs font-bold uppercase tracking-wider text-muted">Adventures together</h2>
          <div className="flex flex-col gap-3">{past.map((p) => <GroupPlanRow key={p.slug} plan={p} />)}</div>
        </>
      )}
    </div>
  );
}

function GroupPlanRow({ plan }: { plan: PlanCard }) {
  return (
    <Link href={`/p/${plan.slug}`} className="block">
      <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plan.cover} alt="" className="h-36 w-full border-b-2 border-ink/10 object-cover" />
          {plan.adventureNo && (
            <div className="absolute left-3 top-3">
              <Pill tone="accent"><Award size={13} /> Adventure {plan.adventureNo}</Pill>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-heading text-lg font-bold leading-snug">{plan.activity}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {plan.dateLabel}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={13} /> {plan.place}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
