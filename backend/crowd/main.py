"""
main.py
-------
FastAPI entrypoint for the Crowd Monitoring backend.

Endpoints
---------
GET  /api/health                    -> service + model status
POST /api/detect/image              -> single image -> count + boxes + annotated image (base64)
POST /api/detect/video              -> video file -> per-frame timeline + annotated output video
WS   /ws/live                       -> live stream: client sends base64 frames, server returns counts

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8002 --reload
"""

import base64
import subprocess
import time
import uuid
from pathlib import Path
from pydantic import BaseModel

import chatbot
import cv2
import imageio_ffmpeg
import numpy as np
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from config import settings
from crowd_detector import detector

app = FastAPI(title="Crowd Monitoring API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------- #
# Helpers
# ---------------------------------------------------------------------- #
def _bytes_to_frame(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image data")
    return frame


def _frame_to_base64_jpeg(frame: np.ndarray) -> str:
    return detector.encode_jpeg_base64(frame)


def _b64_to_frame(b64_str: str) -> np.ndarray:
    if "," in b64_str:  # strip "data:image/jpeg;base64," prefixes
        b64_str = b64_str.split(",", 1)[1]
    data = base64.b64decode(b64_str)
    return _bytes_to_frame(data)


def _transcode_to_h264(src_path: Path) -> Path:
    """Re-encode an OpenCV-written video to H.264/yuv420p in a
    faststart-flagged MP4 container.

    cv2.VideoWriter's "mp4v" fourcc (MPEG-4 Part 2) produces a file that's
    perfectly valid but that Chrome, Firefox, and Safari will not play
    inline in a <video> tag — they only reliably support H.264/AVC (or
    VP9/AV1) in MP4. Browsers fail silently here: no console error, the
    element just never renders a frame. Re-encoding after writing (rather
    than writing H.264 directly) sidesteps the fact that most
    pip-installed opencv-python builds don't include a libx264 encoder.
    """
    dst_path = src_path.with_name(f"{src_path.stem}_h264.mp4")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ffmpeg_exe,
            "-y",
            "-i", str(src_path),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(dst_path),
        ],
        check=True,
        capture_output=True,
    )
    src_path.unlink(missing_ok=True)
    return dst_path


# ---------------------------------------------------------------------- #
# Health
# ---------------------------------------------------------------------- #
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "model_path": str(settings.MODEL_PATH),
        "model_loaded": settings.MODEL_PATH.exists(),
        "device": detector.device,
        "img_size": detector.imgsz,
        "fast_mode": settings.FAST_MODE,
        "video_frame_stride": settings.VIDEO_FRAME_STRIDE,
        "conf_threshold": settings.CONF_THRESHOLD,
        "iou_threshold": settings.IOU_THRESHOLD,
        "density_alert_threshold": settings.DENSITY_ALERT_THRESHOLD,
    }


# ---------------------------------------------------------------------- #
# Single image detection
# ---------------------------------------------------------------------- #
@app.post("/api/detect/image")
async def detect_image(file: UploadFile = File(...)):
    data = await file.read()
    try:
        frame = _bytes_to_frame(data)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    result = detector.detect_image(frame, draw=True)
    annotated_b64 = _frame_to_base64_jpeg(result.pop("annotated_frame"))

    return {
        **result,
        "annotated_image_base64": annotated_b64,
    }
# ---------------------------------------------------------------------- #
# TankBot chat
# ---------------------------------------------------------------------- #
class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


