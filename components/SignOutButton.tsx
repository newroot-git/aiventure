"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "./ui";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function out() {
    try { await supabaseBrowser().auth.signOut(); } catch {}
    try { await fetch("/api/signout", { method: "POST" }); } catch {}
    router.push("/signin");
    router.refresh();
  }
  return (
    <Button variant="soft" className="w-full" onClick={out}>
      <LogOut size={16} /> Sign out
    </Button>
  );
}
