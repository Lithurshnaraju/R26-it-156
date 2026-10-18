"""
config.py
---------
Central configuration for the Crowd Monitoring backend.
Reads defaults from inference_config.json (produced during training)
and exposes them as a single Settings object used across the app.
"""

import json
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

# Pull default thresholds from the training-time inference_config.json
# so the API stays in sync with how the model was validated.
_inference_cfg_path = MODELS_DIR / "inference_config.json"
_inference_cfg = {}
if _inference_cfg_path.exists():
    with open(_inference_cfg_path, "r") as f:
        _inference_cfg = json.load(f)


class Settings(BaseSettings):
    # --- Model artifacts ---
    MODEL_PATH: Path = MODELS_DIR / "crowd_yolo11.pt"
    TRACKER_CONFIG_PATH: Path = MODELS_DIR / "bytetrack.yaml"

    # --- Inference parameters (defaults sourced from inference_config.json) ---
    IMG_SIZE: int = _inference_cfg.get("input", {}).get("image_size", 960)
    # Accuracy-preserving profile: use the same training-time image size.
    # Keep this false unless an intentional speed/accuracy tradeoff is approved.
    FAST_MODE: bool = False
    CPU_IMG_SIZE: int = 640
    DEVICE: str = "auto"  # auto, cpu, or cuda:0
    WARMUP_MODEL: bool = True
    CONF_THRESHOLD: float = _inference_cfg.get("detection", {}).get(
        "confidence_threshold", 0.35
    )
    IOU_THRESHOLD: float = _inference_cfg.get("detection", {}).get(
        "iou_threshold", 0.5
    )
    PERSON_CLASS_ID: int = 0

    # --- Crowd monitoring business rules ---
    # Frame is flagged as "crowded" once current_count crosses this.
    DENSITY_ALERT_THRESHOLD: int = 20
    # Accuracy-preserving profile: process every frame, as in the original code.
    VIDEO_FRAME_STRIDE: int = 1

    # --- Server ---
    HOST: str = "0.0.0.0"
    PORT: int = 8002
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",   # Next.js dev
        "http://localhost:5173",   # Vite dev
    ]

    # --- Storage ---
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "outputs"

    # --- TankBot chatbot ---
    PINECONE_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    PINECONE_INDEX_HOST: str = (
        "https://chatbot-custom-knowledgebase-xqxfvph.svc.aped-4627-b74a.pinecone.io"
    )
    EMBEDDING_MODEL: str = "llama-text-embed-v2"
    CHAT_TOP_K: int = 5
    CHAT_SIMILARITY_CUTOFF: float = 0.35
    CHAT_MAX_MEMORY_TURNS: int = 10
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    CHAT_MAX_TOKENS: int = 1024
    CHAT_APP_URL: str = "http://localhost:3000"
    CHAT_SESSIONS_FILE: Path = BASE_DIR / "chat_sessions.json"

    class Config:
        env_file = ".env"


settings = Settings()

settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)