@app.post("/api/chat")
def chat_endpoint(payload: ChatRequest):
    message = payload.message.strip()
    if not message:
        return JSONResponse(status_code=400, content={"error": "message is required"})

    session_id = payload.session_id or f"session-{uuid.uuid4().hex[:12]}"

    try:
        result = chatbot.chat(session_id, message)
    except RuntimeError as e:
        return JSONResponse(status_code=503, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Chat failed: {e}"})

    return result


@app.get("/api/chat/{session_id}/history")
def chat_history(session_id: str):
    return {"session_id": session_id, "history": chatbot.store.get_history(session_id)}


# ---------------------------------------------------------------------- #
# Video detection (uploads a file, processes it fully, returns a timeline
# summary plus a downloadable annotated video)
# ---------------------------------------------------------------------- #
@app.post("/api/detect/video")
async def detect_video(file: UploadFile = File(...)):
    session_id = detector.new_session()

    in_path = settings.UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
    with open(in_path, "wb") as f:
        f.write(await file.read())

    cap = cv2.VideoCapture(str(in_path))
    if not cap.isOpened():
        detector.end_session(session_id)
        return JSONResponse(status_code=400, content={"error": "Could not open video"})

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    out_path = settings.OUTPUT_DIR / f"annotated_{uuid.uuid4().hex}.mp4"
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(out_path), fourcc, fps, (width, height))

    timeline = []
    frame_idx = 0
    detected_frames = 0
    max_count = 0
    start_time = time.time()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            if frame_idx % settings.VIDEO_FRAME_STRIDE == 0:
                result = detector.track_frame(frame, session_id=session_id, draw=True)
                detected_frames += 1
                annotated = result.pop("annotated_frame")
                writer.write(annotated)

                max_count = max(max_count, result["current_count"])
                timeline.append(
                    {
                        "frame": frame_idx,
                        "timestamp_sec": round(frame_idx / fps, 2),
                        "current_count": result["current_count"],
                        "cumulative_unique_count": result["cumulative_unique_count"],
                        "is_crowded": result["is_crowded"],
                    }
                )
            else:
                writer.write(frame)

            frame_idx += 1
    finally:
        cap.release()
        writer.release()
        detector.end_session(session_id)
        in_path.unlink(missing_ok=True)

    # Browsers won't play the mp4v file OpenCV just wrote — re-encode to
    # H.264 so the frontend's <video> tag can actually show it. If ffmpeg
    # is unavailable or the transcode fails for any reason, fall back to
    # serving the original file rather than failing the whole request.
    try:
        out_path = _transcode_to_h264(out_path)
    except Exception as e:
        print(f"[detect_video] H.264 transcode failed, serving raw mp4v output: {e}")

    processing_time = round(time.time() - start_time, 2)
    avg_count = (
        round(sum(t["current_count"] for t in timeline) / len(timeline), 2)
        if timeline
        else 0
    )

    return {
        "frames_processed": frame_idx,
        "detected_frames": detected_frames,
        "frame_stride": settings.VIDEO_FRAME_STRIDE,
        "processing_time_sec": processing_time,
        "max_current_count": max_count,
        "avg_current_count": avg_count,
        "final_cumulative_unique_count": timeline[-1]["cumulative_unique_count"]
        if timeline
        else 0,
        "timeline": timeline,
        "annotated_video_url": f"/api/video/{out_path.name}",
    }


@app.get("/api/video/{filename}")
def get_annotated_video(filename: str):
    path = settings.OUTPUT_DIR / filename
    if not path.exists():
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(path, media_type="video/mp4", filename=filename)


# ---------------------------------------------------------------------- #
# Live streaming via WebSocket
#
# Frontend contract:
#   - Connect to ws://<host>/ws/live
#   - Send JSON: {"type": "frame", "image": "<base64 jpeg, optionally
#       with a data:image/jpeg;base64, prefix>"}
#   - Send JSON: {"type": "reset"} to clear the unique-visitor count
#   - Receive JSON: {
#         "type": "result",
#         "current_count": int,
#         "cumulative_unique_count": int,
#         "is_crowded": bool,
#         "boxes": [...],
#         "annotated_frame": "<base64 jpeg>"
#     }
# ---------------------------------------------------------------------- #
@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    session_id = detector.new_session()

    try:
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")

            if msg_type == "reset":
                detector.end_session(session_id)
                session_id = detector.new_session()
                await websocket.send_json({"type": "reset_ok"})
                continue

            if msg_type != "frame" or "image" not in message:
                await websocket.send_json(
                    {"type": "error", "detail": "Expected {'type':'frame','image': base64}"}
                )
                continue

            try:
                frame = _b64_to_frame(message["image"])
            except Exception as e:
                await websocket.send_json({"type": "error", "detail": str(e)})
                continue

            result = detector.track_frame(frame, session_id=session_id, draw=True)
            annotated_b64 = _frame_to_base64_jpeg(result.pop("annotated_frame"))

            await websocket.send_json(
                {
                    "type": "result",
                    "timestamp": time.time(),
                    **result,
                    "annotated_frame": annotated_b64,
                }
            )

    except WebSocketDisconnect:
        pass
    finally:
        detector.end_session(session_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
