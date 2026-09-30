import math
import numpy as np
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, date, timedelta
import logging

from api.models import FareObservation, Route, Airport, IndexValue
from api.normalization import NormalizationEngine

logger = logging.getLogger(__name__)

class IndexEngine:
    """
    Econometric Index Calculation Engine compliant with MoSPI DIID standards
    and the ILO/IMF Consumer Price Index Manual (2020).
    Implements Jevons elementary aggregation (geometric mean) and Laspeyres/Young
    higher-level weighted aggregation across routes and regions.
    """

    BUCKET_WEIGHTS = {
        "1-3": 0.20,
        "4-7": 0.25,
        "8-14": 0.30,
        "15-30": 0.15,
        "31-60": 0.10
    }

    def __init__(self):
        # Baseline geometric means per (route_id, booking_bucket): {(route_id, bucket): base_geom_mean}
        self.baseline_prices: Dict[Tuple[str, str], float] = {}

    @staticmethod
    def geometric_mean(prices: List[float]) -> float:
        """
        Computes the unweighted geometric mean of a list of positive prices:
        G = exp( (1/n) * sum(ln(p_i)) )
        """
        valid = [p for p in prices if p is not None and p > 0]
        if not valid:
            return 0.0
        log_sum = sum(math.log(p) for p in valid)
        return math.exp(log_sum / len(valid))

    def set_baselines(self, baseline_data: Dict[Tuple[str, str], float]):
        """
        Sets the reference base period prices (Day 1-7 geometric means).
        """
        self.baseline_prices = baseline_data

    def compute_elementary_jevons(self, current_prices: List[float], route_id: str, bucket: str) -> float:
        """
        Computes Jevons elementary index for a given route and booking-window cell:
        I_{r,b}^t = 100 * (G_{r,b}^t / G_{r,b}^0)
        """
        if not current_prices:
            return 100.0  # Carry forward unchanged if no transactions

        current_geom = self.geometric_mean(current_prices)
        base_geom = self.baseline_prices.get((route_id, bucket))

        if not base_geom or base_geom <= 0:
            # If no explicit baseline is pre-stored, use current as base
            self.baseline_prices[(route_id, bucket)] = current_geom
            return 100.0

        return round(100.0 * (current_geom / base_geom), 2)

    def compute_route_index(self, fares_by_bucket: Dict[str, List[float]], route_id: str) -> float:
        """
        Rolls up booking window cells into a single Route Price Index
        using DGCA booking horizon weights:
        I_r^t = sum_b (w_b * I_{r,b}^t)
        """
        total_weight = 0.0
        weighted_sum = 0.0

        for bucket, weight in self.BUCKET_WEIGHTS.items():
            prices = fares_by_bucket.get(bucket, [])
            cell_index = self.compute_elementary_jevons(prices, route_id, bucket)
            weighted_sum += cell_index * weight
            total_weight += weight

        if total_weight == 0:
            return 100.0

        return round(weighted_sum / total_weight, 2)

    def aggregate_regional_and_national(
        self,
        route_indices: Dict[str, float],
        routes_metadata: List[Dict[str, Any]]
    ) -> Tuple[float, Dict[str, float]]:
        """
        Rolls up Route Indices into Regional and National Indices
        using passenger traffic weights:
        I_national = sum_r (W_r * I_r)
        I_region = sum_{r in region} (W_r * I_r) / sum_{r in region} W_r
        """
        national_weighted_sum = 0.0
        national_total_weight = 0.0

        regional_sums: Dict[str, float] = {"North": 0.0, "South": 0.0, "East": 0.0, "West": 0.0}
        regional_weights: Dict[str, float] = {"North": 0.0, "South": 0.0, "East": 0.0, "West": 0.0}

        for r_meta in routes_metadata:
            r_id = r_meta["route_id"]
            idx = route_indices.get(r_id, 100.0)
            weight = r_meta.get("weight", 0.0)
            origin_region = r_meta.get("origin_region", "North")

            national_weighted_sum += idx * weight
            national_total_weight += weight

            if origin_region in regional_sums:
                regional_sums[origin_region] += idx * weight
                regional_weights[origin_region] += weight

        national_index = round(national_weighted_sum / national_total_weight, 2) if national_total_weight > 0 else 100.0

        regional_indices = {}
        for reg, w_sum in regional_sums.items():
            reg_w = regional_weights.get(reg, 0.0)
            regional_indices[reg] = round(w_sum / reg_w, 2) if reg_w > 0 else 100.0

        return national_index, regional_indices

    @staticmethod
    def calculate_mom_change(current_index: float, previous_month_index: float) -> float:
        """
        Calculates Month-on-Month inflation percentage:
        MoM = ((I_t - I_{t-30d}) / I_{t-30d}) * 100%
        """
        if not previous_month_index or previous_month_index <= 0:
            return 0.0
        return round(((current_index - previous_month_index) / previous_month_index) * 100.0, 2)

index_engine = IndexEngine()
