"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

export function InviteActions({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | "in" | "out">(null);

  async function respond(rsvp: "in" | "out") {
    setBusy(rsvp);
    try {
      const res = await fetch("/api/plans/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: "rsvp", rsvp }),
      });
      if (!res.ok) throw new Error("failed");
      if (rsvp === "in") router.push(`/p/${slug}`);
      else router.refresh();
    } catch {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 flex gap-2">
      <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => respond("in")}>
        {busy === "in" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Accept
      </Button>
      <Button size="sm" variant="soft" disabled={busy !== null} onClick={() => respond("out")}>
        {busy === "out" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Decline
      </Button>
    </div>
  );
}
