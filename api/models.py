from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from api.database import Base

class Airport(Base):
    __tablename__ = "airports"

    code = Column(String(10), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    city = Column(String(50), nullable=False)
    state = Column(String(50), nullable=False)
    region = Column(String(20), nullable=False)  # North, South, East, West
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

    routes_out = relationship("Route", back_populates="origin_airport", foreign_keys="Route.origin")
    routes_in = relationship("Route", back_populates="dest_airport", foreign_keys="Route.destination")


class Route(Base):
    __tablename__ = "routes"

    route_id = Column(String(20), primary_key=True, index=True)  # e.g., DEL-BOM
    origin = Column(String(10), ForeignKey("airports.code"), nullable=False)
    destination = Column(String(10), ForeignKey("airports.code"), nullable=False)
    distance_km = Column(Integer, nullable=False)
    weight = Column(Float, nullable=False, default=0.0)  # Passenger volume weight
    typical_duration_min = Column(Integer, default=120)
    base_fare_inr = Column(Float, default=4500.0)
    is_active = Column(Boolean, default=True)

    origin_airport = relationship("Airport", back_populates="routes_out", foreign_keys=[origin])
    dest_airport = relationship("Airport", back_populates="routes_in", foreign_keys=[destination])


class FareObservation(Base):
    __tablename__ = "fare_observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    observed_at = Column(DateTime, default=datetime.utcnow, index=True)
    source_type = Column(String(20), nullable=False)  # airline | ota
    source_name = Column(String(50), nullable=False)  # IndiGo, MakeMyTrip, etc.
    origin = Column(String(10), nullable=False, index=True)
    destination = Column(String(10), nullable=False, index=True)
    flight_no = Column(String(20), nullable=False)
    airline = Column(String(50), nullable=False)
    departure_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    departure_time = Column(String(10), nullable=False)  # HH:MM
    booking_window_days = Column(Integer, nullable=False)
    cabin = Column(String(20), default="economy")
    fare_type = Column(String(20), default="standard")  # saver | standard | flexi
    base_fare = Column(Float, nullable=False)
    taxes = Column(Float, nullable=False)
    fees = Column(Float, nullable=False)
    total_fare = Column(Float, nullable=False, index=True)
    baggage_included = Column(Boolean, default=True)
    is_sold_out = Column(Boolean, default=False)
    is_duplicate = Column(Boolean, default=False)
    is_outlier = Column(Boolean, default=False)
    raw_snapshot_path = Column(String(255), nullable=True)

    __table_args__ = (
        Index("idx_fare_lookup", "origin", "destination", "departure_date"),
        Index("idx_flight_date", "flight_no", "departure_date"),
    )


class IndexValue(Base):
    __tablename__ = "index_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    calculated_at = Column(DateTime, default=datetime.utcnow, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    period_type = Column(String(20), default="daily")  # hourly | daily
    level = Column(String(20), nullable=False)  # national | regional | route
    entity_id = Column(String(50), nullable=True, index=True)  # "national", "North", "DEL-BOM"
    index_value = Column(Float, nullable=False)
    base_value = Column(Float, default=100.0)
    mom_change_pct = Column(Float, nullable=True)
    sample_size = Column(Integer, default=0)

    __table_args__ = (
        Index("idx_level_entity_date", "level", "entity_id", "date"),
    )


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    alert_type = Column(String(50), nullable=False)  # spike | sudden_drop | peak_surge
    route_id = Column(String(20), nullable=False, index=True)
    origin = Column(String(10), nullable=False)
    destination = Column(String(10), nullable=False)
    flight_no = Column(String(20), nullable=True)
    airline = Column(String(50), nullable=True)
    current_fare = Column(Float, nullable=False)
    baseline_fare = Column(Float, nullable=False)
    change_pct = Column(Float, nullable=False)
    index_value = Column(Float, nullable=False)
    z_score = Column(Float, nullable=True)
    severity = Column(String(20), default="WARNING")  # INFO | WARNING | CRITICAL
    message = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)


class CollectorRun(Base):
    __tablename__ = "collector_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    source_name = Column(String(50), nullable=False)
    source_type = Column(String(20), nullable=False)
    status = Column(String(20), default="running")  # success | failed | partial
    items_collected = Column(Integer, default=0)
    items_deduped = Column(Integer, default=0)
    outliers_flagged = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
