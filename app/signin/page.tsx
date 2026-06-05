"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, Loader2, Sparkles, Lock } from "lucide-react";
import { Button, Input, Wordmark } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "password" | "code";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("password");
  const [step, setStep] = React.useState<"enter" | "code">("enter");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [verifyType, setVerifyType] = React.useState<"email" | "signup">("email");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showReal, setShowReal] = React.useState(false);
  const [demoName, setDemoName] = React.useState("");

  // a real session must win — drop any leftover guest cookie so it can't mask it,
  // then route new accounts (no interests yet) into onboarding.
  const go = async (clearGuest = true) => {
    // real sign-in must drop any leftover guest cookie so it can't mask the session;
    // the "I'm a judge" flow KEEPS its fresh guest cookie (that cookie IS its identity).
    if (clearGuest) document.cookie = "av_uid=; Path=/; Max-Age=0; SameSite=Lax";
    let dest = "/plans";
    try {
      const me = await fetch("/api/me").then((r) => r.json());
      if (me?.needsOnboard) dest = "/onboard";
    } catch {}
    router.push(dest);
    router.refresh();
  };

  async function passwordSignIn() {
    if (!email.trim() || !password) return;
    setBusy(true); setError("");
    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      go();
    } catch (e) {
      setError((e as Error).message || "Couldn't sign in");
    } finally { setBusy(false); }
  }

  async function passwordCreate() {
    if (!email.trim() || password.length < 6) { setError("Pick a password of at least 6 characters."); return; }
    setBusy(true); setError("");
    try {
      const { data, error } = await supabaseBrowser().auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      if (data.session) { go(); return; } // email confirmation off → straight in
      setVerifyType("signup"); setStep("code"); // confirm once with a code, then password works
    } catch (e) {
      setError((e as Error).message || "Couldn't create account");
    } finally { setBusy(false); }
  }

  async function sendCode() {
    if (!email.trim()) return;
    setBusy(true); setError("");
    try {
      const { error } = await supabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
      setVerifyType("email"); setStep("code");
    } catch (e) {
      setError((e as Error).message || "Couldn't send the code");
    } finally { setBusy(false); }
  }

  async function verify() {
    if (code.trim().length < 6) return;
    setBusy(true); setError("");
    try {
      const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: verifyType });
      if (error) throw error;
      go();
    } catch (e) {
      setError((e as Error).message || "That code didn't work");
    } finally { setBusy(false); }
  }

  async function createDemo() {
    if (!demoName.trim()) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/demo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: demoName.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Couldn't create a demo account"); }
      go(false); // keep the demo cookie; go() routes into onboarding to pick interests
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto mt-6 w-full max-w-md px-5">
        <div className="rounded-xl border-[3px] border-ink bg-night p-2 shadow-hard">
          <div className="flex items-center gap-1.5 px-1 pb-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="ml-auto font-display text-[10px] uppercase tracking-wider text-white/50">AIventure</span>
          </div>
          <div className="relative overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/hero-cliff-3.png" alt="" className="block aspect-[16/10] w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/75 to-transparent p-3 text-center text-white">
              <Wordmark className="text-2xl" onAccent />
              <p className="text-[13px] font-semibold text-white/85">Get out of the group chat.</p>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-md px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
          <ArrowLeft size={15} /> Back
        </Link>

        {showReal ? (
        <>
        {step === "code" ? (
          <div className="mt-6">
            <h1 className="font-display text-2xl font-bold">Enter your code</h1>
            <p className="mt-1 text-[15px] text-muted">We sent a code to <b className="text-ink">{email}</b>.</p>
            <Input
              inputMode="numeric" autoFocus maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              placeholder="Enter code"
              className="mt-4 text-center font-num text-2xl tracking-[0.3em]"
            />
            <Button variant="primary" size="lg" className="mt-3 w-full" disabled={busy || code.length < 6} onClick={verify}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : null} Verify & jump in
            </Button>
            <button onClick={() => { setStep("enter"); setCode(""); setError(""); }} className="mt-3 text-sm font-bold text-primary underline">
              Back
            </button>
          </div>
        ) : mode === "password" ? (
          <div className="mt-6">
            <h1 className="font-display text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-[15px] text-muted">Email + password. Quick — no code each time.</p>
            <Input type="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="mt-4" />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && passwordSignIn()} placeholder="Password" className="mt-2" />
            <Button variant="primary" size="lg" className="mt-3 w-full" disabled={busy || !email.trim() || !password} onClick={passwordSignIn}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={17} />} Sign in
            </Button>
            <Button variant="soft" size="lg" className="mt-2 w-full" disabled={busy || !email.trim() || password.length < 6} onClick={passwordCreate}>
              Create account
            </Button>
            <button onClick={() => { setMode("code"); setError(""); }} className="mt-3 text-sm font-bold text-primary underline">
              Email me a code instead
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <h1 className="font-display text-2xl font-bold">Sign in with a code</h1>
            <p className="mt-1 text-[15px] text-muted">Pop in your email — we&apos;ll send a code. No password.</p>
            <Input type="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendCode()} placeholder="you@email.com" className="mt-4" />
            <Button variant="primary" size="lg" className="mt-3 w-full" disabled={busy || !email.trim()} onClick={sendCode}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} Email me a code
            </Button>
            <button onClick={() => { setMode("password"); setError(""); }} className="mt-3 text-sm font-bold text-primary underline">
              Use a password instead
            </button>
          </div>
        )}
        <button onClick={() => { setShowReal(false); setError(""); }} className="mt-5 text-sm font-bold text-primary underline">
          Back to the quick demo
        </button>
        </>
        ) : (
          <div className="mt-6">
            <h1 className="font-display text-2xl font-bold">Try AIventure</h1>
            <p className="mt-1 text-[15px] text-muted">A demo account, ready to go — a crew, a plan and an adventure already set up. Just pick a name.</p>
            <Input autoFocus value={demoName} onChange={(e) => setDemoName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createDemo()} placeholder="Your name" className="mt-4" />
            <Button variant="primary" size="lg" className="mt-3 w-full" disabled={busy || !demoName.trim()} onClick={createDemo}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} That&apos;s me — jump in
            </Button>
            <p className="mt-2 text-center text-xs text-muted">No email, no install. Set up in seconds.</p>
            <button onClick={() => { setShowReal(true); setError(""); }} className="mt-5 text-sm font-bold text-primary underline">
              I already have an account
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-bold text-[#c0392b]">{error}</p>}
      </section>
    </main>
  );
}
