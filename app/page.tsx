import Link from "next/link";
import { MessageCircle, Sparkles, Compass, Award } from "lucide-react";
import { PixelScene } from "@/components/PixelScene";
import { Burst } from "@/components/ui";
import { Reveal } from "@/components/motion";

const STEPS = [
  {
    Icon: MessageCircle,
    title: "Drop an intent",
    body: "“Something with the crew Saturday.” Vague is fine — that's the point.",
  },
  {
    Icon: Sparkles,
    title: "Get a real plan",
    body: "AIventure turns it into a few real, grounded things to actually do.",
  },
  {
    Icon: Compass,
    title: "Go do it",
    body: "Invite the crew by link — no app needed. Then go explore.",
  },
  {
    Icon: Award,
    title: "Keep the memory",
    body: "Mark it done. Get a shareable Adventure card. Build your log.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* pixel title screen */}
      <PixelScene className="min-h-[78vh] rounded-b-2xl">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-24 pt-16 text-center text-white">
          <span className="inline-flex items-center gap-2 rounded-md border-2 border-white/25 bg-black/20 px-3 py-1 text-sm font-bold backdrop-blur-sm">
            <Compass size={15} /> the anti-social-media app
          </span>
          <h1 className="mt-8 font-display text-6xl font-bold leading-none tracking-tight drop-shadow-[3px_3px_0_rgba(0,0,0,0.4)] sm:text-7xl">
            AI<span className="text-accent">venture</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg font-semibold leading-relaxed text-white/90">
            Stop scrolling. Start adventuring. One assistant that gets you and
            your friends out doing real things — and keeps the record.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signin"
              className="press-hard inline-flex h-13 items-center justify-center rounded-md border-2 border-ink bg-accent px-8 text-base font-bold text-ink shadow-hard"
            >
              Get started
            </Link>
            <Link
              href="/signin"
              className="press-hard inline-flex h-13 items-center justify-center rounded-md border-2 border-white/40 bg-white/10 px-8 text-base font-bold text-white backdrop-blur-sm"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-white/70">
            Free to join any plan. No download required.
          </p>
        </section>
      </PixelScene>

      {/* how it works */}
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <h2 className="mb-6 flex items-center justify-center gap-3 text-center font-display text-2xl font-bold">
          <Burst size={18} className="text-primary" />
          How it works
          <Burst size={18} className="text-secondary" />
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <Card3 step={i + 1} {...s} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="aurora grain mt-10 overflow-hidden rounded-xl border-2 border-ink p-8 text-center text-white shadow-hard">
            <p className="font-display text-2xl font-bold drop-shadow-[2px_2px_0_rgba(0,0,0,0.4)]">
              “We should hang out more.”
            </p>
            <p className="mt-2 text-[15px] font-semibold text-white/90">
              Stop saying it. Just hang out.{" "}
              <Link href="/signin" className="font-bold text-accent underline">
                Get started
              </Link>
            </p>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

function Card3({
  step,
  Icon,
  title,
  body,
}: {
  step: number;
  Icon: typeof MessageCircle;
  title: string;
  body: string;
}) {
  return (
    <div className="h-full rounded-xl border-2 border-ink bg-surface p-6 shadow-hard">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-md border-2 border-ink bg-primary-soft text-primary-deep">
          <Icon size={22} />
        </span>
        <span className="font-display text-lg font-bold text-muted">0{step}</span>
      </div>
      <h3 className="mt-4 font-heading text-xl font-bold">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
