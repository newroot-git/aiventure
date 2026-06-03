"use client";
import * as React from "react";
import Link from "next/link";
import { Users, Sparkles, Link2, Check, Share2, Clock, MapPin, Route } from "lucide-react";
import { Pill, Button, AvatarStack } from "./ui";
import { Tile } from "./Tile";
import { AdventureCard } from "./plan";
import type { Adventure } from "@/lib/types";

export function AdventureView({ adventure }: { adventure: Adventure }) {
  const [completed, setCompleted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const days = Array.from({ length: adventure.days }, (_, i) => i + 1);
  const byDay = (d: number) =>
    adventure.activities.filter((a) => (a.day ?? 1) === d);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  if (completed) {
    return (
      <div className="mx-auto w-full max-w-lg px-5 py-12">
        <p className="mb-5 text-center font-display text-2xl font-bold">Adventure logged</p>
        <AdventureCard
          number={5}
          activity={adventure.title}
          place={`${adventure.activities.length} activities`}
          dateLabel={adventure.days > 1 ? `${adventure.days} days` : "One big day"}
          people={adventure.members}
          cover={adventure.cover}
        />
        <Button variant="primary" className="mt-5 w-full" onClick={copyLink}>
          <Share2 size={17} /> {copied ? "Copied" : "Share"}
        </Button>
        <Link href="/plans" className="mt-6 block text-center text-sm font-bold text-muted underline">
          See all your adventures
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
      {/* hero */}
      <div className="relative overflow-hidden rounded-xl border-2 border-ink shadow-hard">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={adventure.cover} alt="" className="h-48 w-full object-cover" />
        <div className="absolute inset-x-0 top-0 flex gap-2 p-3">
          <Pill tone="primary" className="border-2 border-ink/10">
            <Route size={13} /> {adventure.scope === "trip" ? `${adventure.days}-day trip` : "Adventure"}
          </Pill>
          {adventure.ai_empowered && (
            <Pill tone="secondary" className="border-2 border-ink/10">
              <Sparkles size={13} /> AI-built
            </Pill>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
          <h1 className="font-heading text-2xl font-extrabold leading-tight text-white drop-shadow">
            {adventure.title}
          </h1>
        </div>
      </div>

      {/* who */}
      <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-ink/10 bg-surface p-4 shadow-soft">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Users size={16} /> {adventure.who}
        </span>
        <AvatarStack people={adventure.members} />
      </div>

      {/* itinerary */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl font-bold">
          <Route size={18} className="text-primary" /> The itinerary
        </h2>
        {days.map((d) => (
          <div key={d} className="mb-5">
            {adventure.days > 1 && (
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                Day {d}
              </div>
            )}
            <div className="relative flex flex-col gap-3 border-l-2 border-dashed border-line pl-5">
              {byDay(d).map((a, i) => (
                <div key={a.id} className="relative">
                  <span className="absolute -left-[27px] top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border-2 border-ink bg-primary text-xs font-bold leading-none text-white">
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-3 rounded-xl border-2 border-ink/10 bg-surface p-3 shadow-soft">
                    <Tile name={a.tile} className="h-16 w-16 shrink-0 border-2 border-ink/10" />
                    <div className="min-w-0 flex-1">
                      {a.time && (
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-muted">
                          <Clock size={11} /> {a.time}
                        </div>
                      )}
                      <h3 className="font-heading font-bold leading-snug">{a.title}</h3>
                      {a.place_name && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted">
                          <MapPin size={12} /> {a.place_name}
                        </div>
                      )}
                      {a.why && <p className="mt-1 text-sm text-ink/70">{a.why}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* actions */}
      <div className="mt-4 flex flex-col gap-3">
        <Button variant="soft" onClick={copyLink}>
          <Link2 size={17} /> {copied ? "Link copied" : "Invite the crew"}
        </Button>
        <Button variant="primary" onClick={() => setCompleted(true)}>
          <Check size={18} /> Mark adventure done
        </Button>
      </div>
    </div>
  );
}
