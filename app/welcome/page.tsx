"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, Plus, Users, Compass } from "lucide-react";
import { Card, Pill, Button, Avatar } from "@/components/ui";

const CONTACTS = ["Conor", "Jack", "Sam", "Mia", "Tom", "Priya"];
const COMMUNITIES = [
  { name: "London Trail Runners", members: "1.2k", tag: "Running" },
  { name: "City Boulderers", members: "840", tag: "Climbing" },
  { name: "Board Game Nights", members: "610", tag: "Games" },
  { name: "Sunday Roast Club", members: "430", tag: "Food" },
];

export default function Welcome() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [added, setAdded] = React.useState<string[]>([]);
  const [joined, setJoined] = React.useState<string[]>([]);

  // Read the locally-stored profile once on mount (localStorage is client-only,
  // so this must happen in an effect rather than during render).
  React.useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("aiventure_profile") || "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (p.name) setName(p.name);
    } catch {}
  }, []);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-8">
      <h1 className="font-display text-3xl font-bold leading-tight">
        You&apos;re in{name ? `, ${name}` : ""}.
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        AIventure is better with your people. Add a few and join what&apos;s
        happening near you.
      </p>

      {/* add friends */}
      <section className="mt-7">
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h2 className="font-display text-lg font-bold">Add your crew</h2>
        </div>
        <Button variant="soft" className="w-full">
          <UserPlus size={17} /> Sync your contacts
        </Button>
        <div className="mt-3 flex flex-col gap-2">
          {CONTACTS.map((c) => {
            const on = added.includes(c);
            return (
              <div
                key={c}
                className="flex items-center gap-3 rounded-xl border-2 border-line bg-surface p-3"
              >
                <Avatar name={c} size={40} />
                <span className="flex-1 font-bold">{c}</span>
                <button
                  onClick={() => toggle(added, setAdded, c)}
                  className={`inline-flex items-center gap-1 rounded-md border-2 px-3 py-1.5 text-sm font-bold transition ${
                    on
                      ? "border-ink bg-success text-white"
                      : "border-ink bg-surface shadow-hard-sm"
                  }`}
                >
                  {on ? <Check size={14} /> : <Plus size={14} />}
                  {on ? "Added" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* communities */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Compass size={18} className="text-secondary" />
          <h2 className="font-display text-lg font-bold">Communities near you</h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {COMMUNITIES.map((co) => {
            const on = joined.includes(co.name);
            return (
              <Card key={co.name} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{co.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Pill tone="secondary">{co.tag}</Pill>
                    <span className="text-sm text-muted">{co.members} members</span>
                  </div>
                </div>
                <button
                  onClick={() => toggle(joined, setJoined, co.name)}
                  className={`shrink-0 rounded-md border-2 px-3 py-1.5 text-sm font-bold transition ${
                    on ? "border-ink bg-success text-white" : "border-ink bg-surface shadow-hard-sm"
                  }`}
                >
                  {on ? "Joined" : "Join"}
                </button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTAs */}
      <div className="mt-9 flex flex-col gap-3">
        <Button variant="primary" size="lg" onClick={() => router.push("/new")}>
          Start your first plan
        </Button>
        <Button variant="soft" onClick={() => router.push("/plans")}>
          {added.length || joined.length ? "Done — go home" : "Skip for now"}
        </Button>
      </div>
    </main>
  );
}
