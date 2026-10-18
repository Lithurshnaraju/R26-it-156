"use client";
// R26 dark-theme component styling

import { useEffect, useRef, useState } from "react";
import { Readout } from "./Readout";
import { ThresholdControl } from "./ThresholdControl";
import { AlarmBanner } from "./AlarmBanner";
import { CctvFrame } from "./CctvFrame";
import { useThresholdAlarm } from "./useThresholdAlarm";
import { useBoxOverlay } from "./useBoxOverlay";
import { useFrameSender } from "./useFrameSender";
import { captureFrame } from "@/crowd/captureFrame";
import { WS_BASE_URL } from "@/crowd/api";

const POLL_MS = 50; // how often we check whether we're free to send the next frame

export function LiveStream({ defaultThreshold = 20 }: { defaultThreshold?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const { canvasRef: overlayCanvasRef, setBoxes, clear: clearOverlay } = useBoxOverlay(videoRef);
  const { canSend, markSent, markReceived, reset: resetSender } = useFrameSender();
  const captureDimsRef = useRef({ width: 0, height: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState<number | null>(null);
  const [uniqueCount, setUniqueCount] = useState<number | null>(null);

  const { threshold, setThreshold, exceeded, muted, stopAlarm } = useThresholdAlarm(
    currentCount,
    defaultThreshold
  );

  // Releases the camera and stops the frame-sending loop. Safe to call
  // multiple times (e.g. once from the user clicking Stop, and again if
  // the socket then fires its own close event).
  const releaseMedia = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setConnected(false);
    // Stop ends the counting session: clear both the currently visible
    // count and the cumulative unique-person count.
    setCurrentCount(0);
    setUniqueCount(0);
    clearOverlay();
  };

  const stop = () => {
    wsRef.current?.close();
    wsRef.current = null;
    releaseMedia();
  };

  useEffect(() => stop, []);

  const start = async () => {
    // Guard against leftover state from a previous attempt (e.g. the
    // socket dropped without the user hitting Stop) — otherwise the old
    // camera stream and polling interval never get released, and a
    // second one starts on top of it.
    stop();
    setError(null);
    setCurrentCount(0);
    setUniqueCount(0);
    resetSender();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait until the camera has dimensions before captureFrame() starts.
        // Without this, early interval ticks return null and some browsers
        // never produce a usable frame for the live counter.
        if (videoRef.current.readyState < HTMLMediaElement.HAVE_METADATA) {
          await new Promise<void>((resolve) => {
            const video = videoRef.current;
            if (!video) return resolve();
            const onMetadata = () => {
              video.removeEventListener("loadedmetadata", onMetadata);
              resolve();
            };
            video.addEventListener("loadedmetadata", onMetadata, { once: true });
          });
        }
        await videoRef.current.play();
      }

      const ws = new WebSocket(`${WS_BASE_URL}/ws/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        intervalRef.current = setInterval(tick, POLL_MS);
      };

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.type === "result") {
          markReceived();
          const { width, height } = captureDimsRef.current;
          setBoxes(msg.boxes ?? [], width, height);
          setCurrentCount(msg.current_count);
          setUniqueCount(msg.cumulative_unique_count);
        } else if (msg.type === "error") {
          markReceived();
          setError(msg.detail || "Live stream error");
        }
      };

      ws.onerror = () => {
        // Ignore errors from an old socket after a quick Stop/Start cycle.
        if (wsRef.current === ws) setError("Could not reach the live detection socket.");
      };
      ws.onclose = () => {
        // A socket closed by stop() can fire after a new socket has already
        // been created. Only the current socket may release the current
        // camera stream and reset the count.
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        releaseMedia();
      };
    } catch (e) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setError("Camera access was denied or is unavailable.");
    }
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const ws = wsRef.current;
    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (!canSend()) return;

    const captured = captureFrame(video, canvas);
    if (!captured) return;

    markSent();
    captureDimsRef.current = { width: captured.width, height: captured.height };
    ws.send(JSON.stringify({ type: "frame", image: captured.dataUrl }));
  };

  const resetCount = () => {
    wsRef.current?.send(JSON.stringify({ type: "reset" }));
    setUniqueCount(0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">
            Streams your camera to the backend over a websocket for real-time
            detection. Frames stay in your browser except while a request is
            in flight.
          </p>
        </div>

        <ThresholdControl threshold={threshold} onChange={setThreshold} />

        <div className="flex gap-2">
          {!connected ? (
            <button
              onClick={start}
              className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-cyan-500"
            >
              Start live feed
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 font-mono text-sm font-medium uppercase tracking-wide text-rose-600 transition-opacity hover:opacity-90"
            >
              Stop
            </button>
          )}
          {connected && (
            <button
              onClick={resetCount}
              className="rounded-lg border border-slate-200 px-4 py-2.5 font-mono text-sm text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-800"
            >
              Reset count
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {exceeded && (
          <AlarmBanner
            count={currentCount ?? 0}
            threshold={threshold}
            muted={muted}
            onStop={stopAlarm}
          />
        )}

        {connected && (
          <div className="grid grid-cols-2 gap-3">
            <Readout label="Live count" value={uniqueCount ?? 0} accent="signal" />
            <Readout label="Visible now" value={currentCount ?? 0} accent="amber" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <CctvFrame
          videoRef={videoRef}
          canvasRef={overlayCanvasRef}
          active={connected}
          live={connected}
          count={currentCount}
          placeholder="Start the live feed to see your camera here"
          muted
        />
        <canvas ref={captureCanvasRef} className="hidden" />
      </div>
    </div>
  );
}