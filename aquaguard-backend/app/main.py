"""
AquaGuard — Main Application Entry Point

This is where the FastAPI server starts.

To run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
Then open: http://localhost:8000/docs (Swagger UI to test all endpoints)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import init_db
from app.services.detection_service import load_model
from app.config import MODEL_PATH
from app.routes import detect, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    This runs when the server STARTS and STOPS.
    On startup: create database tables + load the YOLOv11-nano model.
    """
    # === SERVER STARTING ===
    print("=" * 50)
    print("  AquaGuard Backend Starting...")
    print("=" * 50)

    # Create database tables
    await init_db()

    # Load the YOLOv11-nano model
    if os.path.exists(MODEL_PATH):
        load_model(MODEL_PATH)
    else:
        print(f"\n⚠️  WARNING: Model file '{MODEL_PATH}' not found!")
        print("   Download best.pt from the Kaggle training output and put it in the project folder.")
        print("   The /detect endpoint will not work without the model.\n")

    print("\n✅ AquaGuard backend is ready!")
    print("📖 Open http://localhost:8000/docs to see all API endpoints\n")

    yield  # Server is running...

    # === SERVER STOPPING ===
    print("\nAquaGuard shutting down...")


# Create the FastAPI application
app = FastAPI(
    title="AquaGuard API",
    description="""
    ## Real-Time River Garbage Detection & Pollution Severity Assessment

    **How to use this API:**

    1. **Upload an image** → `POST /api/v1/detect`
       - Upload any photo of a river or garbage
       - Get back: detected objects, GDI score, pollution level

    2. **View history** → `GET /api/v1/detections`
       - See all past detection scans

    3. **Analytics** → `GET /api/v1/analytics/summary`
       - Get overall statistics for the dashboard

    **Key Concepts:**
    - **GDI (Garbage Density Index):** A weighted pollution severity score (0-100)
      based on detection confidence, garbage danger weight and image area
    - **Pollution Levels:** low (0-25) → moderate (25-50) → high (50-75) → critical (75-100)
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the web and mobile app to connect (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # Allow all origins for demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files
# This means you can view images at: http://localhost:8000/uploads/filename.jpg
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register all API routes
app.include_router(detect.router)
app.include_router(analytics.router)


# === SIMPLE ENDPOINTS ===

@app.get("/", tags=["System"])
async def root():
    """🏠 Home — shows project info and available endpoints."""
    return {
        "project": "AquaGuard",
        "description": "Real-Time River Garbage Detection & Pollution Severity Assessment System",
        "version": "1.0.0",
        "tech_stack": {
            "model": "YOLOv11-nano (trained on ~8,900 images, 90.3% mAP@0.5)",
            "backend": "Python FastAPI",
            "database": "SQLite (async)",
            "classes": ["glass", "metal", "plastic", "polythene"],
        },
        "api_docs": "Visit /docs for interactive API documentation",
        "endpoints": {
            "detect_garbage": "POST /api/v1/detect",
            "detection_history": "GET /api/v1/detections",
            "analytics_summary": "GET /api/v1/analytics/summary",
            "class_distribution": "GET /api/v1/analytics/class-distribution",
            "gdi_trend": "GET /api/v1/analytics/gdi-trend",
            "alert_history": "GET /api/v1/analytics/alerts",
        },
    }


@app.get("/health", tags=["System"])
async def health_check():
    """❤️ Health check — confirms the server and model are running."""
    from app.services.detection_service import model
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_classes": model.names if model else None,
    }