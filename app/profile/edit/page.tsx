"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Plus, X, Loader2 } from "lucide-react";
import { Button, Input, Textarea, SelectTag, Label, Avatar } from "@/components/ui";
import { searchInterests } from "@/lib/interests";

export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [homeArea, setHomeArea] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/me", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        setName(d.name ?? "");
        setPicked(Array.isArray(d.interests) ? d.interests : []);
        setNotes(d.interest_notes ?? "");
        setHomeArea(d.home_area ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const toggle = (t: string) =>
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const results = searchInterests(query, picked);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, interests: picked, interest_notes: notes, home_area: homeArea }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Couldn't save your profile.");
      }
      router.push("/profile");
    } catch (e) {
      setError((e as Error)?.message || "Couldn't save your profile. Try again.");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-6">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Profile
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">Edit profile</h1>

      {loading ? (
        <div className="mt-10 flex justify-center text-muted">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-3">
            <Avatar name={name || "?"} size={56} />
            <div className="flex-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
            </div>
          </div>

          <div className="mt-7">
            <Label>Where you&apos;re based</Label>
            <Input
              value={homeArea}
              onChange={(e) => setHomeArea(e.target.value)}
              className="mt-2"
              placeholder="Town or city — e.g. Cape Town"
            />
          </div>

          <div className="mt-7">
            <Label>What you&apos;re into</Label>

            <div className="mt-3 flex items-center gap-2 rounded-md border-2 border-line bg-surface px-3 focus-within:border-primary">
              <Search size={18} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything — bouldering, ramen, karaoke…"
                className="w-full bg-transparent py-3 text-[15px] outline-none placeholder:text-muted"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted">
                  <X size={18} />
                </button>
              )}
            </div>

            {query.trim() && (
              <div className="mt-3">
                {results.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {results.map((t) => (
                      <SelectTag key={t} selected={picked.includes(t)} onClick={() => toggle(t)}>
                        {t}
                      </SelectTag>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => { toggle(query.trim()); setQuery(""); }}
                    className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-surface px-4 py-2 text-sm font-bold shadow-hard-sm"
                  >
                    <Plus size={15} /> Add &ldquo;{query.trim()}&rdquo;
                  </button>
                )}
              </div>
            )}

            {picked.length > 0 && (
              <div className="mt-4">
                <Label>Your picks ({picked.length})</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {picked.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggle(t)}
                      className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-primary px-3 py-1.5 text-sm font-bold text-white"
                    >
                      {t} <X size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-7">
            <Label>More about you</Label>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              placeholder="Favourite spots, what you'd never do, how far you'll travel…"
            />
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-md border-2 border-[#c0392b] bg-[#c0392b]/10 px-3 py-2 text-sm font-bold text-[#c0392b]">
              {error}
            </p>
          )}

          <div className="mt-8 flex gap-3">
            <Button variant="soft" className="flex-1" disabled={saving} onClick={() => router.push("/profile")}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" disabled={saving || !name.trim()} onClick={save}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : "Save"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
