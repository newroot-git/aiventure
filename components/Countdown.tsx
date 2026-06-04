"use client";
import * as React from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { d, h, m };
}

function Unit({ v, label }: { v: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-num text-3xl font-extrabold leading-none text-white">
        {String(v).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
        {label}
      </span>
    </div>
  );
}

export function Countdown({
  slug,
  activity,
  cover,
  place,
  targetISO,
  who,
}: {
  slug: string;
  activity: string;
  cover: string;
  place: string;
  targetISO: string;
  who?: string;
}) {
  const target = new Date(targetISO).getTime();
  const [t, setT] = React.useState(() => diff(target));

  React.useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 30000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <Link href={`/p/${slug}`} className="block">
      <div className="relative overflow-hidden rounded-xl border-2 border-ink shadow-hard transition active:scale-[0.99]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-night/90 via-night/70 to-night/40" />
        <div className="relative p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Next adventure
          </span>
          <h3 className="mt-1 font-heading text-xl font-extrabold leading-tight text-white">
            {activity}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-white/75">
            <span className="inline-flex items-center gap-1"><MapPin size={13} /> {place}</span>
            {who && <span className="inline-flex items-center gap-1"><Users size={13} /> {who}</span>}
          </div>
          <div className="mt-4 flex items-center gap-4">
            <Unit v={t.d} label="days" />
            <span className="font-num text-2xl text-white/40">:</span>
            <Unit v={t.h} label="hrs" />
            <span className="font-num text-2xl text-white/40">:</span>
            <Unit v={t.m} label="min" />
            <span className="ml-auto inline-flex items-center gap-1 rounded-md border-2 border-white/30 bg-white/10 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              <CalendarDays size={14} /> View
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
