"use client";
import * as React from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Check } from "lucide-react";
import { Button, Input, Wordmark } from "@/components/ui";
import { PixelScene } from "@/components/PixelScene";

export default function SignIn() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);

  return (
    <main className="flex flex-1 flex-col">
      <PixelScene className="min-h-[34vh] rounded-b-2xl">
        <div className="flex min-h-[34vh] flex-col items-center justify-center px-6 text-center text-white">
          <Wordmark className="text-4xl" onAccent />
          <p className="mt-2 font-semibold text-white/85">Welcome back, adventurer.</p>
        </div>
      </PixelScene>

      <section className="mx-auto w-full max-w-sm px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
          <ArrowLeft size={15} /> Back
        </Link>

        {sent ? (
          <div className="mt-8 rounded-xl border-2 border-ink bg-surface p-6 text-center shadow-hard">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-md border-2 border-ink bg-success-soft text-success">
              <Check size={24} />
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold">Check your email</h1>
            <p className="mt-2 text-[15px] text-muted">
              We sent a magic link to <b className="text-ink">{email}</b>. Tap it to
              jump straight in — no password.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm font-bold text-primary underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="font-display text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-[15px] text-muted">
              One tap. We&apos;ll email you a magic link — no passwords here.
            </p>
            <div className="mt-6 space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!email.includes("@")}
                onClick={() => setSent(true)}
              >
                <Mail size={18} /> Send magic link
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              New here?{" "}
              <Link href="/onboard" className="font-bold text-primary underline">
                Set up your profile
              </Link>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
