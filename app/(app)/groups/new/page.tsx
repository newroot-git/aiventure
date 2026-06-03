"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button, Input, Label, Avatar } from "@/components/ui";
import { MOCK_PEOPLE } from "@/lib/mock";

export default function NewGroup() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <div>
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm font-bold text-muted">
        <ArrowLeft size={15} /> Groups
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">New group</h1>
      <p className="mt-1 text-[15px] text-muted">A crew you do things with often.</p>

      <div className="mt-6">
        <Label>Group name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The boys"
          className="mt-2"
        />
      </div>

      <div className="mt-7">
        <Label>Add people</Label>
        <div className="mt-3 flex flex-col gap-2">
          {MOCK_PEOPLE.map((p) => {
            const on = picked.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                  on ? "border-ink bg-surface shadow-hard-sm" : "border-line bg-surface"
                }`}
              >
                <Avatar name={p.name} size={40} />
                <span className="flex-1 font-bold">{p.name}</span>
                <span
                  className={`grid h-6 w-6 place-items-center rounded-md border-2 ${
                    on ? "border-ink bg-success text-white" : "border-line"
                  }`}
                >
                  {on && <Check size={14} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        className="mt-8 w-full"
        disabled={!name || picked.length === 0}
        onClick={() => router.push("/groups")}
      >
        Create group
      </Button>
    </div>
  );
}
