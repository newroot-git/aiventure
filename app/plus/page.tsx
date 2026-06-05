"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Zap, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui";
import { PixelScene } from "@/components/PixelScene";

const PERKS = [
  "Unlimited AI drops — real plans, on tap",
  "Deeper personalisation from your crew's history",
  "Trip mode — multi-day adventures",
  "One Plus member unlocks AI for everyone on a plan",
  "Your full adventure stats over time",
];

const PLANS = [
  { id: "year", label: "Yearly", price: "£29.99", sub: "£2.50/mo · save 40%", best: true },
  { id: "month", label: "Monthly", price: "£3.99", sub: "billed monthly", best: false },
];

export default function PlusPage() {
  const [plan, setPlan] = React.useState("year");
  const [gotcha, setGotcha] = React.useState(false);

  return (
    <main className="flex flex-1 flex-col">
      <PixelScene image="/img/cover-gig.png" className="min-h-[30vh] rounded-b-2xl">
        <div className="flex min-h-[30vh] flex-col items-center justify-center px-6 text-center text-white">
          <span className="inline-flex items-center gap-2 rounded-md border-2 border-white/25 bg-black/25 px-3 py-1 font-display text-sm font-bold text-accent backdrop-blur-sm">
            <Zap size={14} /> AIventure+
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold drop-shadow">Pay to Win</h1>
          <p className="mt-2 font-display text-sm font-bold text-white/85">Unlock the full power-up.</p>
        </div>
      </PixelScene>

      <section className="mx-auto w-full max-w-sm px-6 py-8">
        <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
          <ArrowLeft size={15} /> Back
        </Link>

        <ul className="mt-6 space-y-3">
          {PERKS.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink bg-accent-soft text-[#8a6512] shadow-hard-sm">
                <Sparkles size={13} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-7 space-y-3">
          {PLANS.map((p) => {
            const active = plan === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPlan(p.id)}
                className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                  active ? "border-ink bg-surface shadow-hard" : "border-line bg-surface"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold">{p.label}</span>
                    {p.best && (
                      <span className="rounded-md border-2 border-ink bg-accent px-2 py-0.5 text-xs font-bold text-ink">
                        Best value
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted">{p.sub}</div>
                </div>
                <div className="font-display text-xl font-bold">{p.price}</div>
              </button>
            );
          })}
        </div>

        {gotcha ? (
          <div className="mt-6 rounded-xl border-2 border-ink bg-accent-soft p-5 text-center shadow-hard">
            <span className="inline-grid h-12 w-12 place-items-center rounded-md border-2 border-ink bg-accent text-ink shadow-hard-sm">
              <PartyPopper size={24} />
            </span>
            <p className="mt-3 font-display text-xl font-bold">Just kidding!</p>
            <p className="mt-1 text-sm text-muted">
              No payments accepted at this time. It&apos;s all free — go have an adventure. (The Plus stuff really is coming; we&apos;ll never spring a charge on you.)
            </p>
            <Link href="/plans"><Button variant="primary" className="mt-4">Back to your plans</Button></Link>
          </div>
        ) : (
          <>
            <Button variant="primary" size="lg" className="mt-6 w-full" onClick={() => setGotcha(true)}>
              <Zap size={18} /> Pay to Win
            </Button>
            <p className="mt-3 text-center text-xs text-muted">
              Tap it. We dare you.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
