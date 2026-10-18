"""
crowd_detector.py
------------------
YOLO person detection and ByteTrack tracking with one warm model instance.
The detector is intentionally shared so model weights are loaded only once.
"""

import threading
import uuid
from typing import Dict, List, Optional

import cv2
import numpy as np
import torch
from ultralytics import YOLO

from config import settings


class CrowdDetector:
    """Thread-safe wrapper around the Ultralytics YOLO model."""

    def __init__(self):
        self.device = self._resolve_device(settings.DEVICE)
        self.model = YOLO(str(settings.MODEL_PATH))
        self.tracker_config = str(settings.TRACKER_CONFIG_PATH)
        self.conf = settings.CONF_THRESHOLD
        self.iou = settings.IOU_THRESHOLD
        # Keep the original inference resolution on every device so changing
        # the runtime does not intentionally trade detection accuracy for speed.
        self.imgsz = settings.IMG_SIZE
        self.person_class_id = settings.PERSON_CLASS_ID
        self.alert_threshold = settings.DENSITY_ALERT_THRESHOLD

        self._sessions: Dict[str, set] = {}
        self._sessions_lock = threading.Lock()
        # Ultralytics tracker state is attached to the model when persist=True.
        # Serialize model calls so concurrent uploads cannot corrupt each other's state.
        self._inference_lock = threading.Lock()

        # Run one inference before accepting traffic. This moves first-request
        # initialization out of the upload request without changing model inputs.
        if settings.WARMUP_MODEL:
            self._warmup()

    @staticmethod
    def _resolve_device(requested: str) -> str:
        if requested and requested.lower() != "auto":
            return requested
        return "cuda:0" if torch.cuda.is_available() else "cpu"

    def _warmup(self) -> None:
        blank = np.zeros((self.imgsz, self.imgsz, 3), dtype=np.uint8)
        with self._inference_lock:
            self.model.predict(
                source=blank,
                imgsz=self.imgsz,
                device=self.device,
                conf=self.conf,
                classes=[self.person_class_id],
                verbose=False,
            )

    def new_session(self) -> str:
        session_id = str(uuid.uuid4())
        with self._sessions_lock:
            self._sessions[session_id] = set()
        return session_id

    def end_session(self, session_id: str):
        with self._sessions_lock:
            self._sessions.pop(session_id, None)

    def detect_image(self, frame: np.ndarray, draw: bool = True) -> dict:
        with self._inference_lock:
            results = self.model.predict(
                source=frame,
                conf=self.conf,
                iou=self.iou,
                imgsz=self.imgsz,
                classes=[self.person_class_id],
                device=self.device,
                verbose=False,
            )
        result = results[0]
        boxes = self._extract_boxes(result)
        annotated = self._plot_boxes_only(result) if draw else frame
        return {
            "count": len(boxes),
            "is_crowded": len(boxes) >= self.alert_threshold,
            "boxes": boxes,
            "annotated_frame": annotated,
        }

    def track_frame(
        self, frame: np.ndarray, session_id: Optional[str] = None, draw: bool = True
    ) -> dict:
        with self._inference_lock:
            results = self.model.track(
                source=frame,
                conf=self.conf,
                iou=self.iou,
                imgsz=self.imgsz,
                classes=[self.person_class_id],
                tracker=self.tracker_config,
                persist=True,
                device=self.device,
                verbose=False,
            )
        result = results[0]
        boxes = self._extract_boxes(result, with_ids=True)

        cumulative_unique_count = None
        if session_id is not None:
            with self._sessions_lock:
                seen = self._sessions.setdefault(session_id, set())
                for box in boxes:
                    if box["track_id"] is not None:
                        seen.add(box["track_id"])
                cumulative_unique_count = len(seen)

        annotated = self._plot_boxes_only(result) if draw else frame
        return {
            "current_count": len(boxes),
            "cumulative_unique_count": cumulative_unique_count,
            "is_crowded": len(boxes) >= self.alert_threshold,
            "boxes": boxes,
            "annotated_frame": annotated,
        }

    @staticmethod
    def _plot_boxes_only(result) -> np.ndarray:
        return result.plot(labels=False, conf=False)

    @staticmethod
    def _extract_boxes(result, with_ids: bool = False) -> List[dict]:
        boxes_out: List[dict] = []
        if result.boxes is None or len(result.boxes) == 0:
            return boxes_out
        xyxy = result.boxes.xyxy.cpu().numpy()
        confs = result.boxes.conf.cpu().numpy()
        ids = None
        if with_ids and result.boxes.id is not None:
            ids = result.boxes.id.cpu().numpy().astype(int)
        for i in range(len(xyxy)):
            x1, y1, x2, y2 = xyxy[i].tolist()
            boxes_out.append({
                "x1": round(x1, 2), "y1": round(y1, 2),
                "x2": round(x2, 2), "y2": round(y2, 2),
                "confidence": round(float(confs[i]), 4),
                "track_id": int(ids[i]) if ids is not None else None,
            })
        return boxes_out

    @staticmethod
    def encode_jpeg_base64(frame: np.ndarray) -> str:
        import base64
        ok, buf = cv2.imencode(".jpg", frame)
        if not ok:
            raise ValueError("Failed to encode frame as JPEG")
        return base64.b64encode(buf).decode("utf-8")


detector = CrowdDetector()
