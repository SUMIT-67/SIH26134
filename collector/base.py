from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from typing import List, Optional
from datetime import datetime
import time

@dataclass
class RawFare:
    observed_at: datetime
    source_type: str        # "airline" | "ota"
    source_name: str        # e.g., "IndiGo", "MakeMyTrip"
    origin: str             # e.g., "DEL"
    destination: str        # e.g., "BOM"
    flight_no: str          # e.g., "6E-2041"
    airline: str            # e.g., "IndiGo"
    departure_date: str     # "YYYY-MM-DD"
    departure_time: str     # "HH:MM"
    booking_window_days: int
    cabin: str = "economy"
    fare_type: str = "standard"  # saver | standard | flexi
    base_fare: float = 0.0
    taxes: float = 0.0
    fees: float = 0.0
    total_fare: float = 0.0
    baggage_included: bool = True
    is_sold_out: bool = False
    raw_snapshot_path: Optional[str] = None

    def to_dict(self):
        d = asdict(self)
        d["observed_at"] = self.observed_at.isoformat()
        return d


class BaseCollector(ABC):
    """
    Abstract Base Class for all airline and OTA collectors.
    """
    def __init__(self, name: str, source_type: str, rate_limit_rps: float = 1.0):
        self.name = name
        self.source_type = source_type
        self.rate_limit_interval = 1.0 / max(rate_limit_rps, 0.1)
        self.last_request_time = 0.0

    def enforce_rate_limit(self):
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.rate_limit_interval:
            time.sleep(self.rate_limit_interval - elapsed)
        self.last_request_time = time.time()

    @abstractmethod
    def fetch(self, route: str, travel_date: str) -> List[RawFare]:
        """
        Fetch flight observations for a given route (e.g., 'DEL-BOM') and travel date ('YYYY-MM-DD').
        """
        pass

    @abstractmethod
    def health_check(self) -> dict:
        """
        Return health metrics for this collector.
        """
        pass
