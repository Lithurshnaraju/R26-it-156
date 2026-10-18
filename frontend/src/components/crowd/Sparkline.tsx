// R26 dark-theme component styling
import { TimelinePoint } from "@/crowd/api";

export function Sparkline({
  data,
  threshold,
}: {
  data: TimelinePoint[];
  threshold: number;
}) {
  if (data.length === 0) return null;

  const width = 100; // percentage-based viewBox, scales to container
  const height = 36;
  const maxCount = Math.max(...data.map((d) => d.current_count), threshold, 1);

  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (d.current_count / maxCount) * height;
    return `${x},${y}`;
  });

  const thresholdY = height - (threshold / maxCount) * height;
  const path = `M${points.join(" L")}`;
  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-24 w-full"
    >
      <line
        x1="0"
        y1={thresholdY}
        x2={width}
        y2={thresholdY}
        stroke="#ef4444"
        strokeWidth="0.4"
        strokeDasharray="1.5,1.5"
        opacity="0.6"
        vectorEffect="non-scaling-stroke"
      />
      <path d={areaPath} fill="rgba(6, 182, 212, 0.12)" />
      <path
        d={path}
        fill="none"
        stroke="#06b6d4"
        strokeWidth="0.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
