import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, CalendarDays, MapPin, Award } from "lucide-react";
import { Card, Pill, Button, Avatar } from "@/components/ui";
import { GroupDescription } from "@/components/GroupDescription";
import { getGroup, type PlanCard } from "@/lib/db";

export default async function GroupDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getGroup(id);
  if (!data) notFound();
  const { group, plans, isOwner } = data;
  const upcoming = plans.filter((p) => p.status === "upcoming");
  const past = plans.filter((p) => p.status === "past");

  // banner = the crew's latest adventure cover, else a deterministic scenic one
  const SCENIC = ["trip", "beach", "camp", "park", "hike", "train", "city", "festival"];
  let h = 0; for (const c of group.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const banner = plans[0]?.cover || `/img/cover-${SCENIC[h % SCENIC.length]}.png`;

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Crew
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-ink shadow-hard">
        <div className="relative h-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h1 className="font-display text-2xl font-bold leading-tight text-white drop-shadow">{group.name}</h1>
            <p className="text-sm font-bold text-white/85">{group.members.length} members · {past.length} adventure{past.length === 1 ? "" : "s"} together</p>
          </div>
        </div>
      </div>
      <GroupDescription groupId={group.id} initial={group.description} isOwner={isOwner} />

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

      <Link href={`/new?group=${group.id}`} className="mt-4 block">
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
