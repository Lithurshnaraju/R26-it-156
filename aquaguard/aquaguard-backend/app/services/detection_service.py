"""
Detection Service — THE BRAIN OF AQUAGUARD

This file does 3 things:
1. Loads the trained YOLOv8 model
2. Runs detection on uploaded images (finds garbage)
3. Calculates GDI (Garbage Density Index) and DRI (Drowning Risk Index)

HOW IT WORKS:
- You upload a photo of a river
- YOLOv8 scans the photo and finds garbage objects
- For each object, it draws a box and says what it is (plastic, glass, etc.)
- Then we calculate HOW POLLUTED the river is (GDI score)
- Then we calculate HOW DANGEROUS it is for drowning (DRI score)
- If DRI is high enough, we trigger an alert (yellow/orange/red)
"""

from ultralytics import YOLO
from PIL import Image
import numpy as np
from datetime import datetime
from app.config import CONFIDENCE_THRESHOLD, DANGER_WEIGHTS, DRI_YELLOW, DRI_ORANGE, DRI_RED

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

    What happens inside:
    1. YOLOv8 looks at the image
    2. It finds objects and draws bounding boxes
    3. We calculate GDI and DRI scores
    4. We decide if an alert should be triggered
    """
    if model is None:
        raise RuntimeError("Model not loaded! Make sure best.pt is in the project folder.")

    # ===== STEP 1: Run YOLOv8 on the image =====
    results = model.predict(
        source=image,
        conf=CONFIDENCE_THRESHOLD,   # Only keep detections above 45% confidence
        iou=0.50,                     # Remove duplicate overlapping boxes
        verbose=False                 # Don't print to console
    )
    result = results[0]  # We only have one image, so take first result

    # ===== STEP 2: Parse the detections =====
    detections = []
    class_counts = {}
    class_names = result.names  # Maps class ID to name: {0: 'glass', 1: 'metal', ...}

    for box in result.boxes:
        cls_id = int(box.cls[0])                    # Class ID (0, 1, 2, or 3)
        cls_name = class_names[cls_id]              # Class name ("plastic", "glass", etc.)
        confidence = float(box.conf[0])             # How sure the model is (0.0 to 1.0)
        bbox = box.xyxy[0].tolist()                 # Bounding box [x1, y1, x2, y2]

        detections.append({
            "class": cls_name,
            "confidence": round(confidence, 3),
            "bbox": [round(b, 1) for b in bbox],
        })

        # Count how many of each class
        class_counts[cls_name] = class_counts.get(cls_name, 0) + 1

    # ===== STEP 3: Calculate risk scores =====
    gdi_score = calculate_gdi(detections, image.size)
    turbidity_score = estimate_turbidity(image)
    dri_score = calculate_dri(gdi_score, turbidity_score)
    alert_tier = get_alert_tier(dri_score)

    return {
        "detections": detections,
        "num_objects": len(detections),
        "class_counts": class_counts,
        "gdi_score": round(gdi_score, 2),
        "turbidity_score": round(turbidity_score, 2),
        "dri_score": round(dri_score, 2),
        "alert_tier": alert_tier,
    }


def calculate_gdi(detections: list, image_size: tuple) -> float:
    """
    GDI = Garbage Density Index

    Formula: GDI = Σ (confidence × danger_weight) / area_normalisation × 100

    What this means:
    - More garbage objects = higher GDI
    - More dangerous garbage (plastic bags > leaves) = higher GDI
    - Higher detection confidence = higher GDI

    Example:
    - 3 plastic bottles (weight 0.8) detected with 90% confidence
    - GDI = (0.9 × 0.8 + 0.9 × 0.8 + 0.9 × 0.8) / 1.0 × 100 = 216
    - Capped at 100
    """
    if not detections:
        return 0.0

    w, h = image_size
    a_norm = (w * h) / (640 * 640)  # Normalise so different image sizes give similar scores

    weighted_sum = 0.0
    for det in detections:
        cls_name = det["class"]
        confidence = det["confidence"]
        weight = DANGER_WEIGHTS.get(cls_name, 0.5)
        weighted_sum += confidence * weight

    gdi = (weighted_sum / max(a_norm, 0.1)) * 20  # Scale to roughly 0-100
    return min(gdi, 100.0)


def estimate_turbidity(image: Image.Image) -> float:
    """
    Turbidity = how murky/dirty the water looks.

    We estimate this from the BLUE channel of the image:
    - Clear water has HIGH blue values (blue sky reflection)
    - Murky water has LOW blue values (brown/green mud)

    Formula: TurbidityScore = 100 - (average_blue / 255 × 100)

    This is a simplified estimate — in production, you'd use a real sensor.
    """
    img_array = np.array(image)

    if len(img_array.shape) == 3 and img_array.shape[2] >= 3:
        blue_channel = img_array[:, :, 2]  # Blue is channel index 2 in RGB
        avg_blue = np.mean(blue_channel)
        turbidity = 100 - (avg_blue / 255 * 100)
        return max(0, min(100, turbidity))

    return 50.0  # Default if we can't compute


def calculate_dri(gdi_smooth: float, turbidity_score: float) -> float:
    """
    DRI = Drowning Risk Index (YOUR NOVEL CONTRIBUTION)

    Formula: DRI = (0.60 × GDI) + (0.30 × Turbidity) + (0.10 × TimeRisk)

    What this means:
    - 60% of the risk comes from garbage density
    - 30% comes from water murkiness
    - 10% comes from time of day (daytime = more people swimming = higher risk)

    This is what makes your project UNIQUE — nobody else has combined
    garbage detection with drowning risk assessment.
    """
    now = datetime.now()
    # Higher risk during daytime (10 AM - 6 PM) when people swim
    time_risk = 100.0 if 10 <= now.hour <= 18 else 40.0

    dri = (0.60 * gdi_smooth) + (0.30 * turbidity_score) + (0.10 * time_risk)
    return min(dri, 100.0)


def get_alert_tier(dri: float) -> str:
    """
    Convert DRI score to alert level:
    - DRI < 30  → "none" (safe)
    - DRI 30-59 → "yellow" (caution)
    - DRI 60-79 → "orange" (warning — send notification)
    - DRI >= 80 → "red" (emergency — send SMS + push notification)
    """
    if dri >= DRI_RED:
        return "red"
    elif dri >= DRI_ORANGE:
        return "orange"
    elif dri >= DRI_YELLOW:
        return "yellow"
    return "none"
