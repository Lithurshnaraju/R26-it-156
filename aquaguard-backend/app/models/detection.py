"""
Database Models
This defines the structure of data we save in the database.
Think of it like creating a table in Excel with specific columns.
"""

from sqlalchemy import Column, Integer, Float, String, DateTime, JSON
from datetime import datetime, timezone
from app.database import Base


class DetectionEvent(Base):
    """
    Every time someone uploads an image for detection,
    we save the results here. Each row = one detection scan.
    """
    __tablename__ = "detection_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    image_filename = Column(String, nullable=True)

    # What was detected
    detections = Column(JSON)       # Full list: [{class, confidence, bbox}, ...]
    num_objects = Column(Integer, default=0)
    class_counts = Column(JSON)     # Summary: {"plastic": 3, "glass": 1}

    # Risk scores (your novel contribution)
    gdi_score = Column(Float, default=0.0)       # Garbage Density Index (0-100)
    dri_score = Column(Float, default=0.0)       # Drowning Risk Index (0-100)
    alert_tier = Column(String, default="none")  # none / yellow / orange / red
    turbidity_score = Column(Float, default=0.0) # Water clarity estimate (0-100)

    # Location (GPS coordinates from mobile phone)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)
