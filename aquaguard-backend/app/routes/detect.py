"""
Detection Routes — API endpoints for garbage detection

POST /api/v1/detect       →  Upload one image, get detection results
GET  /api/v1/detections   →  Get history of all past detections
GET  /api/v1/detections/{id}  →  Get one specific detection by ID
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
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


def _gdi_description(gdi: float) -> str:
    if gdi >= 75: return "Critical — heavy garbage accumulation, immediate cleanup needed"
    if gdi >= 50: return "High — significant garbage present, schedule cleanup"
    if gdi >= 40: return "Moderate — noticeable garbage, regular monitoring needed"
    if gdi >= 20: return "Low — some garbage detected, river is relatively clean"
    if gdi > 0: return "Minimal — very little garbage detected"
    return "Clean — no garbage detected"


@router.post("/detect")
async def detect_image(
    file: UploadFile = File(..., description="Upload a river/garbage image (JPG or PNG)"),
    latitude: float = Query(default=None, description="GPS latitude"),
    longitude: float = Query(default=None, description="GPS longitude"),
    location_name: str = Query(default=None, description="Location name"),
    db: AsyncSession = Depends(get_db),
):
    """Upload a photo and detect garbage."""
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg", "image/webp"]:
        raise HTTPException(status_code=400, detail="Please upload a JPG or PNG image.")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    image.save(filepath)

    result = detect_garbage(image)

    event = DetectionEvent(
        timestamp=datetime.now(timezone.utc),
        image_filename=filename,
        detections=result["detections"],
        num_objects=result["num_objects"],
        class_counts=result["class_counts"],
        gdi_score=result["gdi_score"],
        dri_score=0,
        alert_tier=result["pollution_level"],
        turbidity_score=result["turbidity_score"],
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

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
            "pollution_level": result["pollution_level"],
            "alert_tier": result["pollution_level"],
        },
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "name": location_name,
        },
    }


@router.get("/detections")
async def get_all_detections(
    limit: int = Query(default=20),
    db: AsyncSession = Depends(get_db),
):
    """Get history of all past detection scans."""
    result = await db.execute(
        select(DetectionEvent).order_by(DetectionEvent.timestamp.desc()).limit(limit)
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
                "pollution_level": e.alert_tier,
                "location": e.location_name,
            }
            for e in events
        ],
    }


@router.get("/detections/{event_id}")
async def get_detection_by_id(event_id: int, db: AsyncSession = Depends(get_db)):
    """Get details of one specific detection scan."""
    result = await db.execute(select(DetectionEvent).where(DetectionEvent.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail=f"Detection {event_id} not found")

    return {
        "id": event.id,
        "timestamp": event.timestamp.isoformat(),
        "image_url": f"/uploads/{event.image_filename}" if event.image_filename else None,
        "num_objects": event.num_objects,
        "class_counts": event.class_counts,
        "detections": event.detections,
        "gdi_score": round(event.gdi_score, 2),
        "turbidity_score": round(event.turbidity_score, 2),
        "pollution_level": event.alert_tier,
        "location": {
            "latitude": event.latitude,
            "longitude": event.longitude,
            "name": event.location_name,
        },
    }