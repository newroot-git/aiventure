// Suspense fallback for every (app) route. The layout chrome (sidebar / header /
// bottom nav) persists; this fills the page body the instant a navigation starts,
// so clicks feel alive instead of freezing on the old page until the server replies.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden="true">
      {/* page title + subtitle */}
      <div className="space-y-2.5">
        <div className="h-8 w-44 rounded-lg bg-surface-2" />
        <div className="h-4 w-64 rounded bg-surface-2" />
      </div>
      {/* hero / feature card */}
      <div className="h-44 w-full rounded-2xl border-2 border-line bg-surface-2" />
      {/* list rows */}
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface-2 p-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-line/60" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-line/60" />
              <div className="h-3 w-1/3 rounded bg-line/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
