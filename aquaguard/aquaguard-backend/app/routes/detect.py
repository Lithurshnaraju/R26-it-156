"""
Detection Routes — API endpoints for garbage detection

POST /api/v1/detect  →  Upload one image, get detection results
POST /api/v1/detect/url  →  Send an image URL, get detection results
GET  /api/v1/detections  →  Get history of all past detections
GET  /api/v1/detections/{id}  →  Get one specific detection by ID
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from PIL import Image
import io
import os
import uuid
from datetime import datetime, timezone

from app.database import get_db
from app.models.detection import DetectionEvent
from app.services.detection_service import detect_garbage

router = APIRouter(prefix="/api/v1", tags=["Garbage Detection"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/detect")
async def detect_image(
    file: UploadFile = File(..., description="Upload a river/garbage image (JPG or PNG)"),
    latitude: float = Query(default=None, description="GPS latitude (optional)"),
    longitude: float = Query(default=None, description="GPS longitude (optional)"),
    location_name: str = Query(default=None, description="Location name like 'Kelani River'"),
    db: AsyncSession = Depends(get_db),
):
    """
    🔍 MAIN ENDPOINT — Upload a photo and detect garbage.

    How to use:
    1. Upload any image of a river or garbage
    2. The API returns what garbage was found, where in the image, and risk scores

    Returns:
    - detections: list of objects found (class, confidence, bounding box)
    - gdi_score: Garbage Density Index (0-100)
    - dri_score: Drowning Risk Index (0-100)
    - alert_tier: none / yellow / orange / red
    """
    # Check that the uploaded file is actually an image
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG or PNG image file."
        )

    # Read the image file
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # Save the uploaded image so we can reference it later
    filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    image.save(filepath)

    # Run YOLOv8 detection on the image
    result = detect_garbage(image)

    # Save results to database
    event = DetectionEvent(
        timestamp=datetime.now(timezone.utc),
        image_filename=filename,
        detections=result["detections"],
        num_objects=result["num_objects"],
        class_counts=result["class_counts"],
        gdi_score=result["gdi_score"],
        dri_score=result["dri_score"],
        alert_tier=result["alert_tier"],
        turbidity_score=result["turbidity_score"],
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Return the results
    return {
        "event_id": event.id,
        "timestamp": event.timestamp.isoformat(),
        "image": filename,
        "image_url": f"/uploads/{filename}",
        "num_objects_detected": result["num_objects"],
        "class_counts": result["class_counts"],
        "detections": result["detections"],
        "risk_assessment": {
            "gdi_score": result["gdi_score"],
            "gdi_description": _gdi_description(result["gdi_score"]),
            "turbidity_score": result["turbidity_score"],
            "dri_score": result["dri_score"],
            "dri_description": _dri_description(result["dri_score"]),
            "alert_tier": result["alert_tier"],
        },
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "name": location_name,
        },
    }


@router.get("/detections")
async def get_all_detections(
    limit: int = Query(default=20, description="How many results to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    📋 Get history of all past detection scans.
    Shows the most recent scans first.
    """
    result = await db.execute(
        select(DetectionEvent)
        .order_by(DetectionEvent.timestamp.desc())
        .limit(limit)
    )
    events = result.scalars().all()

    return {
        "total_results": len(events),
        "detections": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "image_url": f"/uploads/{e.image_filename}" if e.image_filename else None,
                "num_objects": e.num_objects,
                "class_counts": e.class_counts,
                "gdi_score": round(e.gdi_score, 2),
                "dri_score": round(e.dri_score, 2),
                "alert_tier": e.alert_tier,
                "location": e.location_name,
            }
            for e in events
        ],
    }


@router.get("/detections/{event_id}")
async def get_detection_by_id(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    🔎 Get details of one specific detection scan by its ID.
    """
    result = await db.execute(
        select(DetectionEvent).where(DetectionEvent.id == event_id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Detection event {event_id} not found")

    return {
        "id": event.id,
        "timestamp": event.timestamp.isoformat(),
        "image_url": f"/uploads/{event.image_filename}" if event.image_filename else None,
        "num_objects": event.num_objects,
        "class_counts": event.class_counts,
        "detections": event.detections,
        "risk_assessment": {
            "gdi_score": round(event.gdi_score, 2),
            "turbidity_score": round(event.turbidity_score, 2),
            "dri_score": round(event.dri_score, 2),
            "alert_tier": event.alert_tier,
        },
        "location": {
            "latitude": event.latitude,
            "longitude": event.longitude,
            "name": event.location_name,
        },
    }


def _gdi_description(gdi: float) -> str:
    """Human-readable description of GDI score."""
    if gdi >= 80:
        return "Severely polluted — heavy garbage accumulation"
    elif gdi >= 60:
        return "Highly polluted — significant garbage present"
    elif gdi >= 40:
        return "Moderately polluted — noticeable garbage"
    elif gdi >= 20:
        return "Lightly polluted — some garbage detected"
    elif gdi > 0:
        return "Minimal pollution — very little garbage"
    return "Clean — no garbage detected"


def _dri_description(dri: float) -> str:
    """Human-readable description of DRI score."""
    if dri >= 80:
        return "EMERGENCY — extreme drowning risk due to garbage and water conditions"
    elif dri >= 60:
        return "WARNING — elevated drowning risk, avoid swimming"
    elif dri >= 30:
        return "CAUTION — moderate risk, exercise care near water"
    return "LOW RISK — conditions appear safe"
