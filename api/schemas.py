from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class AirportBase(BaseModel):
    code: str
    name: str
    city: str
    state: str
    region: str
    lat: float
    lng: float

    model_config = ConfigDict(from_attributes=True)

class RouteBase(BaseModel):
    route_id: str
    origin: str
    destination: str
    distance_km: int
    weight: float
    typical_duration_min: int
    base_fare_inr: float
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class RouteDetail(RouteBase):
    origin_city: Optional[str] = None
    dest_city: Optional[str] = None
    origin_region: Optional[str] = None
    dest_region: Optional[str] = None
    current_index: Optional[float] = None
    current_fare: Optional[float] = None
    change_24h_pct: Optional[float] = None
    has_spike: Optional[bool] = False
    min_fare: Optional[float] = None
    max_fare: Optional[float] = None
    updated_at: Optional[str] = None

class FareObservationSchema(BaseModel):
    id: int
    observed_at: datetime
    source_type: str
    source_name: str
    origin: str
    destination: str
    flight_no: str
    airline: str
    departure_date: str
    departure_time: str
    booking_window_days: int
    cabin: str
    fare_type: str
    base_fare: float
    taxes: float
    fees: float
    total_fare: float
    baggage_included: bool
    is_sold_out: bool
    is_duplicate: bool
    is_outlier: bool

    model_config = ConfigDict(from_attributes=True)

class IndexValueSchema(BaseModel):
    id: int
    calculated_at: datetime
    date: str
    period_type: str
    level: str
    entity_id: Optional[str]
    index_value: float
    base_value: float
    mom_change_pct: Optional[float]
    sample_size: int

    model_config = ConfigDict(from_attributes=True)

class AlertSchema(BaseModel):
    id: int
    created_at: datetime
    alert_type: str
    route_id: str
    origin: str
    destination: str
    flight_no: Optional[str]
    airline: Optional[str]
    current_fare: float
    baseline_fare: float
    change_pct: float
    index_value: float
    z_score: Optional[float]
    severity: str
    message: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class CollectorRunSchema(BaseModel):
    id: int
    started_at: datetime
    completed_at: Optional[datetime]
    source_name: str
    source_type: str
    status: str
    items_collected: int
    items_deduped: int
    outliers_flagged: int
    duration_ms: int
    error_message: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class NationalIndexSummary(BaseModel):
    latest_index: float
    mom_change_pct: float
    base_value: float
    as_of_date: str
    hourly_trend_24h: List[Dict[str, Any]]
    historical_daily: List[Dict[str, Any]]
    regional_breakdown: Dict[str, float]
    sample_count: int

class BacktestResponse(BaseModel):
    days: int
    benchmark_name: str
    series: List[Dict[str, Any]]
    metrics: Dict[str, float]

class SimulateSpikeRequest(BaseModel):
    route_id: str = "DEL-BOM"
    spike_multiplier: float = 1.45
    airline: Optional[str] = "IndiGo"
