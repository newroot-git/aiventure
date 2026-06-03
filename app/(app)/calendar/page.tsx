"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Card, Pill, AvatarStack } from "@/components/ui";
import { MOCK_PLANS, type PlanSummary } from "@/lib/mock";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n: number) => String(n).padStart(2, "0");

const byDate: Record<string, PlanSummary[]> = {};
for (const p of MOCK_PLANS) (byDate[p.date] ??= []).push(p);

export default function CalendarPage() {
  // start on the month with the upcoming plan (June 2026)
  const [view, setView] = React.useState({ y: 2026, m: 5 });
  const [selected, setSelected] = React.useState<string | null>("2026-06-06");

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Mon-start
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(dir: number) {
    setView((v) => {
      const m = v.m + dir;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  }

  const selectedPlans = selected ? byDate[selected] ?? [] : [];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Calendar</h1>
      <p className="mt-1 text-[15px] text-muted">Every plan, on its day.</p>

      <Card hard className="mt-5 p-4">
        {/* month header */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-md border-2 border-line">
            <ChevronLeft size={18} />
          </button>
          <span className="font-display text-lg font-bold">
            {MONTHS[view.m]} {view.y}
          </span>
          <button onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-md border-2 border-line">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* weekday row */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="py-1">{d}</div>
          ))}
        </div>

        {/* days */}
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const ds = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
            const plans = byDate[ds];
            const isSel = selected === ds;

            if (plans) {
              const tile = plans[0].tile;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(ds)}
                  className={`relative grid aspect-square place-items-center overflow-hidden rounded-md border-2 ${
                    isSel ? "border-primary ring-2 ring-primary" : "border-ink"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/img/tiles/${tile}.png`}
                    alt=""
                    className="pixelated absolute inset-0 h-full w-full scale-[1.04] object-cover"
                  />
                  <div className="absolute inset-0 bg-night/45" />
                  <span className="relative text-sm font-bold text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]">
                    {d}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={i}
                onClick={() => setSelected(ds)}
                className={`grid aspect-square place-items-center rounded-md border-2 text-sm font-bold transition ${
                  isSel ? "border-ink bg-primary text-white" : "border-transparent hover:bg-surface-2"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Card>

      {/* selected day plans */}
      <div className="mt-6">
        {selectedPlans.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedPlans.map((p) => (
              <Link key={p.slug} href={`/p/${p.slug}`} className="block">
                <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.cover} alt="" className="h-32 w-full border-b-2 border-ink/10 object-cover" />
                  <div className="p-4">
                    <Pill tone="secondary" className="mb-2">{p.groupName}</Pill>
                    <h3 className="font-heading text-lg font-bold leading-snug">{p.activity}</h3>
                    <div className="mt-1.5 flex items-center gap-1 text-sm text-muted">
                      <MapPin size={14} /> {p.place}
                    </div>
                    <div className="mt-3">
                      <AvatarStack people={p.members} />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted">
              Nothing on this day.{" "}
              <Link href="/new" className="font-bold text-primary underline">
                Start a plan
              </Link>
              .
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
