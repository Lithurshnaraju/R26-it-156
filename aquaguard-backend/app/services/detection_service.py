"""
Detection Service — THE BRAIN OF AQUAGUARD

This file does 3 things:
1. Loads the trained YOLOv8 model
2. Runs detection on uploaded images (finds garbage)
3. Calculates GDI (Garbage Density Index) and pollution level

HOW IT WORKS:
- You upload a photo of a river
- YOLOv8 scans the photo and finds garbage objects
- For each object, it draws a box and says what it is (plastic, glass, etc.)
- Then we calculate HOW POLLUTED the river is (GDI score)
- Based on GDI, we assign a pollution level (low/moderate/high/critical)
"""

from ultralytics import YOLO
from PIL import Image
import numpy as np
from app.config import CONFIDENCE_THRESHOLD, DANGER_WEIGHTS

# This will hold the loaded model — loaded once when server starts
model = None


def load_model(model_path: str):
    """
    Load the trained YOLOv8 model from the .pt file.
    This is called ONCE when the server starts.
    """
    global model
    model = YOLO(model_path)
    print(f"YOLOv8 model loaded from: {model_path}")
    print(f"Model can detect these classes: {model.names}")
    return model


def detect_garbage(image: Image.Image) -> dict:
    """
    THE MAIN FUNCTION — runs detection on one image.

    Input: A PIL Image (the uploaded photo)
    Output: A dictionary with all results
    """
    if model is None:
        raise RuntimeError("Model not loaded! Make sure best.pt is in the project folder.")

    # ===== STEP 1: Run YOLOv8 on the image =====
    results = model.predict(
        source=image,
        conf=CONFIDENCE_THRESHOLD,
        iou=0.50,
        verbose=False
    )
    result = results[0]

    # ===== STEP 2: Parse the detections =====
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

    # ===== STEP 3: Calculate GDI and pollution level =====
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
    GDI = Garbage Density Index (0-100)

    Formula: GDI = Σ (confidence × danger_weight) / area_normalisation × scale

    Higher GDI = more polluted river
    """
    if not detections:
        return 0.0

    w, h = image_size
    a_norm = (w * h) / (640 * 640)

    weighted_sum = 0.0
    for det in detections:
        cls_name = det["class"]
        confidence = det["confidence"]
        weight = DANGER_WEIGHTS.get(cls_name, 0.5)
        weighted_sum += confidence * weight

    gdi = (weighted_sum / max(a_norm, 0.1)) * 20
    return min(gdi, 100.0)


def estimate_turbidity(image: Image.Image) -> float:
    """
    Turbidity = how murky/dirty the water looks (0-100).
    Estimated from the blue channel of the image.
    """
    img_array = np.array(image)

    if len(img_array.shape) == 3 and img_array.shape[2] >= 3:
        blue_channel = img_array[:, :, 2]
        avg_blue = np.mean(blue_channel)
        turbidity = 100 - (avg_blue / 255 * 100)
        return max(0, min(100, turbidity))

    return 50.0


def get_pollution_level(gdi: float) -> str:
    """
    Convert GDI score to pollution level:

    GDI 0-25   → "low"       (river is relatively clean)
    GDI 25-50  → "moderate"  (needs regular monitoring)
    GDI 50-75  → "high"      (schedule cleanup)
    GDI 75-100 → "critical"  (immediate cleanup needed)
    """
    if gdi >= 75:
        return "critical"
    elif gdi >= 50:
        return "high"
    elif gdi >= 25:
        return "moderate"
    return "low"