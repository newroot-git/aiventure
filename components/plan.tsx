"use client";
import * as React from "react";
import {
  Sparkles,
  Heart,
  Check,
  HelpCircle,
  X,
  MapPin,
  CalendarDays,
  Award,
} from "lucide-react";
import { Card, Pill, Button, Avatar } from "./ui";
import { Stars } from "./atmosphere";
import type { KeyInfo, RSVP } from "@/lib/types";

function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------- OptionCard: an AI Drop result / suggestion to vote on ---------- */
export function OptionCard({
  title,
  subtitle,
  why,
  sourceUrl,
  sourceLabel,
  votes = 0,
  voted,
  onVote,
  selected,
  onSelect,
  onDelete,
}: {
  title: string;
  subtitle?: string | null;
  why?: string | null;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  votes?: number;
  voted?: boolean;
  onVote?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Card className={cx("p-5 transition", selected && "ring-2 ring-primary")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-heading text-lg font-bold leading-snug">{title}</h4>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {sourceLabel && (
            <Pill tone="secondary">
              <Sparkles size={14} /> {sourceLabel}
            </Pill>
          )}
          {onDelete && (
            <button onClick={onDelete} aria-label="Remove" className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-[#c0392b]">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {why && <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{why}</p>}

      <div className="mt-4 flex items-center gap-2">
        {onVote && (
          <Button variant={voted ? "secondary" : "soft"} size="sm" onClick={onVote}>
            <Heart size={15} className={voted ? "fill-current" : ""} /> Keen
            {votes > 0 && <b className="ml-0.5">{votes}</b>}
          </Button>
        )}
        {onSelect && (
          <Button variant="primary" size="sm" onClick={onSelect}>
            Lock this in
          </Button>
        )}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm font-semibold text-sky underline"
          >
            View
          </a>
        )}
      </div>
    </Card>
  );
}

/* ---------- RSVP control ---------- */
const RSVP_OPTS: { value: RSVP; label: string; Icon: typeof Check }[] = [
  { value: "in", label: "I'm in", Icon: Check },
  { value: "maybe", label: "Maybe", Icon: HelpCircle },
  { value: "out", label: "Can't", Icon: X },
];

export function RSVPControl({
  value,
  onChange,
}: {
  value?: RSVP;
  onChange?: (v: RSVP) => void;
}) {
  return (
    <div className="flex gap-2">
      {RSVP_OPTS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange?.(o.value)}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold transition active:scale-95 border",
              active && o.value === "in" && "bg-success text-white border-success shadow-pop",
              active && o.value === "maybe" && "bg-accent text-ink border-accent",
              active && o.value === "out" && "bg-surface-2 text-muted border-line",
              !active && "bg-surface text-ink border-line hover:border-primary/30",
            )}
          >
            <o.Icon size={16} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Key info chips (AI-generated "bring water" etc) ---------- */
export function KeyInfoChips({ items }: { items: KeyInfo[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((k, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium text-ink"
        >
          <Check size={15} className="text-secondary" />
          {k.label}
        </span>
      ))}
    </div>
  );
}

/* ---------- On-brand date + time picker (replaces raw datetime-local) ---------- */
const WK = ["M", "T", "W", "T", "F", "S", "S"];
const MO = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "16:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
const pad2 = (n: number) => String(n).padStart(2, "0");

