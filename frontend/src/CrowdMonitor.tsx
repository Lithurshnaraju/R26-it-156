"use client";
// R26 dark-theme component styling

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { ImageUpload } from "./components/crowd/ImageUpload";
import { VideoUpload } from "./components/crowd/VideoUpload";
import { LiveStream } from "./components/crowd/LiveStream";
import { getHealth, HealthResponse } from "./crowd/api";

type Tab = "image" | "video" | "live";

const TABS: { id: Tab; label: string }[] = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "live", label: "Live" },
];

export default function CrowdMonitor() {
  const [tab, setTab] = useState<Tab>("image");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealthError(true));
  }, []);

  const statusTone = healthError
    ? "bg-rose-500"
    : health
    ? "bg-emerald-500"
    : "bg-slate-500 animate-blink";

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      {/* Header bar, same pattern as LivePlayer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center space-x-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${statusTone}`} />
          <Users className="h-4 w-4 text-cyan-700" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Crowd Density Detection Console
          </h2>
          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-700">
            Crowd Mode
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500">
            {healthError
              ? "API unreachable"
              : health
              ? `Model ${health.model_loaded ? "loaded" : "missing"}`
              : "Checking API…"}
          </span>
          <nav className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  tab === t.id
                    ? "bg-cyan-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <section className="p-5">
        <p className="mb-5 text-sm text-slate-500">
          Upload an image or video and the model will count and box every
          person it finds.
        </p>
        {tab === "image" && <ImageUpload />}
        {tab === "video" && <VideoUpload />}
        {tab === "live" && <LiveStream />}
      </section>
    </div>
  );
}