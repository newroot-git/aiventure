"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Search, Plus, X } from "lucide-react";
import { Button, Input, SelectTag, Label, Avatar } from "@/components/ui";
import {
  SETTINGS,
  categoriesFor,
  searchInterests,
  type Setting,
} from "@/lib/interests";

const STEPS = ["name", "setting", "categories", "specifics"] as const;

export default function Onboard() {
  return (
    <React.Suspense>
      <OnboardFlow />
    </React.Suspense>
  );
}

function OnboardFlow() {
  const router = useRouter();
  const invite = useSearchParams().get("invite");
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [setting, setSetting] = React.useState<Setting | null>(null);
  const [cats, setCats] = React.useState<string[]>([]);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");

  const available = setting ? categoriesFor(setting) : [];
  const chosenCats = available.filter((c) => cats.includes(c.id));
  const results = searchInterests(query, interests);

  const valid = [
    name.trim().length > 0,
    setting !== null,
    cats.length > 0,
    interests.length > 0,
  ][step];

  function pickSetting(s: Setting) {
    setSetting(s);
    // prune categories no longer available for this setting
    const ids = new Set(categoriesFor(s).map((c) => c.id));
    setCats((prev) => prev.filter((id) => ids.has(id)));
  }
  function next() {
    if (step < STEPS.length - 1) return setStep((s) => s + 1);
    try {
      localStorage.setItem(
        "aiventure_profile",
        JSON.stringify({ name, setting, categories: cats, interests }),
      );
    } catch {}
    router.push(invite ? `/p/${invite}` : "/welcome");
  }
  function back() {
    if (step === 0) router.push("/");
    else setStep((s) => s - 1);
  }
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-1 flex-col px-5 py-6">
      {/* progress */}
      <div className="flex items-center gap-3">
        <button onClick={back} className="text-muted">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full border-2 border-ink/10 ${
                i <= step ? "bg-primary" : "bg-surface-2"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-muted">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <div className="flex-1 pt-8">
        {/* STEP 0 — name */}
        {step === 0 && (
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight">
              First up — who are you?
            </h1>
            <p className="mt-2 text-[15px] text-muted">Just a name to get started.</p>
            <div className="mt-8 flex items-center gap-3">
              <Avatar name={name || "?"} size={52} />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* STEP 1 — setting */}
        {step === 1 && (
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight">
              Where do you feel at home?
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              This shapes what we suggest — you can mix it up anytime.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {SETTINGS.map((s) => {
                const on = setting === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => pickSetting(s.id)}
                    className={`flex items-center justify-between rounded-xl border-2 p-5 text-left transition ${
                      on ? "border-ink bg-surface shadow-hard" : "border-line bg-surface"
                    }`}
                  >
                    <div>
                      <div className="font-display text-xl font-bold">{s.label}</div>
                      <div className="text-sm text-muted">{s.desc}</div>
                    </div>
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-md border-2 ${
                        on ? "border-ink bg-success text-white" : "border-line"
                      }`}
                    >
                      {on && <Check size={16} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2 — categories (filtered by setting) */}
        {step === 2 && (
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight">
              What are you into?
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              Pick the broad stuff — we&apos;ll get specific next.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {available.map((c) => {
                const on = cats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(cats, setCats, c.id)}
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      on ? "border-ink bg-primary text-white shadow-hard" : "border-line bg-surface"
                    }`}
                  >
                    <div className="font-bold leading-tight">{c.label}</div>
                    <div className={`mt-1 text-xs ${on ? "text-white/80" : "text-muted"}`}>
                      {c.interests.length} things
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3 — specifics (suggested + search) */}
        {step === 3 && (
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight">Get specific</h1>
            <p className="mt-2 text-[15px] text-muted">
              Tap suggestions, or search for anything.
            </p>

            {/* search */}
            <div className="mt-5">
              <div className="flex items-center gap-2 rounded-md border-2 border-line bg-surface px-3 focus-within:border-primary">
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
            </div>

            {/* picks */}
            {interests.length > 0 && (
              <div className="mt-5">
                <Label>Your picks ({interests.length})</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {interests.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggle(interests, setInterests, t)}
                      className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-primary px-3 py-1.5 text-sm font-bold text-white"
                    >
                      {t} <X size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* search results OR suggested-by-category */}
            <div className="mt-6">
              {query.trim() ? (
                results.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {results.map((t) => (
                      <SelectTag
                        key={t}
                        selected={interests.includes(t)}
                        onClick={() => toggle(interests, setInterests, t)}
                      >
                        {t}
                      </SelectTag>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      toggle(interests, setInterests, query.trim());
                      setQuery("");
                    }}
                    className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-surface px-4 py-2 text-sm font-bold shadow-hard-sm"
                  >
                    <Plus size={15} /> Add “{query.trim()}”
                  </button>
                )
              ) : (
                <div className="flex flex-col gap-6">
                  {chosenCats.map((c) => (
                    <div key={c.id}>
                      <Label>{c.label}</Label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {c.interests.map((t) => (
                          <SelectTag
                            key={t}
                            selected={interests.includes(t)}
                            onClick={() => toggle(interests, setInterests, t)}
                          >
                            {t}
                          </SelectTag>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="sticky bottom-0 -mx-5 mt-6 border-t-2 border-line bg-bg/95 px-5 py-4 backdrop-blur">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!valid}
          onClick={next}
        >
          {step === STEPS.length - 1 ? "That's me" : "Continue"}
        </Button>
      </div>
    </main>
  );
}
