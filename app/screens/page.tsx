import type { Metadata } from "next";

export const metadata: Metadata = { title: "AIventure — all screens" };

type Status = "live" | "stub" | "todo";
interface Screen {
  label: string;
  route?: string;
  status: Status;
  note?: string;
}
interface Group {
  title: string;
  blurb: string;
  screens: Screen[];
}

const GROUPS: Group[] = [
  {
    title: "1 · Entry & onboarding",
    blurb: "First touch — from a shared link or an ad, into the app.",
    screens: [
      { label: "Landing", route: "/", status: "live" },
      { label: "Onboarding — categorized", route: "/onboard", status: "live" },
      { label: "Welcome — build your crew", route: "/welcome", status: "live", note: "scratch signup lands here" },
      { label: "Sign in (magic link)", route: "/signin", status: "live" },
    ],
  },
  {
    title: "2 · The core app",
    blurb: "The logged-in shell: plans, groups, the create flow.",
    screens: [
      { label: "Plans — home", route: "/plans", status: "live" },
      { label: "Adventure log", route: "/log", status: "live", note: "collapsed behind the log pile on home" },
      { label: "Calendar", route: "/calendar", status: "live" },
      { label: "New — scope picker", route: "/new", status: "live", note: "surprise / one thing / adventure / trip" },
      { label: "Explore — discover communities/plans", route: "/explore", status: "live" },
      { label: "Crew — friends/groups/nudges", route: "/groups", status: "live" },
      { label: "Send a nudge", route: "/nudge", status: "live" },
      { label: "Invites inbox", route: "/invites", status: "live" },
      { label: "Group detail", route: "/g/the-boys", status: "live" },
      { label: "New group", route: "/groups/new", status: "live" },
    ],
  },
  {
    title: "3 · The Plan (the atom)",
    blurb: "Every plan is its own living micro-site. The heart of the product.",
    screens: [
      { label: "Plan micro-site (single)", route: "/p/wild-otter-42", status: "live" },
      { label: "Adventure (itinerary)", route: "/a/epic-saturday", status: "live", note: "multi-activity day / trip" },
      { label: "Completion — Adventure card", route: "/p/wild-otter-42", status: "live", note: "tap 'Mark as done'" },
    ],
  },
  {
    title: "4 · You & settings",
    blurb: "Profile, the adventure record, monetisation.",
    screens: [
      { label: "Profile", route: "/profile", status: "live" },
      { label: "Edit profile / interests", route: "/profile/edit", status: "live" },
      { label: "Go Plus (paywall)", route: "/plus", status: "live", note: "one paid member empowers a plan" },
      { label: "About this build", route: "/dev", status: "live" },
    ],
  },
];

const STATUS_STYLE: Record<Status, string> = {
  live: "bg-success-soft text-success",
  stub: "bg-accent-soft text-[#9a6b00]",
  todo: "bg-surface-2 text-muted",
};
const STATUS_LABEL: Record<Status, string> = {
  live: "Live",
  stub: "Stub",
  todo: "To build",
};

export default function ScreensPage() {
  const counts = GROUPS.flatMap((g) => g.screens).reduce(
    (a, s) => ((a[s.status] = (a[s.status] ?? 0) + 1), a),
    {} as Record<Status, number>,
  );

  return (
    <main className="min-h-dvh bg-night px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="font-display text-4xl font-bold">
            AI<span className="text-accent">venture</span> — all screens
          </h1>
          <p className="mt-2 max-w-2xl text-white/60">
            Every screen, laid out in context. Click into any frame to use it
            live. We work each one individually from here.
          </p>
          <div className="mt-4 flex gap-2 text-sm font-semibold">
            <span className="rounded-full bg-success-soft px-3 py-1 text-success">
              {counts.live ?? 0} live
            </span>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-ink">
              {counts.todo ?? 0} to build
            </span>
          </div>
        </header>

        {GROUPS.map((g) => (
          <section key={g.title} className="mb-12">
            <h2 className="font-heading text-xl font-bold">{g.title}</h2>
            <p className="mb-5 text-sm text-white/50">{g.blurb}</p>
            <div className="flex flex-wrap gap-6">
              {g.screens.map((s, i) => (
                <Frame key={s.label + i} screen={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Frame({ screen }: { screen: Screen }) {
  return (
    <div className="w-[274px]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold">{screen.label}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[screen.status]}`}
        >
          {STATUS_LABEL[screen.status]}
        </span>
      </div>

      <div
        className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-surface shadow-2xl"
        style={{ width: 274, height: 580 }}
      >
        {screen.route ? (
          <iframe
            src={screen.route}
            title={screen.label}
            style={{
              width: 390,
              height: 825,
              border: 0,
              transform: "scale(0.7026)",
              transformOrigin: "top left",
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 border-2 border-dashed border-line p-6 text-center">
            <span className="font-heading text-lg font-bold text-ink">
              {screen.label}
            </span>
            <span className="text-sm text-muted">Not built yet</span>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
        {screen.route ? (
          <a href={screen.route} className="font-mono underline" target="_blank">
            {screen.route}
          </a>
        ) : (
          <span className="font-mono">—</span>
        )}
      </div>
      {screen.note && (
        <p className="mt-1 text-xs text-white/40">{screen.note}</p>
      )}
    </div>
  );
}
