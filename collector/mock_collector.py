import random
import json
import os
import math
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Optional
from pathlib import Path

from collector.base import BaseCollector, RawFare
from api.config import settings

class MockCollector(BaseCollector):
    """
    High-fidelity market simulator generating realistic airline and OTA fare observations.
    Includes booking-window escalation, weekend/festival seasonality, OTA duplicate listings,
    occasional sold-out flights, and price spikes.
    """

    AIRLINES = [
        {"name": "IndiGo", "code": "6E", "type": "LCC", "multiplier": 1.00, "market_share": 0.60},
        {"name": "Air India", "code": "AI", "type": "FSC", "multiplier": 1.15, "market_share": 0.15},
        {"name": "Akasa Air", "code": "QP", "type": "LCC", "multiplier": 0.95, "market_share": 0.10},
        {"name": "SpiceJet", "code": "SG", "type": "LCC", "multiplier": 0.92, "market_share": 0.08},
        {"name": "Air India Express", "code": "IX", "type": "LCC", "multiplier": 0.94, "market_share": 0.07},
    ]

    OTAS = [
        {"name": "MakeMyTrip", "fee_bias": 250.0, "discount_prob": 0.20, "discount_amount": 200.0},
        {"name": "Goibibo", "fee_bias": 220.0, "discount_prob": 0.25, "discount_amount": 250.0},
        {"name": "Cleartrip", "fee_bias": 180.0, "discount_prob": 0.15, "discount_amount": 300.0},
        {"name": "EaseMyTrip", "fee_bias": 0.0, "discount_prob": 0.10, "discount_amount": 150.0}, # Zero convenience fee model
    ]

    DEPARTURE_SLOTS = [
        ("06:00", 1.05), ("07:15", 1.10), ("08:45", 1.12),
        ("11:30", 0.92), ("13:15", 0.90), ("15:40", 0.95),
        ("18:10", 1.15), ("19:45", 1.18), ("21:30", 1.02),
        ("23:15", 0.85)
    ]

    def __init__(self, routes_metadata: Optional[List[Dict]] = None):
        super().__init__(name="MockIndianAviationCollector", source_type="aggregator", rate_limit_rps=100.0)
        self.routes_metadata = routes_metadata or self._load_routes_metadata()
        self.snapshot_dir = Path(settings.RAW_SNAPSHOT_DIR)
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)
        self.total_fetched = 0
        self.total_errors = 0

    def _load_routes_metadata(self) -> List[Dict]:
        path = Path(settings.ROUTES_JSON_PATH)
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def _get_route_info(self, route_id: str) -> Dict:
        for r in self.routes_metadata:
            if r["route_id"] == route_id:
                return r
        # Default fallback
        parts = route_id.split("-")
        return {
            "route_id": route_id,
            "origin": parts[0] if len(parts) > 0 else "DEL",
            "destination": parts[1] if len(parts) > 1 else "BOM",
            "base_fare_inr": 4800.0,
            "distance_km": 1150
        }

    def _calculate_booking_multiplier(self, booking_days: int) -> float:
        """Exponential decay curve: fares escalate sharply in the final 7 days."""
        if booking_days <= 1:
            return 2.10 + random.uniform(-0.15, 0.25)
        elif booking_days <= 3:
            return 1.70 + random.uniform(-0.10, 0.15)
        elif booking_days <= 7:
            return 1.35 + random.uniform(-0.08, 0.10)
        elif booking_days <= 14:
            return 1.10 + random.uniform(-0.05, 0.08)
        elif booking_days <= 30:
            return 0.98 + random.uniform(-0.04, 0.05)
        else: # 31 - 60 days
            return 0.85 + random.uniform(-0.05, 0.05)

    def _calculate_seasonality_multiplier(self, travel_dt: date) -> float:
        """Weekend surge & Indian festival seasonality multipliers."""
        mult = 1.0
        # Day of week: Friday (4) and Sunday (6) peak travel
        weekday = travel_dt.weekday()
        if weekday in (4, 6):
            mult *= 1.16
        elif weekday in (1, 2):  # Tue/Wed mid-week dip
            mult *= 0.92

        # Month seasonality: Summer vacation (May-June) & Holiday/Festival (Oct, Nov, Dec)
        month = travel_dt.month
        if month in (5, 6):  # Summer peak
            mult *= 1.12
        elif month in (10, 11):  # Diwali / Durga Puja season
            mult *= 1.22
        elif month == 12:  # Year end holidays
            mult *= 1.25
        elif month in (1, 2):  # Post-holiday dip
            mult *= 0.94

        return mult

    def fetch(self, route: str, travel_date: str, force_spike: bool = False, spike_multiplier: float = 1.50) -> List[RawFare]:
        """
        Generates realistic physical flights and their duplicate scraped representations across OTAs.
        """
        route_info = self._get_route_info(route)
        origin = route_info["origin"]
        destination = route_info["destination"]
        nominal_base = route_info.get("base_fare_inr", 4800.0)

        travel_dt = datetime.strptime(travel_date, "%Y-%m-%d").date()
        today = date.today()
        booking_window_days = max(1, (travel_dt - today).days)

        booking_mult = self._calculate_booking_multiplier(booking_window_days)
        season_mult = self._calculate_seasonality_multiplier(travel_dt)

        observations: List[RawFare] = []
        now = datetime.now()

        # Generate 6 to 12 scheduled flights per route
        num_flights = random.randint(6, 10)
        selected_slots = random.sample(self.DEPARTURE_SLOTS, min(num_flights, len(self.DEPARTURE_SLOTS)))

        for i, (slot_time, slot_mult) in enumerate(selected_slots):
            # Select airline based on market share weights
            airline_obj = random.choices(
                self.AIRLINES,
                weights=[a["market_share"] for a in self.AIRLINES],
                k=1
            )[0]

            flight_no = f"{airline_obj['code']}-{random.randint(101, 899)}"
            is_sold_out = (booking_window_days <= 2) and (random.random() < 0.05)

            # Baseline calculation
            raw_base = nominal_base * airline_obj["multiplier"] * booking_mult * season_mult * slot_mult
            
            # Natural spike (2% chance) or forced simulation spike
            is_spiked = force_spike or (random.random() < 0.02)
            if is_spiked:
                raw_base *= spike_multiplier

            # Add minor random noise
            raw_base *= random.uniform(0.96, 1.04)
            base_fare = round(raw_base, 2)

            # Taxes & government levies (approx 12% GST/aviation security + UDF ₹450)
            taxes = round(base_fare * 0.08 + 450.0, 2)
            direct_fees = 0.0
            direct_total = round(base_fare + taxes + direct_fees, 2)

            # 1. Direct Airline portal observation
            airline_obs = RawFare(
                observed_at=now,
                source_type="airline",
                source_name=airline_obj["name"],
                origin=origin,
                destination=destination,
                flight_no=flight_no,
                airline=airline_obj["name"],
                departure_date=travel_date,
                departure_time=slot_time,
                booking_window_days=booking_window_days,
                cabin="economy",
                fare_type="standard",
                base_fare=base_fare,
                taxes=taxes,
                fees=direct_fees,
                total_fare=direct_total,
                baggage_included=True,
                is_sold_out=is_sold_out,
                raw_snapshot_path=None
            )
            observations.append(airline_obs)

            # 2. OTAs listing this same flight (Deduplication targets)
            # 2 to 4 OTAs list each flight with slightly varying convenience fees / discounts
            active_otas = random.sample(self.OTAS, random.randint(2, len(self.OTAS)))
            for ota in active_otas:
                ota_fee = ota["fee_bias"]
                ota_discount = ota["discount_amount"] if random.random() < ota["discount_prob"] else 0.0
                ota_total = round(base_fare + taxes + ota_fee - ota_discount, 2)

                ota_obs = RawFare(
                    observed_at=now,
                    source_type="ota",
                    source_name=ota["name"],
                    origin=origin,
                    destination=destination,
                    flight_no=flight_no,
                    airline=airline_obj["name"],
                    departure_date=travel_date,
                    departure_time=slot_time,
                    booking_window_days=booking_window_days,
                    cabin="economy",
                    fare_type="standard",
                    base_fare=base_fare,
                    taxes=taxes,
                    fees=round(ota_fee - ota_discount, 2),
                    total_fare=ota_total,
                    baggage_included=True,
                    is_sold_out=is_sold_out,
                    raw_snapshot_path=None
                )
                observations.append(ota_obs)

        # Persist raw snapshot for auditability
        snapshot_filename = f"{now.strftime('%Y%m%d_%H%M%S')}_{origin}_{destination}.json"
        snapshot_path = self.snapshot_dir / snapshot_filename
        try:
            with open(snapshot_path, "w", encoding="utf-8") as f:
                json.dump([o.to_dict() for o in observations], f, indent=2)
            for obs in observations:
                obs.raw_snapshot_path = str(snapshot_path)
        except Exception as e:
            self.total_errors += 1

        self.total_fetched += len(observations)
        return observations

    def health_check(self) -> dict:
        return {
            "name": self.name,
            "status": "healthy",
            "mode": "mock",
            "total_observations_generated": self.total_fetched,
            "total_errors": self.total_errors,
            "snapshot_dir": str(self.snapshot_dir),
            "airlines_modeled": [a["name"] for a in self.AIRLINES],
            "otas_modeled": [o["name"] for o in self.OTAS]
        }
