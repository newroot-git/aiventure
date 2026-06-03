"use client";
import * as React from "react";
import Link from "next/link";
import {
  Users,
  Link2,
  CalendarDays,
  Clock,
  MapPin,
  Lock,
  Sparkles,
  Check,
  Share2,
  HeartHandshake,
  Info,
} from "lucide-react";
import { Pill, Button, AvatarStack } from "./ui";
import { Reveal } from "./motion";
import {
  OptionCard,
  RSVPControl,
  KeyInfoChips,
  MapEmbed,
  AdventureCard,
} from "./plan";
import type { Plan, PlanOption, PlanMember, RSVP } from "@/lib/types";

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
function fmtTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function googleCalUrl(plan: Plan) {
  if (!plan.starts_at) return "#";
  const start = new Date(plan.starts_at);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: plan.activity ?? plan.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: plan.why ?? "",
    location: plan.place_address ?? plan.place_name ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/* labelled section block — the consistent layout unit */
function Section({
  icon,
  label,
  tone = "primary",
  children,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "primary" | "secondary" | "accent" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const toneCls = {
    primary: "bg-primary-soft text-primary-deep",
    secondary: "bg-secondary-soft text-secondary",
    accent: "bg-accent-soft text-[#8a6512]",
    success: "bg-success-soft text-success",
  }[tone];
  return (
    <section className={`rounded-xl border-2 border-ink/10 bg-surface p-5 shadow-soft ${className ?? ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-md ${toneCls}`}>
          {icon}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">
          {label}
        </span>
      </div>
      {children}
    </section>
  );
}

export function PlanView({
  plan,
  options,
  members,
}: {
  plan: Plan;
  options: PlanOption[];
  members: PlanMember[];
}) {
  const [rsvp, setRsvp] = React.useState<RSVP>("in");
  const [votes, setVotes] = React.useState<Record<string, number>>(
    Object.fromEntries(options.map((o) => [o.id, o.votes])),
  );
  const [voted, setVoted] = React.useState<Record<string, boolean>>({});
  const [lockedId, setLockedId] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const people = members.map((m) => m.profile ?? { name: "Guest" });

  function vote(id: string) {
    setVoted((v) => {
      const now = !v[id];
      setVotes((vs) => ({ ...vs, [id]: vs[id] + (now ? 1 : -1) }));
      return { ...v, [id]: now };
    });
  }
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
        <p className="mb-5 text-center font-display text-2xl font-bold">
          Adventure logged
        </p>
        <AdventureCard
          number={4}
          activity={plan.activity ?? plan.title}
          place={plan.place_name}
          dateLabel={fmtDate(plan.starts_at)}
          people={people}
          cover={plan.cover_url}
        />
        <div className="mt-5 flex gap-3">
          <Button variant="primary" className="flex-1" onClick={copyLink}>
            <Share2 size={17} /> {copied ? "Copied" : "Share"}
          </Button>
          <Button variant="soft" onClick={() => setCompleted(false)}>
            Back
          </Button>
        </div>
        <Link
          href="/plans"
          className="mt-6 block text-center text-sm font-bold text-muted underline"
        >
          See all your adventures
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
      {/* ---- cover hero ---- */}
      <div className="relative overflow-hidden rounded-xl border-2 border-ink shadow-hard">
        {plan.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plan.cover_url}
            alt={plan.activity ?? plan.title}
            className="h-52 w-full object-cover"
          />
        ) : (
          <div className="aurora h-52 w-full" />
        )}
        <div className="absolute inset-x-0 top-0 flex gap-2 p-3">
          <Pill tone="primary" className="border-2 border-ink/10">
            <Users size={13} />
            {plan.visibility === "group" ? "The boys" : "Invite only"}
          </Pill>
          {plan.ai_empowered && (
            <Pill tone="secondary" className="border-2 border-ink/10">
              <Sparkles size={13} /> AI-planned
            </Pill>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10">
          <h1 className="font-heading text-2xl font-extrabold leading-tight text-white drop-shadow">
            {plan.activity ?? plan.title}
          </h1>
        </div>
      </div>

      {/* ---- when / where ---- */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Section icon={<Clock size={15} />} label="When" tone="accent">
          <div className="font-bold leading-tight">{fmtDate(plan.starts_at) ?? "TBC"}</div>
          {fmtTime(plan.starts_at) && (
            <div className="text-sm text-muted">{fmtTime(plan.starts_at)}</div>
          )}
        </Section>
        <Section icon={<MapPin size={15} />} label="Where" tone="primary">
          <div className="font-bold leading-tight">{plan.place_name ?? "TBC"}</div>
          {plan.place_address && (
            <div className="text-sm text-muted">{plan.place_address}</div>
          )}
        </Section>
      </div>

      {/* map */}
      {(plan.place_lat || plan.place_name) && (
        <div className="mt-3">
          <MapEmbed lat={plan.place_lat} lng={plan.place_lng} query={plan.place_name} />
        </div>
      )}

      {/* ---- who ---- */}
      <div className="mt-4">
        <Section icon={<Users size={15} />} label="Who's in" tone="success">
          <div className="mb-3 flex items-center justify-between">
            <AvatarStack people={people} />
            <span className="text-sm font-bold text-muted">
              {members.filter((m) => m.rsvp === "in").length} going
            </span>
          </div>
          <RSVPControl value={rsvp} onChange={setRsvp} />
        </Section>
      </div>

      {/* ---- why ---- */}
      {plan.why && (
        <div className="mt-4">
          <Section icon={<HeartHandshake size={15} />} label="Why this" tone="secondary">
            <p className="text-[15px] leading-relaxed text-ink/80">{plan.why}</p>
          </Section>
        </div>
      )}

      {/* ---- the drop ---- */}
      {options.length > 0 && !lockedId && (
        <section className="mt-6">
          <h2 className="mb-1 flex items-center gap-1.5 font-display text-xl font-bold">
            <Sparkles size={18} className="text-secondary" /> Ideas
          </h2>
          <p className="mb-3 text-sm text-muted">
            Real spots, tuned to your crew. Vote on what you fancy.
          </p>
          <div className="flex flex-col gap-3">
            {options.map((o, i) => (
              <Reveal key={o.id} delay={i * 0.07}>
                <OptionCard
                  title={o.title}
                  subtitle={o.subtitle}
                  why={o.why}
                  sourceUrl={o.source_url}
                  sourceLabel={o.source_label}
                  votes={votes[o.id]}
                  voted={voted[o.id]}
                  onVote={() => vote(o.id)}
                  onSelect={() => setLockedId(o.id)}
                />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {lockedId && (
        <section className="mt-6">
          <Pill tone="success" className="mb-3">
            <Lock size={14} /> Locked in
          </Pill>
          <OptionCard
            {...(() => {
              const o = options.find((x) => x.id === lockedId)!;
              return {
                title: o.title,
                subtitle: o.subtitle,
                why: o.why,
                sourceUrl: o.source_url,
                sourceLabel: o.source_label,
              };
            })()}
            selected
          />
          <button
            onClick={() => setLockedId(null)}
            className="mt-2 text-sm font-bold text-muted underline"
          >
            Change pick
          </button>
        </section>
      )}

      {/* ---- good to know ---- */}
      {plan.key_info?.length > 0 && (
        <div className="mt-4">
          <Section icon={<Info size={15} />} label="Good to know" tone="accent">
            <KeyInfoChips items={plan.key_info} />
          </Section>
        </div>
      )}

      {/* ---- actions ---- */}
      <section className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <Button variant="soft" className="flex-1" onClick={copyLink}>
            <Link2 size={17} /> {copied ? "Link copied" : "Invite"}
          </Button>
          <a
            href={googleCalUrl(plan)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="soft" className="w-full">
              <CalendarDays size={17} /> Calendar
            </Button>
          </a>
        </div>
        <Button variant="primary" onClick={() => setCompleted(true)}>
          <Check size={18} /> Mark as done — get your Adventure card
        </Button>
      </section>

      <p className="mt-6 text-center text-xs text-muted">
        No app needed — anyone with this link can join.
      </p>
    </div>
  );
}
