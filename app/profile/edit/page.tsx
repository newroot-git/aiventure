"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Input, Textarea, SelectTag, Label, Avatar } from "@/components/ui";
import { CURRENT_USER } from "@/lib/mock";

const INTERESTS = [
  "Hiking", "Craft beer", "Gaming", "Golf", "Running", "Film", "Food",
  "Climbing", "Surf", "Photography", "Live music", "Coffee", "Cycling",
  "Art", "Cooking", "Camping", "Kayaking", "Board games", "Books",
  "Swimming", "Comedy", "Nature", "Wine", "Travel",
];

export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = React.useState(CURRENT_USER.name);
  const [picked, setPicked] = React.useState<string[]>(CURRENT_USER.interests);
  const [notes, setNotes] = React.useState(CURRENT_USER.interest_notes ?? "");

  function toggle(t: string) {
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-6">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Profile
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">Edit profile</h1>

      <div className="mt-6 flex items-center gap-3">
        <Avatar name={name || "?"} size={56} />
        <div className="flex-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
        </div>
      </div>

      <div className="mt-7">
        <Label>What you&apos;re into</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map((t) => (
            <SelectTag key={t} selected={picked.includes(t)} onClick={() => toggle(t)}>
              {t}
            </SelectTag>
          ))}
        </div>
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

      <div className="mt-8 flex gap-3">
        <Button variant="soft" className="flex-1" onClick={() => router.push("/profile")}>
          Cancel
        </Button>
        <Button variant="primary" className="flex-1" onClick={() => router.push("/profile")}>
          Save
        </Button>
      </div>
    </main>
  );
}
