// lib/api.ts
// Thin client for the Crowd Monitoring FastAPI backend.
// Base URLs are hardcoded to the local FastAPI server (see bg/config.py PORT).

export const API_BASE_URL = "http://localhost:8002";

export const WS_BASE_URL = "ws://localhost:8002";

export interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  track_id: number | null;
}

export interface HealthResponse {
  status: string;
  model_path: string;
  model_loaded: boolean;
  img_size: number;
  conf_threshold: number;
  iou_threshold: number;
  density_alert_threshold: number;
}

export interface ImageDetectionResponse {
  count: number;
  is_crowded: boolean;
  boxes: DetectionBox[];
  annotated_image_base64: string;
}

export interface TimelinePoint {
  frame: number;
  timestamp_sec: number;
  current_count: number;
  cumulative_unique_count: number;
  is_crowded: boolean;
}

export interface VideoDetectionResponse {
  frames_processed: number;
  processing_time_sec: number;
  max_current_count: number;
  avg_current_count: number;
  final_cumulative_unique_count: number;
  timeline: TimelinePoint[];
  annotated_video_url: string;
}

export interface LiveFrameResult {
  type: "result" | "error" | "reset_ok";
  timestamp?: number;
  current_count?: number;
  cumulative_unique_count?: number;
  is_crowded?: boolean;
  boxes?: DetectionBox[];
  annotated_frame?: string;
  detail?: string;
}

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const message =
      (data && (data.error || data.detail)) || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/health`, { cache: "no-store" });
  return parseJsonOrThrow<HealthResponse>(res);
}

export async function detectImage(file: File): Promise<ImageDetectionResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/detect/image`, {
    method: "POST",
    body: form,
  });
  return parseJsonOrThrow<ImageDetectionResponse>(res);
}

export async function detectVideo(
  file: File,
  onUploadProgress?: (pct: number) => void
): Promise<VideoDetectionResponse> {
  // Use XHR instead of fetch so we can report upload progress for large video files.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/detect/video`);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // ignore
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as VideoDetectionResponse);
      } else {
        reject(
          new ApiError(
            (data && (data.error || data.detail)) || `Request failed with status ${xhr.status}`,
            xhr.status
          )
        );
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error while uploading video"));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export function annotatedVideoUrl(path: string): string {
  // Backend returns a relative path like /api/video/<filename>
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  used_knowledge_base: boolean;
}

export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  return parseJsonOrThrow<ChatResponse>(res);
}

export { ApiError };