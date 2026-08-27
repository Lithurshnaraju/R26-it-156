"""
AquaGuard Configuration
"""

# Path to your trained YOLOv8 model file
MODEL_PATH = "best.pt"

# Database file
DATABASE_URL = "sqlite+aiosqlite:///./aquaguard.db"

# Detection settings
CONFIDENCE_THRESHOLD = 0.20
IOU_THRESHOLD = 0.50

# Danger weights — how dangerous each garbage type is
DANGER_WEIGHTS = {
    "plastic": 0.8,
    "polythene": 1.0,
    "glass": 0.7,
    "metal": 0.6,
}