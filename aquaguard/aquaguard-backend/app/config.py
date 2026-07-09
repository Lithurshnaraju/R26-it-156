"""
AquaGuard Configuration
All settings in one place so you can change them easily.
"""

# Path to your trained YOLOv8 model file
# After training in Google Colab, download best.pt and put it in the project folder
MODEL_PATH = "best.pt"

# Database file (SQLite — no setup needed, it creates automatically)
DATABASE_URL = "sqlite+aiosqlite:///./aquaguard.db"

# Detection settings
CONFIDENCE_THRESHOLD = 0.20   # Only show detections above 45% confidence
IOU_THRESHOLD = 0.50          # Remove overlapping boxes above 50% overlap

# Danger weights — how dangerous each garbage type is
# Higher number = more dangerous for the river
DANGER_WEIGHTS = {
    "plastic": 0.8,
    "polythene": 1.0,
    "glass": 0.7,
    "metal": 0.6,
    "paper": 0.3,
}

# DRI (Drowning Risk Index) thresholds
# These decide when to trigger alerts
DRI_YELLOW = 30    # Low risk — just a warning
DRI_ORANGE = 60    # Medium risk — send notification
DRI_RED = 80       # High risk — emergency alert
