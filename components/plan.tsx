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
}) {
  return (
    <Card className={cx("p-5 transition", selected && "ring-2 ring-primary")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-heading text-lg font-bold leading-snug">{title}</h4>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {sourceLabel && (
          <Pill tone="secondary" className="shrink-0">
            <Sparkles size={14} /> {sourceLabel}
          </Pill>
        )}
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

/* ---------- Map embed (no API key needed) ---------- */
export function MapEmbed({
  lat,
  lng,
  query,
}: {
  lat?: number | null;
  lng?: number | null;
  query?: string | null;
}) {
  const q = lat && lng ? `${lat},${lng}` : query ?? "";
  if (!q) return null;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`;
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <iframe
        title="map"
        src={src}
        className="h-44 w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
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
            <Award size={14} /> Adventure {number}
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
