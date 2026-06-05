import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { Card } from "@/components/ui";
import { BadgeMedal } from "@/components/BadgeMedal";
import { splitBadges, BADGES } from "@/lib/badges";
import { getUserPlans, getUserGroups, getCurrentProfile } from "@/lib/db";

export default async function BadgesPage() {
  const [me, plans, groups] = await Promise.all([
    getCurrentProfile(), getUserPlans(), getUserGroups(),
  ]);
  const stats = {
    adventures: plans.filter((p) => p.status === "past").length,
    crews: groups.length,
    interests: me?.interests?.length ?? 0,
  };
  const { earned } = splitBadges(stats);

  return (
    <div>
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Profile
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-md border-2 border-ink bg-accent-soft text-[#8a6512] shadow-hard-sm"><Trophy size={24} /></span>
        <div>
          <h1 className="font-display text-3xl font-bold">Badges</h1>
          <p className="text-[15px] text-muted">{earned.length} of {BADGES.length} earned.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {BADGES.map((b) => {
          const got = b.got(stats);
          return (
            <Card key={b.id} hard={got} className={`flex items-center gap-4 p-4 ${got ? "" : "opacity-70"}`}>
              <BadgeMedal badge={b} got={got} />
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold">{b.label}</h3>
                <p className="text-sm text-muted">{got ? "Earned" : b.how}</p>
              </div>
              {got && <span className="rounded-md border-2 border-ink bg-success-soft px-2 py-0.5 text-xs font-bold text-success">Got it</span>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
