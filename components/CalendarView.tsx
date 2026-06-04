"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Clock, Repeat } from "lucide-react";
import { Card, Pill, AvatarStack } from "./ui";
import type { PlanCard } from "@/lib/db";

// pull a HH:MM out of a plan (recurrence time, or the tail of its date label)
function timeOf(p: PlanCard): string | null {
  if (p.recurrence?.time) return p.recurrence.time;
  const m = p.dateLabel?.match(/\b(\d{1,2}:\d{2})\b/);
  return m ? m[1] : null;
}
function cadenceLabel(c: string): string {
  return c === "biweekly" ? "Fortnightly" : c === "monthly" ? "Monthly" : "Weekly";
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n: number) => String(n).padStart(2, "0");

export function CalendarView({ plans }: { plans: PlanCard[] }) {
  const byDate = React.useMemo(() => {
    const m: Record<string, PlanCard[]> = {};
    // one-off plans land on their date
    for (const p of plans) if (p.date && !p.recurrence) (m[p.date] ??= []).push(p);
    // recurring plans repeat across a window (−4 wks … +26 wks)
    const recur = plans.filter((p) => p.recurrence);
    if (recur.length) {
      const start = new Date();
      start.setDate(start.getDate() - 28);
      for (let i = 0; i < 210; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        for (const p of recur) {
          const r = p.recurrence!;
          let hit = false;
          if (r.cadence === "monthly") {
            hit = d.getDate() === (r.monthday ?? 1);
          } else if (r.weekday === d.getDay()) {
            if (r.cadence === "biweekly" && r.anchor) {
              const anchor = new Date(r.anchor);
              const weeks = Math.round((d.getTime() - anchor.getTime()) / (7 * 864e5));
              hit = weeks % 2 === 0;
            } else hit = true; // weekly
          }
          if (hit) (m[ds] ??= []).push(p);
        }
      }
    }
    return m;
  }, [plans]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const [view, setView] = React.useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = React.useState<string | null>(todayStr);

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
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
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-md border-2 border-line"><ChevronLeft size={18} /></button>
          <span className="font-display text-lg font-bold">{MONTHS[view.m]} {view.y}</span>
          <button onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-md border-2 border-line"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
          {WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const ds = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
            const dayPlans = byDate[ds];
            const isSel = selected === ds;
            const isToday = ds === todayStr;
            if (dayPlans) {
              const cover = dayPlans[0].cover;
              return (
                <button key={i} onClick={() => setSelected(ds)}
                  className={`relative grid aspect-square place-items-center overflow-hidden rounded-md border-2 ${isSel ? "border-primary ring-2 ring-primary" : isToday ? "border-accent ring-2 ring-accent" : "border-ink"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-night/45" />
                  <span className="relative text-sm font-bold text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]">{d}</span>
                  {dayPlans.length > 1 && (
                    <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full border border-ink bg-accent text-[9px] font-bold leading-none text-ink">{dayPlans.length}</span>
                  )}
                  {timeOf(dayPlans[0]) && (
                    <span className="absolute inset-x-0 bottom-0 bg-night/55 text-center text-[8px] font-bold leading-tight text-white">{timeOf(dayPlans[0])}</span>
                  )}
                </button>
              );
            }
            return (
              <button key={i} onClick={() => setSelected(ds)}
                className={`grid aspect-square place-items-center rounded-md border-2 text-sm font-bold transition ${isSel ? "border-ink bg-primary text-white" : isToday ? "border-accent text-primary-deep" : "border-transparent hover:bg-surface-2"}`}>
                {d}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="mt-6">
        {selectedPlans.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedPlans.map((p) => (
              <Link key={p.slug} href={`/p/${p.slug}`} className="block">
                <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.cover} alt="" className="h-32 w-full border-b-2 border-ink/10 object-cover" />
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Pill tone="secondary">{p.groupName}</Pill>
                      {p.recurrence && <Pill tone="primary"><Repeat size={12} /> {cadenceLabel(p.recurrence.cadence)}</Pill>}
                      {timeOf(p) && <span className="inline-flex items-center gap-1 text-sm font-bold text-muted"><Clock size={13} /> {timeOf(p)}</span>}
                    </div>
                    <h3 className="font-heading text-lg font-bold leading-snug">{p.activity}</h3>
                    <div className="mt-1.5 flex items-center gap-1 text-sm text-muted"><MapPin size={14} /> {p.place}</div>
                    <div className="mt-3"><AvatarStack people={p.members} /></div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted">Nothing on this day. <Link href="/new" className="font-bold text-primary underline">Start a plan</Link>.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
