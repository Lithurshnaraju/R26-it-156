// R26 dark-theme component styling
export function StatusPill({
  crowded,
  label,
}: {
  crowded: boolean;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono uppercase tracking-wide ${
        crowded
          ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
          : "border-cyan-500/40 bg-cyan-500/10 text-cyan-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          crowded ? "bg-rose-500 animate-blink" : "bg-cyan-500"
        }`}
      />
      {label ?? (crowded ? "Crowded" : "Nominal")}
    </span>
  );
}