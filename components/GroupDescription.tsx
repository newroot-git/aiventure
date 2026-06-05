"use client";
import * as React from "react";
import { Pencil, Check, Loader2 } from "lucide-react";
import { Button } from "./ui";

// Editable "what's this crew for" blurb. Owner can add/edit; others just read it.
export function GroupDescription({ groupId, initial, isOwner }: { groupId: string; initial: string; isOwner: boolean }) {
  const [desc, setDesc] = React.useState(initial);
  const [val, setVal] = React.useState(initial);
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/groups", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId, description: val.trim() }),
      });
      if (res.ok) { setDesc(val.trim()); setEditing(false); }
    } finally { setBusy(false); }
  }

  if (editing) {
    return (
      <div className="mt-3">
        <textarea
          autoFocus value={val} maxLength={280} rows={3}
          onChange={(e) => setVal(e.target.value)}
          placeholder="What's this crew for? e.g. weekend hikes and the occasional pub."
          className="w-full rounded-xl border-2 border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-primary"
        />
        <div className="mt-2 flex gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={save}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
          </Button>
          <Button variant="soft" size="sm" onClick={() => { setEditing(false); setVal(desc); }}>Cancel</Button>
        </div>
      </div>
    );
  }
  if (!desc) {
    return isOwner ? (
      <button onClick={() => setEditing(true)} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">
        <Pencil size={13} /> Add a description
      </button>
    ) : null;
  }
  return (
    <div className="mt-2 flex items-start gap-2">
      <p className="flex-1 text-[15px] leading-relaxed text-ink/80">{desc}</p>
      {isOwner && (
        <button onClick={() => { setVal(desc); setEditing(true); }} aria-label="Edit description" className="shrink-0 text-muted transition hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}
