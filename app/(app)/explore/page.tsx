"use client";
import * as React from "react";
import Link from "next/link";
import { Compass, Users, CalendarDays, Check, Sparkles, Search } from "lucide-react";
import { Card, Pill, Button } from "@/components/ui";
import { MOCK_COMMUNITIES, MOCK_OPEN } from "@/lib/mock";

function Heading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-xl font-bold first:mt-0">
      {icon} {children}
    </h2>
  );
}

export default function ExplorePage() {
  const [joined, setJoined] = React.useState<string[]>([]);
  const toggle = (id: string) =>
    setJoined((j) => (j.includes(id) ? j.filter((x) => x !== id) : [...j, id]));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Explore</h1>
      <p className="mt-1 text-[15px] text-muted">
        Find communities, open plans, and things to get in on near you.
      </p>

      {/* search */}
      <div className="mt-5 flex items-center gap-2 rounded-md border-2 border-line bg-surface px-3 focus-within:border-primary">
        <Search size={18} className="text-muted" />
        <input
          placeholder="Search communities, activities, places…"
          className="w-full bg-transparent py-3 text-[15px] outline-none placeholder:text-muted"
        />
      </div>

      {/* suggested for you */}
      <Heading icon={<Sparkles size={20} className="text-primary" />}>For your interests</Heading>
      <div className="grid gap-3 sm:grid-cols-2">
        {MOCK_OPEN.map((op) => (
          <Link key={op.id} href={`/p/${op.slug}`} className="block">
            <Card hard className="overflow-hidden p-0 transition active:scale-[0.99]">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={op.cover} alt="" className="h-32 w-full border-b-2 border-ink/10 object-cover" />
                <div className="absolute left-3 top-3">
                  <Pill tone="secondary" className="border-2 border-ink/10">
                    <Users size={12} /> {op.community}
                  </Pill>
                </div>
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

      {/* communities */}
      <Heading icon={<Compass size={20} className="text-secondary" />}>Communities near you</Heading>
      <div className="flex flex-col gap-3">
        {MOCK_COMMUNITIES.map((c) => {
          const on = joined.includes(c.id);
          return (
            <Card key={c.id} className="flex items-center gap-3 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md border-2 border-ink/10 bg-success-soft text-success">
                <Users size={22} />
              </span>
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
