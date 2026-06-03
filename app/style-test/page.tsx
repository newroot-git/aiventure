import type { Metadata } from "next";

export const metadata: Metadata = { title: "AIventure — style cohesion test" };

const SUBJECTS = [
  ["hike", "Sunset hike"], ["pub", "Country pub"], ["climb", "Climbing crags"],
  ["field", "Wheat field"], ["cabin", "Lake cabin"], ["beach", "Sunset cove"],
  ["town", "Hillside town"], ["forest", "Pine forest"], ["cafe", "Street cafe"],
  ["gig", "Open-air gig"], ["valley", "River valley"], ["picnic", "Meadow picnic"],
];

const STYLE =
  "Lush highly-detailed pixel-art landscape, 32-bit pixel art with fine dithering + smooth gradients (not chunky low-res), vibrant saturated colours, dramatic cumulus-cloud sky, golden-hour atmospheric light, layered hazy depth, wildflowers, serene cosy Ghibli-inspired mood.";

export default function StyleTest() {
  return (
    <main className="min-h-dvh bg-night px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-4xl font-bold">
          One style, twelve subjects
        </h1>
        <p className="mt-2 max-w-2xl text-white/60">
          Lush detailed pixel-art landscapes, all from the same locked prompt — to prove the
          style holds cohesion across varied scenes.
        </p>
        <p className="mt-3 rounded-xl border-2 border-white/10 bg-white/5 p-4 font-mono text-xs leading-relaxed text-white/50">
          {STYLE}
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map(([id, label]) => (
            <div key={id}>
              <div className="overflow-hidden rounded-xl border-2 border-white/10 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img/styletest/${id}.png`} alt={label} className="aspect-square w-full object-cover" />
              </div>
              <div className="mt-2 font-display text-lg font-bold">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
