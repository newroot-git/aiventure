"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui";

type ConfirmOpts = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};
type Pending = ConfirmOpts & { resolve: (ok: boolean) => void };

// Promise-based branded confirm to replace window.confirm().
//   const [confirm, ConfirmHost] = useConfirm();
//   if (!(await confirm({ title: "..." }))) return;
//   ...render {ConfirmHost} once in the tree.
export function useConfirm(): [(o: ConfirmOpts) => Promise<boolean>, React.ReactNode] {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const confirm = React.useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
    [],
  );
  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const host = pending ? <ConfirmDialog {...pending} onClose={close} /> : null;
  return [confirm, host];
}

function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onClose,
}: Pending & { onClose: (ok: boolean) => void }) {
  // top layer — render straight to <body> to escape the app-shell stacking context
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "Enter") onClose(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] grid place-items-center p-5">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => onClose(false)} />
      <div className="relative w-full max-w-sm rounded-xl border-2 border-ink bg-surface p-5 shadow-hard">
        <div className="flex items-start gap-3">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border-2 border-ink shadow-hard ${
              tone === "danger" ? "bg-accent-soft text-[#8a6512]" : "bg-primary-soft text-primary-deep"
            }`}
          >
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-snug">{title}</p>
            {body && <p className="mt-1 text-sm text-muted">{body}</p>}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="soft" className="flex-1" onClick={() => onClose(false)}>
            {cancelLabel}
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => onClose(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
