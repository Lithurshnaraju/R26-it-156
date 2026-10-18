"use client";
// R26 dark-theme component styling

import { useState } from "react";
import { Dropzone } from "./Dropzone";
import { Readout } from "./Readout";
import { StatusPill } from "./StatusPill";
import { ApiError, detectImage, ImageDetectionResponse } from "@/crowd/api";

export function ImageUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageDetectionResponse | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const runDetection = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await detectImage(file);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Detection failed. Is the API running?");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Dropzone
          accept="image/*"
          hint="JPG, PNG, or WEBP"
          onFile={handleFile}
          fileName={file?.name}
        />

        <div className="flex gap-2">
          <button
            onClick={runDetection}
            disabled={!file || loading}
            className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {loading ? "Analyzing…" : "Run detection"}
          </button>
          {(file || result) && (
            <button
              onClick={reset}
              className="rounded-lg border border-slate-200 px-4 py-2.5 font-mono text-sm text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-2 gap-3">
            <Readout label="People count" value={result.count} accent="signal" />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="font-mono text-[11px] uppercase text-slate-500">
                Density
              </div>
              <div className="mt-2">
                <StatusPill crowded={result.is_crowded} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-black">
        {result ? (
          <img
            src={`data:image/jpeg;base64,${result.annotated_image_base64}`}
            alt="Annotated detection result"
            className="max-h-[560px] w-full object-contain"
          />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview of selected image"
            className="max-h-[560px] w-full object-contain opacity-70"
          />
        ) : (
          <p className="font-mono text-sm text-slate-500">
            Annotated output will render here
          </p>
        )}
      </div>
    </div>
  );
}