"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, Loader2, Sparkles, Lock } from "lucide-react";
import { Button, Input, Wordmark } from "@/components/ui";
import { PixelScene } from "@/components/PixelScene";
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

  // a real session must win — drop any leftover guest cookie so it can't mask it
  const go = () => {
    document.cookie = "av_uid=; Path=/; Max-Age=0; SameSite=Lax";
    router.push("/plans");
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

  async function judge() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/guest", { method: "POST" });
      if (!res.ok) throw new Error("Couldn't start a guest session");
      go();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <main className="flex flex-1 flex-col">
      <PixelScene className="min-h-[34vh] rounded-b-2xl">
        <div className="flex min-h-[34vh] flex-col items-center justify-center px-6 text-center text-white">
          <Wordmark className="text-4xl" onAccent />
          <p className="mt-2 font-semibold text-white/85">Get out of the group chat.</p>
        </div>
      </PixelScene>

      <section className="mx-auto w-full max-w-sm px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
          <ArrowLeft size={15} /> Back
        </Link>

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

        {error && <p className="mt-3 text-sm font-bold text-[#c0392b]">{error}</p>}

        <div className="mt-8 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>
        <Button variant="soft" size="lg" className="mt-4 w-full" disabled={busy} onClick={judge}>
          <Sparkles size={17} /> I&apos;m a judge — explore the demo
        </Button>
        <p className="mt-2 text-center text-xs text-muted">Jumps you in as a guest. No email needed.</p>
      </section>
    </main>
  );
}
