// Backend's YOLO model runs at 960px on the long edge (see
// models/inference_config.json). Sending anything larger just costs
// extra encode/upload/inference time with no accuracy benefit, since the
// backend would resize down to this anyway.
const MAX_CAPTURE_DIM = 960;

export function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  quality = 0.7
): { dataUrl: string; width: number; height: number } | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  const scale = Math.min(1, MAX_CAPTURE_DIM / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);

  return { dataUrl: canvas.toDataURL("image/jpeg", quality), width, height };
}
