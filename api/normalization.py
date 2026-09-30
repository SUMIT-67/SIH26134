import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Any
from datetime import datetime
import logging

from collector.base import RawFare
from api.config import settings

logger = logging.getLogger(__name__)

class NormalizationEngine:
    """
    Standardizes scraped airline and OTA fares into a unified statistical basket,
    executes cross-portal deduplication, and flags statistical outliers.
    """

    BOOKING_BUCKETS = {
        "1-3": (1, 3, 0.20),
        "4-7": (4, 7, 0.25),
        "8-14": (8, 14, 0.30),
        "15-30": (15, 30, 0.15),
        "31-60": (31, 60, 0.10)
    }

    @staticmethod
    def get_booking_bucket(days: int) -> str:
        if days <= 3:
            return "1-3"
        elif days <= 7:
            return "4-7"
        elif days <= 14:
            return "8-14"
        elif days <= 30:
            return "15-30"
        else:
            return "31-60"

    @staticmethod
    def validate_standard_basket(raw: RawFare) -> bool:
        """
        Validates that observation matches MoSPI Standard Consumer Airfare Basket:
        Economy cabin, standard fare, positive base fare, positive total fare.
        Missing != zero: total_fare must be > 0 and base_fare must be > 0.
        """
        if raw.cabin.lower() != "economy":
            return False
        if raw.total_fare is None or raw.total_fare <= 0:
            return False
        if raw.base_fare is None or raw.base_fare <= 0:
            return False
        return True

    def deduplicate(self, raw_fares: List[RawFare]) -> Tuple[List[RawFare], int]:
        """
        Groups identical physical flights across direct airline and multiple OTAs.
        Selects the lowest-price observation as representative consumer price,
        marks alternative listings as duplicates, and records total sources seen.
        """
        if not raw_fares:
            return [], 0

        # Group by unique flight journey: (origin, destination, departure_date, flight_no, cabin)
        grouped: Dict[Tuple[str, str, str, str, str], List[RawFare]] = {}
        for fare in raw_fares:
            if not self.validate_standard_basket(fare):
                continue
            key = (fare.origin, fare.destination, fare.departure_date, fare.flight_no, fare.cabin.lower())
            grouped.setdefault(key, []).append(fare)

        deduped_fares: List[RawFare] = []
        duplicate_count = 0

        for key, flight_group in grouped.items():
            if len(flight_group) == 1:
                flight_group[0].is_duplicate = False
                deduped_fares.append(flight_group[0])
            else:
                # Sort by total_fare ascending to pick the lowest-source price
                flight_group.sort(key=lambda x: x.total_fare)
                best_fare = flight_group[0]
                best_fare.is_duplicate = False
                deduped_fares.append(best_fare)

                # Mark the remaining higher-priced duplicate listings
                for dup in flight_group[1:]:
                    dup.is_duplicate = True
                    deduped_fares.append(dup)
                    duplicate_count += 1

        return deduped_fares, duplicate_count

    def detect_outliers(self, fares: List[RawFare]) -> Tuple[List[RawFare], int]:
        """
        Flags statistical outliers using dual-fence criteria:
        1. Interquartile Range (IQR): [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
        2. Rolling Z-Score: |z| > 3.0
        Outliers remain tagged in the dataset for audit, but excluded from price index math.
        """
        if len(fares) < 4:
            for f in fares:
                f.is_outlier = False
            return fares, 0

        # Partition by (route, booking_bucket) to compute stratum-specific fences
        strata: Dict[Tuple[str, str, str], List[RawFare]] = {}
        for f in fares:
            bucket = self.get_booking_bucket(f.booking_window_days)
            strata.setdefault((f.origin, f.destination, bucket), []).append(f)

        outlier_count = 0

        for stratum_key, stratum_fares in strata.items():
            prices = np.array([f.total_fare for f in stratum_fares])
            
            # 1. IQR calculation
            q25, q75 = np.percentile(prices, 25), np.percentile(prices, 75)
            iqr = q75 - q25
            lower_fence = q25 - (settings.IQR_MULTIPLIER * iqr)
            upper_fence = q75 + (settings.IQR_MULTIPLIER * iqr)

            # 2. Z-score calculation
            mean = np.mean(prices)
            std = np.std(prices) if np.std(prices) > 0 else 1.0

            for f in stratum_fares:
                z = abs(f.total_fare - mean) / std
                is_iqr_outlier = (f.total_fare < lower_fence) or (f.total_fare > upper_fence)
                is_z_outlier = z > settings.OUTLIER_Z_THRESHOLD

                if (is_iqr_outlier and is_z_outlier) or (f.total_fare > 3.5 * mean):
                    f.is_outlier = True
                    outlier_count += 1
                else:
                    f.is_outlier = False

        return fares, outlier_count

    def process(self, raw_fares: List[RawFare]) -> Tuple[List[RawFare], Dict[str, Any]]:
        """
        Full normalization pipeline: Validate -> Deduplicate -> Outlier detection.
        Returns processed observations and summary audit statistics.
        """
        # Step 1: Filter to standard basket
        valid_fares = [f for f in raw_fares if self.validate_standard_basket(f)]

        # Step 2: Deduplicate across channels
        deduped_fares, dup_count = self.deduplicate(valid_fares)

        # Step 3: Statistical outlier tagging
        processed_fares, outlier_count = self.detect_outliers(deduped_fares)

        stats = {
            "total_raw": len(raw_fares),
            "valid_basket_count": len(valid_fares),
            "duplicates_flagged": dup_count,
            "outliers_flagged": outlier_count,
            "index_eligible_count": len([f for f in processed_fares if not f.is_duplicate and not f.is_outlier and not f.is_sold_out])
        }

        return processed_fares, stats

normalization_engine = NormalizationEngine()
