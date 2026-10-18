"use client";
// R26 dark-theme component styling

export function AlarmBanner({
  count,
  threshold,
  muted,
  onStop,
}: {
  count: number;
  threshold: number;
  muted: boolean;
  onStop: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
        muted
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
          : "border-rose-500/40 bg-rose-500/10 text-rose-600"
      }`}
    >
      <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            muted ? "bg-amber" : "bg-rose-500 animate-blink"
          }`}
        />
        {muted
          ? `Alarm silenced — still ${count} / ${threshold}`
          : `Threshold exceeded — ${count} / ${threshold}`}
      </span>
      {!muted && (
        <button
          onClick={onStop}
          className="rounded-md border border-rose-500/50 px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-rose-600 transition-colors hover:bg-rose-500/10"
        >
          Stop alarm
        </button>
      )}
    </div>
  );
}