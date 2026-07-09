"""
Analytics Routes — API endpoints for dashboard data

GET /api/v1/analytics/summary           →  Overall statistics
GET /api/v1/analytics/class-distribution →  Count of each garbage type
GET /api/v1/analytics/gdi-trend          →  GDI/DRI scores over time
GET /api/v1/analytics/alerts             →  History of triggered alerts
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models.detection import DetectionEvent

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics Dashboard"])


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    """
    📊 Overall statistics — show this on the main dashboard.
    Returns total scans, total objects, average scores, and alert counts.
    """
    total_events = (await db.execute(select(func.count(DetectionEvent.id)))).scalar() or 0
    total_objects = (await db.execute(select(func.sum(DetectionEvent.num_objects)))).scalar() or 0
    avg_gdi = (await db.execute(select(func.avg(DetectionEvent.gdi_score)))).scalar() or 0
    avg_dri = (await db.execute(select(func.avg(DetectionEvent.dri_score)))).scalar() or 0

    yellow = (await db.execute(
        select(func.count(DetectionEvent.id)).where(DetectionEvent.alert_tier == "yellow")
    )).scalar() or 0
    orange = (await db.execute(
        select(func.count(DetectionEvent.id)).where(DetectionEvent.alert_tier == "orange")
    )).scalar() or 0
    red = (await db.execute(
        select(func.count(DetectionEvent.id)).where(DetectionEvent.alert_tier == "red")
    )).scalar() or 0

    return {
        "total_scans": total_events,
        "total_objects_detected": total_objects,
        "average_gdi_score": round(avg_gdi, 2),
        "average_dri_score": round(avg_dri, 2),
        "alert_counts": {
            "yellow_alerts": yellow,
            "orange_alerts": orange,
            "red_alerts": red,
            "total_alerts": yellow + orange + red,
        },
    }


@router.get("/class-distribution")
async def class_distribution(db: AsyncSession = Depends(get_db)):
    """
    🥧 Count of each garbage type — use this for a pie chart.
    Example response: {"plastic": 45, "glass": 12, "metal": 8}
    """
    result = await db.execute(
        select(DetectionEvent.class_counts).where(DetectionEvent.class_counts.isnot(None))
    )
    rows = result.scalars().all()

    totals = {}
    for counts in rows:
        if isinstance(counts, dict):
            for cls_name, count in counts.items():
                totals[cls_name] = totals.get(cls_name, 0) + count

    return {
        "class_distribution": totals,
        "total_objects": sum(totals.values()),
    }


@router.get("/gdi-trend")
async def gdi_trend(
    hours: int = Query(default=24, description="How many hours to look back"),
    db: AsyncSession = Depends(get_db),
):
    """
    📈 GDI and DRI scores over time — use this for a line chart.
    Shows how pollution has changed in the last N hours.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    result = await db.execute(
        select(
            DetectionEvent.timestamp,
            DetectionEvent.gdi_score,
            DetectionEvent.dri_score,
            DetectionEvent.alert_tier,
        )
        .where(DetectionEvent.timestamp >= since)
        .order_by(DetectionEvent.timestamp)
    )
    rows = result.all()

    return {
        "period_hours": hours,
        "data_points": [
            {
                "timestamp": row.timestamp.isoformat(),
                "gdi_score": round(row.gdi_score, 2),
                "dri_score": round(row.dri_score, 2),
                "alert_tier": row.alert_tier,
            }
            for row in rows
        ],
    }


@router.get("/alerts")
async def alert_history(
    limit: int = Query(default=20, description="How many alerts to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    🚨 History of triggered alerts — shows when the system detected danger.
    Only returns events where DRI was high enough to trigger an alert.
    """
    result = await db.execute(
        select(DetectionEvent)
        .where(DetectionEvent.alert_tier != "none")
        .order_by(DetectionEvent.timestamp.desc())
        .limit(limit)
    )
    events = result.scalars().all()

    return {
        "total_alerts": len(events),
        "alerts": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "alert_tier": e.alert_tier,
                "gdi_score": round(e.gdi_score, 2),
                "dri_score": round(e.dri_score, 2),
                "class_counts": e.class_counts,
                "num_objects": e.num_objects,
                "location": e.location_name,
                "image_url": f"/uploads/{e.image_filename}" if e.image_filename else None,
            }
            for e in events
        ],
    }
