import * as React from "react";

function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------------- Button (chunky game-UI, hard shadow + press-sink) ---------------- */
type BtnVariant = "primary" | "secondary" | "soft" | "ghost";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-primary text-white border-2 border-ink shadow-hard press-hard",
  secondary: "bg-secondary text-white border-2 border-ink shadow-hard press-hard",
  soft: "bg-surface text-ink border-2 border-ink shadow-hard-sm press-hard",
  ghost: "bg-transparent text-ink hover:bg-surface-2 transition active:scale-95",
};
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[15px]",
  lg: "h-13 px-8 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
}) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-bold disabled:opacity-50",
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Card ---------------- */
export function Card({
  hard,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hard?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-xl border-2 border-ink bg-surface",
        hard ? "shadow-hard" : "shadow-hard-sm",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Pill / Tag ---------------- */
type PillTone = "primary" | "secondary" | "accent" | "sky" | "success" | "neutral";
const PILL_TONE: Record<PillTone, string> = {
  primary: "bg-primary-soft text-primary-deep",
  secondary: "bg-secondary-soft text-secondary",
  accent: "bg-accent-soft text-[#8a6512]",
  sky: "bg-sky-soft text-sky",
  success: "bg-success-soft text-success",
  neutral: "bg-surface-2 text-muted",
};

export function Pill({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: PillTone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md border-2 border-ink px-2.5 py-1 text-sm font-bold",
        PILL_TONE[tone],
        className,
      )}
      {...props}
    />
  );
}

/* Selectable tag (onboarding interests / chips) */
export function SelectTag({
  selected,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        "rounded-md px-4 py-2 text-sm font-bold transition active:scale-95 border-2",
        selected
          ? "bg-primary text-white border-ink shadow-hard-sm"
          : "bg-surface text-ink border-line hover:border-primary",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Avatar (pixel character, no emoji) ----------------
   Default profile photo = a little pixel character silhouette on a per-profile
   colour (deterministic from the name, so it's stable + varied across people).
   A real image src overrides it. */
const AVATAR_COLORS = [
  "#CE3B2A", "#2A56A8", "#2E7B4E", "#D98A2B", "#7A5BA8",
  "#3FA0A0", "#C25B8A", "#B5651D", "#4E6E8E", "#8A6FBF",
  "#D2691E", "#3E8E7E",
];
function colorFor(seed?: string) {
  let h = 0;
  for (const c of seed ?? "?") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// blocky pixel person (head + shoulders), in the brand's pixel style
function PixelPerson({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden style={{ imageRendering: "pixelated" }}>
      <g fill="#ffffff" fillOpacity="0.92">
        <rect x="6" y="2" width="4" height="4" />
        <rect x="3" y="9" width="10" height="6" rx="1" />
        <rect x="5" y="7" width="6" height="3" />
      </g>
    </svg>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  ring,
}: {
  name?: string;
  src?: string | null;
  size?: number;
  ring?: boolean;
}) {
  // only real image paths/URLs render as <img>; otherwise show the pixel character
  const isImg = !!src && (src.startsWith("/") || src.startsWith("http"));
  if (isImg) {
    return (
      <span
        className={cx(
          "inline-block overflow-hidden rounded-md border-2 border-ink",
          ring && "ring-2 ring-surface",
        )}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name ?? ""} className="pixelated h-full w-full scale-[1.12] object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cx(
        "inline-grid place-items-center overflow-hidden rounded-md border-2 border-ink",
        ring && "ring-2 ring-surface",
      )}
      style={{ width: size, height: size, background: colorFor(name) }}
      aria-label={name ?? "profile"}
    >
      <PixelPerson size={Math.round(size * 0.72)} />
    </span>
  );
}

export function AvatarStack({
  people,
  max = 5,
}: {
  // `pending` = invited but not confirmed yet → shown dashed + faded
  people: { name?: string; avatar?: string | null; pending?: boolean }[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((p, i) => (
          // confirmed ("in") sit in FRONT (z-10); not-yet-confirmed are faded + behind
          <div key={i} className={`relative ${p.pending ? "z-0 opacity-45" : "z-10"}`}>
            <Avatar name={p.name} src={p.avatar} size={34} ring />
          </div>
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-2 text-sm font-bold text-muted">+{extra}</span>
      )}
    </div>
  );
}

/* ---------------- Input / Textarea ---------------- */
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-md border-2 border-line bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-muted outline-none focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-md border-2 border-line bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-muted outline-none focus:border-primary resize-none",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Section label ---------------- */
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-wider text-muted">
      {children}
    </div>
  );
}

/* ---------------- Burst (retro star motif) ---------------- */
export function Burst({
  size = 18,
  className,
  points = 8,
}: {
  size?: number;
  className?: string;
  points?: number;
}) {
  const r1 = 50;
  const r2 = 20;
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <polygon points={pts.join(" ")} fill="currentColor" />
    </svg>
  );
}

/* ---------------- Wordmark (pixel display font) ---------------- */
export function Wordmark({
  className,
  onAccent,
}: {
  className?: string;
  onAccent?: boolean;
}) {
  return (
    <span className={cx("font-display font-bold tracking-tight", className)}>
      AI<span className={onAccent ? "text-accent" : "text-primary"}>venture</span>
    </span>
  );
}
