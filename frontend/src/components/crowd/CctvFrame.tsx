"use client";
// R26 dark-theme component styling

import { RefObject } from "react";

export function CctvFrame({
  videoRef,
  canvasRef,
  active,
  live,
  count,
  placeholder,
  muted = true,
}: {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  active: boolean;
  live: boolean;
  count: number | null;
  placeholder: string;
  muted?: boolean;
}) {
  return (
    <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-black">
      <video
        ref={videoRef}
        playsInline
        muted={muted}
        className={active ? "max-h-[560px] w-full object-contain" : "hidden"}
      />
      <canvas
        ref={canvasRef}
        className={
          active ? "pointer-events-none absolute inset-0 h-full w-full" : "hidden"
        }
      />

      {active ? (
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-cyan-500/30 bg-[#070a11]/80 px-2.5 py-1 font-mono text-xs text-cyan-400 backdrop-blur">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              live ? "bg-rose-500 animate-blink" : "bg-slate-500"
            }`}
          />
          {live ? "LIVE" : "PAUSED"} · {count ?? "—"} people
        </div>
      ) : (
        <p className="font-mono text-sm text-slate-500">{placeholder}</p>
      )}
    </div>
  );
}