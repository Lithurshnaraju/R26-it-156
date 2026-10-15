"""
Detection Service — THE BRAIN OF AQUAGUARD
"""

from ultralytics import YOLO
from PIL import Image
import numpy as np
from app.config import CONFIDENCE_THRESHOLD, IOU_THRESHOLD, DANGER_WEIGHTS

model = None


def load_model(model_path: str):
    global model
    model = YOLO(model_path)
    print(f"YOLOv8 model loaded from: {model_path}")
    print(f"Model can detect these classes: {model.names}")
    return model


def detect_garbage(image: Image.Image) -> dict:
    if model is None:
        raise RuntimeError("Model not loaded!")

    # Run detection with HIGHER thresholds
    results = model.predict(
        source=image,
        conf=CONFIDENCE_THRESHOLD,    # 0.35 — filters weak detections
        iou=IOU_THRESHOLD,            # 0.60 — merges overlapping boxes
        verbose=False,
        augment=True
    )
    result = results[0]

    detections = []
    class_counts = {}
    class_names = result.names

    for box in result.boxes:
        cls_id = int(box.cls[0])
        cls_name = class_names[cls_id]
        confidence = float(box.conf[0])
        bbox = box.xyxy[0].tolist()

        detections.append({
            "class": cls_name,
            "confidence": round(confidence, 3),
            "bbox": [round(b, 1) for b in bbox],
        })

        class_counts[cls_name] = class_counts.get(cls_name, 0) + 1

    gdi_score = calculate_gdi(detections, image.size)
    turbidity_score = estimate_turbidity(image)
    pollution_level = get_pollution_level(gdi_score)

    return {
        "detections": detections,
        "num_objects": len(detections),
        "class_counts": class_counts,
        "gdi_score": round(gdi_score, 2),
        "turbidity_score": round(turbidity_score, 2),
        "pollution_level": pollution_level,
    }


def calculate_gdi(detections: list, image_size: tuple) -> float:
    """
    FIXED GDI Formula:
    - Area normalisation now CAPPED at 2.0
    - This prevents high-resolution photos from getting unfairly low scores
    - A 4000x3000 photo and a 640x640 photo with the same garbage
      should get similar GDI scores
    """
    if not detections:
        return 0.0

    w, h = image_size
    # CAP area normalisation — max 2.0 so large images aren't penalised
    a_norm = min((w * h) / (640 * 640), 2.0)

    weighted_sum = 0.0
    for det in detections:
        cls_name = det["class"]
        confidence = det["confidence"]
        weight = DANGER_WEIGHTS.get(cls_name, 0.5)
        weighted_sum += confidence * weight

    gdi = (weighted_sum / max(a_norm, 0.1)) * 20
    return min(gdi, 100.0)


def estimate_turbidity(image: Image.Image) -> float:
    img_array = np.array(image)
    if len(img_array.shape) == 3 and img_array.shape[2] >= 3:
        blue_channel = img_array[:, :, 2]
        avg_blue = np.mean(blue_channel)
        turbidity = 100 - (avg_blue / 255 * 100)
        return max(0, min(100, turbidity))
    return 50.0


def get_pollution_level(gdi: float) -> str:
    if gdi >= 75:
        return "critical"
    elif gdi >= 50:
        return "high"
    elif gdi >= 25:
        return "moderate"
    return "low"