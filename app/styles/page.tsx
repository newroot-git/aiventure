import type { Metadata } from "next";

export const metadata: Metadata = { title: "AIventure — visual styles" };

const STYLES = [
  { id: "pixel-16bit", label: "16-bit Pixel", note: "Current direction — retro game" },
  { id: "flat-vector", label: "Flat Vector", note: "Modern, bold, clean shapes" },
  { id: "painterly", label: "Painterly", note: "Soft storybook illustration" },
  { id: "gouache", label: "Gouache", note: "Hand-painted, textured, cosy" },
  { id: "risograph", label: "Risograph", note: "Screenprint, grainy, 2-3 colours" },
  { id: "lineart", label: "Line-art Badge", note: "Vintage outdoor patch" },
  { id: "lowpoly", label: "Low-poly 3D", note: "Faceted, soft render" },
  { id: "claymation", label: "Claymation", note: "Cute 3D clay" },
];

export default function StylesPage() {
  return (
    <main className="min-h-dvh bg-night px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-4xl font-bold">
          AI<span className="text-accent">venture</span> — pick a visual language
        </h1>
        <p className="mt-2 max-w-2xl text-white/60">
          Same scene (two friends on a sunset hike over a city), eight art styles. Same
          warm earthy palette throughout. Tell me which feels right — or which two to blend.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STYLES.map((s) => (
            <div key={s.id}>
              <div className="overflow-hidden rounded-xl border-2 border-white/10 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img/styles/${s.id}.png`} alt={s.label} className="aspect-square w-full object-cover" />
              </div>
              <div className="mt-2">
                <div className="font-display text-lg font-bold">{s.label}</div>
                <div className="text-sm text-white/50">{s.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
