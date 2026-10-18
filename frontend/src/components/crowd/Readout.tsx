// R26 dark-theme component styling
export function Readout({
  label,
  value,
  accent = "signal",
}: {
  label: string;
  value: string | number;
  accent?: "signal" | "amber" | "alert" | "ink";
}) {
  const colorMap: Record<string, string> = {
    signal: "text-cyan-700",
    amber: "text-amber-700",
    alert: "text-rose-600",
    ink: "text-slate-800",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="font-mono text-[11px] uppercase text-slate-500">
        {label}
      </div>
      <div className={`mt-1 font-mono text-2xl tabular-nums ${colorMap[accent]}`}>
        {value}
      </div>
    </div>
  );
}