"use client";
// R26 dark-theme component styling

import { useState } from "react";
import { Dropzone } from "./Dropzone";
import { Readout } from "./Readout";
import { Sparkline } from "./Sparkline";
import { ThresholdControl } from "./ThresholdControl";
import { AlarmBanner } from "./AlarmBanner";
import { useThresholdAlarm } from "./useThresholdAlarm";
import {
  annotatedVideoUrl,
  ApiError,
  detectVideo,
  VideoDetectionResponse,
} from "@/crowd/api";

type BatchStage = "idle" | "uploading" | "processing" | "done";

export function VideoUpload({ defaultThreshold = 20 }: { defaultThreshold?: number }) {
  const [file, setFile] = useState<File | null>(null);

  const [batchStage, setBatchStage] = useState<BatchStage>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoDetectionResponse | null>(null);

  const { threshold, setThreshold, exceeded, muted, stopAlarm } = useThresholdAlarm(
    result?.max_current_count ?? null,
    defaultThreshold
  );

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setBatchError(null);
    setBatchStage("idle");
  };

  // ---------------------------------------------------------------- //
  // Full processing: upload the whole file, wait for the backend to
  // process it, then play back the annotated output video (boxes are
  // already burned into that video server-side).
  // ---------------------------------------------------------------- //
  const runBatch = async () => {
    if (!file) return;
    setBatchError(null);
    setResult(null);
    setBatchStage("uploading");
    setUploadPct(0);
    try {
      const res = await detectVideo(file, (pct) => {
        setUploadPct(pct);
        if (pct >= 100) setBatchStage("processing");
      });
      setResult(res);
      setBatchStage("done");
    } catch (e) {
      setBatchError(
        e instanceof ApiError ? e.message : "Video processing failed. Is the API running?"
      );
      setBatchStage("idle");
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setBatchError(null);
    setBatchStage("idle");
  };

  const batchBusy = batchStage === "uploading" || batchStage === "processing";
  const showTimeline = (result?.timeline.length ?? 0) > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Dropzone accept="video/*" hint="MP4, MOV, or AVI" onFile={handleFile} fileName={file?.name} />

        <p className="text-xs text-slate-500">
          Uploads and processes the whole file, then gives you a downloadable
          annotated video.
        </p>

        <ThresholdControl threshold={threshold} onChange={setThreshold} />

        <div className="flex gap-2">
          <button
            onClick={runBatch}
            disabled={!file || batchBusy}
            className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {batchStage === "uploading"
              ? `Uploading ${uploadPct}%`
              : batchStage === "processing"
              ? "Processing video…"
              : "Run detection"}
          </button>
          {(file || result) && !batchBusy && (
            <button
              onClick={reset}
              className="rounded-lg border border-slate-200 px-4 py-2.5 font-mono text-sm text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
          )}
        </div>

        {batchBusy && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: batchStage === "uploading" ? `${uploadPct}%` : "100%" }}
              />
            </div>
            <p className="font-mono text-xs text-slate-500">
              {batchStage === "uploading"
                ? "Uploading source file…"
                : "Running frame-by-frame detection and tracking — this can take a while for longer clips."}
            </p>
          </div>
        )}

        {batchError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
            {batchError}
          </div>
        )}

        {exceeded && (
          <AlarmBanner
            count={result?.max_current_count ?? 0}
            threshold={threshold}
            muted={muted}
            onStop={stopAlarm}
          />
        )}

        {result && (
          <div className="grid grid-cols-2 gap-3">
            <Readout label="Peak count" value={result.max_current_count} accent="alert" />
            <Readout label="Avg count" value={result.avg_current_count} accent="signal" />
            <Readout label="Unique visitors" value={result.final_cumulative_unique_count} accent="amber" />
            <Readout label="Frames processed" value={result.frames_processed} accent="ink" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-black">
          {result ? (
            <video
              key={result.annotated_video_url}
              src={annotatedVideoUrl(result.annotated_video_url)}
              controls
              className="max-h-[560px] w-full"
            />
          ) : (
            <p className="font-mono text-sm text-slate-500">
              {batchBusy
                ? "Annotated video will appear here once processing finishes"
                : "Annotated output will render here"}
            </p>
          )}
        </div>

        {showTimeline && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase text-slate-500">
                Occupancy over time
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose-600/80">
                — — alarm threshold
              </span>
            </div>
            <Sparkline data={result?.timeline ?? []} threshold={threshold} />
          </div>
        )}
      </div>
    </div>
  );
}