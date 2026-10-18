"use client";
// R26 dark-theme component styling

export function ThresholdControl({
  threshold,
  onChange,
}: {
  threshold: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <div className="font-mono text-[11px] uppercase text-slate-500">
          Alarm threshold
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          Sound when count exceeds this
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, threshold - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 font-mono text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-800"
          aria-label="Decrease threshold"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          value={threshold}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded-md border border-slate-200 bg-white px-1.5 py-1.5 text-center font-mono text-sm text-slate-800 outline-none focus:border-cyan-500"
        />
        <button
          type="button"
          onClick={() => onChange(threshold + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 font-mono text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-800"
          aria-label="Increase threshold"
        >
          +
        </button>
      </div>
    </div>
  );
}