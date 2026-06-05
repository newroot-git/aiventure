"use client";
import * as React from "react";
import Link from "next/link";
import { Compass, Users, CalendarDays, Check, Sparkles, ArrowRight } from "lucide-react";
import { Card, Pill, Button } from "./ui";
import type { CommunityCard, OpenEventCard } from "@/lib/db";
import type { Idea } from "@/lib/ideas";

function Heading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-xl font-bold first:mt-0">{icon} {children}</h2>
  );
}

// fresh things-to-do — each pre-fills the create flow on tap
function IdeaCards({ ideas }: { ideas: Idea[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ideas.map((idea) => (
        <Link key={idea.id} href={`/new?scope=single&intent=${encodeURIComponent(idea.q)}`} className="block">
          <Card hard className="overflow-hidden p-0 transition active:translate-x-1 active:translate-y-1 active:shadow-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/img/cover-${idea.tile}.png`} alt="" className="h-28 w-full border-b-2 border-ink/10 object-cover" />
            <div className="p-4">
              <h3 className="font-heading text-lg font-bold leading-snug">{idea.title}</h3>
              <p className="mt-1 text-sm text-muted">{idea.blurb}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">Plan this <ArrowRight size={14} /></p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function ExploreView({ communities, events, ideas = [] }: { communities: CommunityCard[]; events: OpenEventCard[]; ideas?: Idea[] }) {
  const [joined, setJoined] = React.useState<string[]>([]);
  const toggle = (id: string) => setJoined((j) => (j.includes(id) ? j.filter((x) => x !== id) : [...j, id]));

  const noCommunity = events.length === 0 && communities.length === 0;
  if (noCommunity) {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold">Explore</h1>
        <p className="mt-1 text-[15px] text-muted">Fresh things to do near you — tap one to turn it into a plan.</p>

        <Heading icon={<Sparkles size={20} className="text-primary" />}>Fresh ideas for you</Heading>
        <IdeaCards ideas={ideas} />

        <Card className="mt-8 flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border-2 border-ink bg-secondary-soft text-secondary"><Compass size={22} /></span>
          <div className="min-w-0 text-sm">
            <p className="font-bold">Communities are coming</p>
            <p className="text-muted">Open plans + communities near you will show up here.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Explore</h1>
      <p className="mt-1 text-[15px] text-muted">Fresh things to do, open plans, and communities near you.</p>

      <Heading icon={<Sparkles size={20} className="text-primary" />}>Fresh ideas for you</Heading>
      <IdeaCards ideas={ideas} />

      <Heading icon={<CalendarDays size={20} className="text-accent" />}>Happening near you</Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((op) => (
          <Link key={op.id} href={`/p/${op.slug}`} className="block">
            <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={op.cover} alt="" className="h-32 w-full border-b-2 border-ink/10 object-cover" />
                <div className="absolute left-3 top-3"><Pill tone="secondary"><Users size={12} /> {op.community}</Pill></div>
              </div>
              <div className="p-4">
                <h3 className="font-heading font-bold leading-snug">{op.activity}</h3>
                <div className="mt-1.5 flex flex-wrap gap-x-3 text-sm text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> {op.dateLabel}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-primary">{op.going} going · tap to join</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Heading icon={<Compass size={20} className="text-secondary" />}>Communities near you</Heading>
      <div className="flex flex-col gap-3">
        {communities.map((c) => {
          const on = joined.includes(c.id);
          return (
            <Card key={c.id} className="flex items-center gap-3 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border-2 border-ink bg-success-soft text-success"><Users size={22} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold">{c.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <Pill tone="success">{c.tag}</Pill>
                  <span className="text-sm text-muted">{c.members} members</span>
                </div>
              </div>
              <Button size="sm" variant={on ? "soft" : "primary"} onClick={() => toggle(c.id)}>
                {on ? <><Check size={14} /> Joined</> : "Join"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