export function WhenPicker({
  value,
  onChange,
  multiple,
  onPickMany,
}: {
  value?: string | null;
  onChange?: (iso: string) => void;
  multiple?: boolean;
  onPickMany?: (isos: string[]) => void;
}) {
  const init = value ? new Date(value) : null;
  const now = new Date();
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => {
    const d = init ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [day, setDay] = React.useState<number | null>(init ? init.getDate() : null);
  const [time, setTime] = React.useState<string>(init ? `${pad2(init.getHours())}:${pad2(init.getMinutes())}` : "19:00");
  const [picked, setPicked] = React.useState<string[]>([]); // multiple mode

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWk = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(firstWk).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isToday = (d: number) => view.y === now.getFullYear() && view.m === now.getMonth() && d === now.getDate();
  const sameDay = (iso: string, d: number) => {
    const x = new Date(iso);
    return x.getFullYear() === view.y && x.getMonth() === view.m && x.getDate() === d;
  };
  const isPicked = (d: number) => multiple && picked.some((iso) => sameDay(iso, d));

  function shift(dir: number) {
    setView((v) => {
      const m = v.m + dir;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  }
  function isoFor(d: number, t: string) {
    const [h, min] = t.split(":").map(Number);
    return new Date(view.y, view.m, d, h, min).toISOString();
  }
  function clickDay(d: number) {
    if (multiple) {
      // toggle + highlight; nothing is committed until "Done"
      setPicked((p) => (p.some((iso) => sameDay(iso, d)) ? p.filter((iso) => !sameDay(iso, d)) : [...p, isoFor(d, time)]));
    } else {
      setDay(d);
      onChange?.(isoFor(d, time));
    }
  }
  function done() {
    if (multiple) { if (picked.length) onPickMany?.(picked); setPicked([]); }
    setOpen(false);
  }

  const label = multiple
    ? "Add date options"
    : value
      ? new Date(value).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : "Pick a date & time";

  return (
    <div className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md border-2 border-line bg-surface px-3 py-2 text-left text-sm font-bold text-ink transition hover:border-primary"
      >
        <CalendarDays size={15} className="text-primary" />
        <span className="truncate">{label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-night/30" onClick={done} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-ink bg-surface p-4 shadow-hard">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-md border-2 border-line text-ink hover:border-primary">‹</button>
              <span className="font-display text-base font-bold">{MO[view.m]} {view.y}</span>
              <button type="button" onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-md border-2 border-line text-ink hover:border-primary">›</button>
            </div>
            {multiple && <p className="mb-2 text-center text-xs font-bold text-muted">Tap the days that work — then Done.</p>}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-muted">
              {WK.map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {cells.map((d, i) =>
                d === null ? <div key={i} /> : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => clickDay(d)}
                    className={cx(
                      "grid aspect-square place-items-center rounded-md border-2 text-sm font-bold transition",
                      (multiple ? isPicked(d) : day === d)
                        ? "border-ink bg-primary text-white"
                        : isToday(d)
                          ? "border-primary text-primary-deep"
                          : "border-transparent text-ink hover:bg-surface-2",
                    )}
                  >
                    {d}
                  </button>
                ),
              )}
            </div>
            <div className="mt-4 border-t-2 border-line pt-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">Time{multiple ? " (applies to days you tap next)" : ""}</div>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTime(t); if (!multiple && day) onChange?.(isoFor(day, t)); }}
                    className={cx(
                      "rounded-md border-2 px-3 py-1.5 text-sm font-bold transition",
                      time === t ? "border-ink bg-secondary text-white" : "border-line text-ink hover:border-secondary",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="primary" size="md" className="mt-4 w-full" onClick={done}>
              {multiple ? (picked.length ? `Add ${picked.length} date${picked.length > 1 ? "s" : ""}` : "Done") : (day ? "Done" : "Pick a day")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- The signature: completion Adventure card ---------- */
export function AdventureCard({
  number,
  activity,
  place,
  dateLabel,
  people,
  cover,
}: {
  number: number;
  activity: string;
  place?: string | null;
  dateLabel?: string | null;
  people: { name?: string }[];
  cover?: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-ink p-7 text-white shadow-hard">
      {cover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/45 to-night/30" />
        </>
      ) : (
        <div className="aurora absolute inset-0" />
      )}
      <Stars className="opacity-70" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-white/25 bg-black/25 px-3 py-1 font-display text-sm font-bold uppercase tracking-wide text-accent backdrop-blur-sm">
            <Award size={14} /> Adventure <span className="font-num">{number}</span>
          </span>
        </div>

        <h3 className="mt-7 font-heading text-3xl font-extrabold leading-tight drop-shadow-sm">
          {activity}
        </h3>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-white/85">
          {place && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} /> {place}
            </span>
          )}
          {dateLabel && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} /> {dateLabel}
            </span>
          )}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {people.slice(0, 6).map((p, i) => (
                <Avatar key={i} name={p.name} size={34} ring />
              ))}
            </div>
            <span className="text-sm text-white/85">
              {people.length} {people.length === 1 ? "adventurer" : "adventurers"}
            </span>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            AI<span className="text-accent">venture</span>
          </span>
        </div>
      </div>
    </div>
  );
}
