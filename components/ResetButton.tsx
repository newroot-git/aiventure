"use client";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "./ui";

export function ResetButton() {
  const router = useRouter();
  function reset() {
    try {
      localStorage.clear();
    } catch {}
    router.push("/");
  }
  return (
    <Button variant="soft" onClick={reset}>
      <RotateCcw size={16} /> Reset app
    </Button>
  );
}
