"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button, Input, Label, Avatar } from "@/components/ui";
import type { Profile } from "@/lib/types";

export default function NewGroup() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [people, setPeople] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/friends", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setPeople(Array.isArray(d.friends) ? d.friends : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function create() {
    if (!name.trim()) {
      setError("Give your group a name.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), memberIds: picked }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't create the group.");
      router.push(d.id ? `/g/${d.id}` : "/groups");
    } catch (e) {
      setError((e as Error)?.message || "Couldn't create the group. Try again.");
      setCreating(false);
    }
  }

  return (
    <div>
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Groups
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">New group</h1>
      <p className="mt-1 text-[15px] text-muted">A crew you do things with often.</p>

      <div className="mt-6">
        <Label>Group name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The boys"
          className="mt-2"
        />
      </div>

      <div className="mt-7">
        <Label>Add people</Label>
        {loading ? (
          <div className="mt-3 flex justify-center text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : people.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-dashed border-line bg-surface p-4 text-sm text-muted">
            Add people you&apos;ve shared plans with. For now, you can create the group with just yourself and add others later.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {people.map((p) => {
              const on = picked.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                    on ? "border-ink bg-surface shadow-hard-sm" : "border-line bg-surface"
                  }`}
                >
                  <Avatar name={p.name} src={p.avatar} size={40} />
                  <span className="flex-1 font-bold">{p.name}</span>
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-md border-2 ${
                      on ? "border-ink bg-success text-white" : "border-line"
                    }`}
                  >
                    {on && <Check size={14} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-md border-2 border-[#c0392b] bg-[#c0392b]/10 px-3 py-2 text-sm font-bold text-[#c0392b]">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        size="lg"
        className="mt-8 w-full"
        disabled={!name.trim() || creating}
        onClick={create}
      >
        {creating ? <Loader2 size={18} className="animate-spin" /> : "Create group"}
      </Button>
    </div>
  );
}
