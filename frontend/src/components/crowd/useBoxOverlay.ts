import { useCallback, useEffect, useRef, RefObject } from "react";
import { DetectionBox } from "@/crowd/api";

export function useBoxOverlay(videoRef: RefObject<HTMLVideoElement>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxesRef = useRef<DetectionBox[]>([]);
  // Dimensions of the frame that was actually sent for detection — boxes
  // are relative to this, which may be smaller than the video's native
  // resolution since captures are downscaled before upload.
  const sourceSizeRef = useRef({ width: 0, height: 0 });

  const draw = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const { width: sourceWidth, height: sourceHeight } = sourceSizeRef.current;
    if (!video || !canvas || !sourceWidth || !sourceHeight) return;
    if (!video.videoWidth || !video.videoHeight) return;

    const boxWidth = video.clientWidth;
    const boxHeight = video.clientHeight;
    if (boxWidth === 0 || boxHeight === 0) return;
    if (canvas.width !== boxWidth) canvas.width = boxWidth;
    if (canvas.height !== boxHeight) canvas.height = boxHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // The <video> uses object-fit: contain, so unless its native aspect
    // ratio exactly matches the rendered box, the browser letterboxes it
    // (black bars on two sides) rather than filling the whole box. Work
    // out the actual on-screen rectangle the video pixels occupy so boxes
    // land on the picture instead of drifting into the bars.
    const videoRatio = video.videoWidth / video.videoHeight;
    const boxRatio = boxWidth / boxHeight;

    let contentWidth: number;
    let contentHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (videoRatio > boxRatio) {
      contentWidth = boxWidth;
      contentHeight = boxWidth / videoRatio;
      offsetX = 0;
      offsetY = (boxHeight - contentHeight) / 2;
    } else {
      contentHeight = boxHeight;
      contentWidth = boxHeight * videoRatio;
      offsetY = 0;
      offsetX = (boxWidth - contentWidth) / 2;
    }

    // sourceWidth/sourceHeight (the captured/sent frame) share the same
    // aspect ratio as the native video since captures are scaled
    // uniformly, so a single factor maps source pixels to the visible
    // content rect.
    const scaleX = contentWidth / sourceWidth;
    const scaleY = contentHeight / sourceHeight;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#4FD1C5";

    // Boxes only — no track ID / label / confidence text drawn on top,
    // so identified people are marked with just the square outline.
    boxesRef.current.forEach((b) => {
      const x = offsetX + b.x1 * scaleX;
      const y = offsetY + b.y1 * scaleY;
      const w = (b.x2 - b.x1) * scaleX;
      const h = (b.y2 - b.y1) * scaleY;
      ctx.strokeRect(x, y, w, h);
    });
  }, [videoRef]);

  const setBoxes = useCallback(
    (boxes: DetectionBox[], sourceWidth: number, sourceHeight: number) => {
      boxesRef.current = boxes;
      sourceSizeRef.current = { width: sourceWidth, height: sourceHeight };
      draw();
    },
    [draw]
  );

  const clear = useCallback(() => {
    boxesRef.current = [];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Keep the overlay aligned whenever the video's rendered size changes
  // (responsive layout, window resize, orientation change, etc).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(video);
    return () => ro.disconnect();
  }, [videoRef, draw]);

  return { canvasRef, setBoxes, clear };
}
