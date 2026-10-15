"""
AquaGuard Configuration

Every number here matches the Methodology and GDI Calculation Report.
"""

MODEL_PATH = "best.pt"
DATABASE_URL = "sqlite+aiosqlite:///./aquaguard.db"

# --- Detection thresholds (Methodology, Table: Training Hyperparameters) ---
CONFIDENCE_THRESHOLD = 0.30   # ignore detections the model is less than 30% sure about
IOU_THRESHOLD = 0.60          # NMS: merge boxes that overlap more than 60%

# --- Danger weights (GDI report, Section 3) ---
DANGER_WEIGHTS = {
    "polythene": 1.0,   # highest harm
    "plastic": 0.8,
    "glass": 0.7,
    "metal": 0.6,       # lowest harm
}

# --- GDI constants (GDI report, Sections 2, 5 and 6) ---
GDI_SCALE = 20                  # empirically calibrated scale factor
REFERENCE_AREA = 640 * 640      # model input size, area_norm = 1.0 at this size
AREA_NORM_MIN = 1.0             # small images never inflate the score
AREA_NORM_MAX = 2.0             # large phone photos are not over-penalised
GDI_MAX = 100.0                 # upper bound of the index