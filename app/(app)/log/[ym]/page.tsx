import Link from "next/link";
import { ArrowLeft, Award, MapPin, CalendarDays, ChevronRight } from "lucide-react";
import { Card, Pill, AvatarStack } from "@/components/ui";
import { getUserPlans, type PlanCard } from "@/lib/db";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function LogMonth({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  const [y, m] = ym.split("-");
  const label = m ? `${MONTHS[+m - 1]} ${y}` : ym;
  const all = await getUserPlans();
  // bucket by the plan's date, or its completion date when it had no fixed day
  const items = all.filter((p) => p.status === "past" && (p.date || p.completedAt || "").startsWith(ym));

  return (
    <div>
      <Link href="/log" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Log
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">{label}</h1>
      <p className="mt-1 text-[15px] text-muted">
        {items.length} adventure{items.length === 1 ? "" : "s"} this month.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((p) => (
          <LogCard key={p.slug} plan={p} />
        ))}
      </div>
    </div>
  );
}

function LogCard({ plan }: { plan: PlanCard }) {
  return (
    <Link href={`/p/${plan.slug}`} className="block">
      <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plan.cover} alt="" className="h-40 w-full border-b-2 border-ink/10 object-cover" />
          {plan.adventureNo && (
            <div className="absolute left-3 top-3">
              <Pill tone="accent">
                <Award size={13} /> Adventure {plan.adventureNo}
              </Pill>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-heading text-lg font-bold leading-snug">{plan.activity}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
            <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> {plan.dateLabel}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={14} /> {plan.place}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <AvatarStack people={plan.members} />
            <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">View <ChevronRight size={15} /></span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
