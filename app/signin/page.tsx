"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button, Input, Wordmark } from "@/components/ui";
import { PixelScene } from "@/components/PixelScene";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SignIn() {
  const router = useRouter();
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function sendCode() {
    if (!email.trim()) return;
    setBusy(true); setError("");
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (error) throw error;
      setStep("code");
    } catch (e) {
      setError((e as Error).message || "Couldn't send the code");
    } finally { setBusy(false); }
  }

  async function verify() {
    if (code.trim().length < 6) return;
    setBusy(true); setError("");
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
      if (error) throw error;
      router.push("/plans");
      router.refresh();
    } catch (e) {
      setError((e as Error).message || "That code didn't work");
    } finally { setBusy(false); }
  }

  async function judge() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/guest", { method: "POST" });
      if (!res.ok) throw new Error("Couldn't start a guest session");
      router.push("/plans");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
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

        {step === "email" ? (
          <div className="mt-6">
            <h1 className="font-display text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-[15px] text-muted">Pop in your email — we&apos;ll send you a code. No password.</p>
            <div className="mt-4">
              <Input
                type="email" inputMode="email" autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                placeholder="you@email.com"
              />
            </div>
            <Button variant="primary" size="lg" className="mt-3 w-full" disabled={busy || !email.trim()} onClick={sendCode}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} Email me a code
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <h1 className="font-display text-2xl font-bold">Enter your code</h1>
            <p className="mt-1 text-[15px] text-muted">We sent a code to <b className="text-ink">{email}</b>.</p>
            <div className="mt-4">
              <Input
                inputMode="numeric" autoFocus maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                placeholder="Enter code"
                className="text-center font-num text-2xl tracking-[0.3em]"
              />
            </div>
            <Button variant="primary" size="lg" className="mt-3 w-full" disabled={busy || code.length < 6} onClick={verify}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : null} Verify & jump in
            </Button>
            <button onClick={() => { setStep("email"); setCode(""); setError(""); }} className="mt-3 text-sm font-bold text-primary underline">
              Use a different email
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
