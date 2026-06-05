import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import { Tile } from "@/components/Tile";
import { getUserPlans, type PlanCard } from "@/lib/db";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthKey(d: string) {
  return d.slice(0, 7); // yyyy-mm
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MONTHS[+m - 1]} ${y}`;
}

export default async function LogPage() {
  const all = await getUserPlans();
  const past = all.filter((p) => p.status === "past" && p.date);

  // group by month, newest first
  const groups: Record<string, PlanCard[]> = {};
  for (const p of past) (groups[monthKey(p.date)] ??= []).push(p);
  const keys = Object.keys(groups).sort().reverse();

  return (
    <div>
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Profile
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <Tile name="log" className="h-16 w-16 border-2 border-ink" />
        <div>
          <h1 className="font-display text-3xl font-bold">Adventure log</h1>
          <p className="text-[15px] text-muted">
            {past.length} adventures, across {keys.length} month{keys.length === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {keys.map((k) => {
          const items = groups[k];
          return (
            <Link key={k} href={`/log/${k}`} className="block">
              <Card hard className="flex items-center gap-4 p-4 transition active:translate-x-1 active:translate-y-1 active:shadow-none">
                <Tile name={items[0].tile} className="h-16 w-16 shrink-0 border-2 border-ink" />
                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold">{monthLabel(k)}</h3>
                  <p className="text-sm text-muted">
                    {items.length} adventure{items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronRight size={22} className="text-muted" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
