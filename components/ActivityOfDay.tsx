"use client";
import * as React from "react";
import Link from "next/link";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "./ui";
import type { Idea } from "@/lib/ideas";

// A fun "activity of the day" on the home screen — dismissible (per day, via localStorage).
// dayKey is passed from the server so SSR + first client render agree (no hydration flash).
export function ActivityOfDay({ idea, dayKey }: { idea: Idea; dayKey: string }) {
  const [hidden, setHidden] = React.useState(true); // hidden until we've checked localStorage
  React.useEffect(() => {
    setHidden(localStorage.getItem("aiventure_aotd") === dayKey);
  }, [dayKey]);
  if (hidden) return null;
  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.setItem("aiventure_aotd", dayKey);
    setHidden(true);
  };
  return (
    <Card hard className="relative mt-5 overflow-hidden p-0">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md border-2 border-ink bg-black/40 text-white">
        <X size={15} />
      </button>
      <Link href={`/new?scope=single&intent=${encodeURIComponent(idea.q)}`} className="block transition active:translate-x-1 active:translate-y-1 active:shadow-none">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/img/cover-${idea.tile}.png`} alt="" className="h-32 w-full border-b-2 border-ink/10 object-cover" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md border-2 border-ink bg-accent px-2 py-0.5 text-xs font-bold text-ink shadow-hard-sm">
            <Sparkles size={12} /> Activity of the day
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-heading text-lg font-bold leading-snug">{idea.title}</h3>
          <p className="mt-1 text-sm text-muted">{idea.blurb}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">Plan this <ArrowRight size={14} /></p>
        </div>
      </Link>
    </Card>
  );
}
