import Link from "next/link";
import { Check, Circle } from "lucide-react";

const BUILT = [
  "Landing + onboarding (interests)",
  "Create-plan flow with constraints",
  "The Plan micro-site (hero, who's-in, the drop, key info, map)",
  "Vote + lock an option",
  "Completion, with a shareable Adventure card",
  "App shell: Plans, Groups, Profile",
];
const PLANNED = [
  "Real AI Drop via OpenRouter (currently stubbed)",
  "Supabase persistence + auth (currently mock data)",
  "No-install web join with email-for-calendar",
  "Communities (discovery at scale)",
  "Photo upload onto a plan",
  "Stat tracking over time",
];

export default function DevPage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
      <Link href="/profile" className="text-sm font-semibold text-muted">
        Back
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">About this build</h1>

      <Section title="Signature">
        <p className="text-[15px] text-muted">
          Every plan is its own living micro-site, and finishing one gives you a
          shareable Adventure card.
        </p>
      </Section>

      <Section title="Built">
        <ul className="flex flex-col gap-2">
          {BUILT.map((t) => (
            <li key={t} className="flex items-start gap-2 text-[15px]">
              <Check size={17} className="mt-0.5 shrink-0 text-secondary" />
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Planned / stubbed">
        <ul className="flex flex-col gap-2">
          {PLANNED.map((t) => (
            <li key={t} className="flex items-start gap-2 text-[15px] text-muted">
              <Circle size={15} className="mt-1 shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Notes">
        <p className="text-[15px] text-muted">
          MVP for the UCWS Singapore Hackathon (Agent track). Data is mocked; AI
          is wired to OpenRouter but intentionally not live yet. Aesthetic is a
          deliberate placeholder pending a full design pass.
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
