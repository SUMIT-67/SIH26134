import pytest
from datetime import datetime
from collector.base import RawFare
from api.normalization import NormalizationEngine

@pytest.fixture
def normalization_engine():
    return NormalizationEngine()

def test_validate_standard_basket(normalization_engine):
    valid_fare = RawFare(
        observed_at=datetime.now(),
        source_type="airline",
        source_name="IndiGo",
        origin="DEL",
        destination="BOM",
        flight_no="6E-101",
        airline="IndiGo",
        departure_date="2026-10-15",
        departure_time="08:00",
        booking_window_days=10,
        cabin="economy",
        fare_type="standard",
        base_fare=4200.0,
        taxes=650.0,
        fees=0.0,
        total_fare=4850.0
    )
    assert normalization_engine.validate_standard_basket(valid_fare) is True

    # Business class rejected from CPI standard basket
    business_fare = RawFare(
        observed_at=datetime.now(),
        source_type="airline",
        source_name="Air India",
        origin="DEL",
        destination="BOM",
        flight_no="AI-101",
        airline="Air India",
        departure_date="2026-10-15",
        departure_time="08:00",
        booking_window_days=10,
        cabin="business",
        fare_type="standard",
        base_fare=15000.0,
        taxes=1200.0,
        fees=0.0,
        total_fare=16200.0
    )
    assert normalization_engine.validate_standard_basket(business_fare) is False

    # Missing != zero (zero fare rejected)
    zero_fare = RawFare(
        observed_at=datetime.now(),
        source_type="airline",
        source_name="IndiGo",
        origin="DEL",
        destination="BOM",
        flight_no="6E-102",
        airline="IndiGo",
        departure_date="2026-10-15",
        departure_time="09:00",
        booking_window_days=10,
        cabin="economy",
        fare_type="standard",
        base_fare=0.0,
        taxes=0.0,
        fees=0.0,
        total_fare=0.0
    )
    assert normalization_engine.validate_standard_basket(zero_fare) is False

def test_deduplication(normalization_engine):
    # Same flight listed on direct airline and two OTAs
    base_attrs = dict(
        observed_at=datetime.now(),
        origin="DEL",
        destination="BOM",
        flight_no="6E-2041",
        airline="IndiGo",
        departure_date="2026-10-20",
        departure_time="10:00",
        booking_window_days=15,
        cabin="economy",
        fare_type="standard"
    )

    f1 = RawFare(source_type="airline", source_name="IndiGo", base_fare=4500.0, taxes=500.0, fees=0.0, total_fare=5000.0, **base_attrs)
    f2 = RawFare(source_type="ota", source_name="MakeMyTrip", base_fare=4500.0, taxes=500.0, fees=250.0, total_fare=5250.0, **base_attrs)
    f3 = RawFare(source_type="ota", source_name="Cleartrip", base_fare=4500.0, taxes=500.0, fees=150.0, total_fare=4950.0, **base_attrs) # discounted

    processed, dup_count = normalization_engine.deduplicate([f1, f2, f3])
    assert dup_count == 2
    # The lowest fare (Cleartrip @ 4950) should be retained as non-duplicate
    active_reps = [f for f in processed if not f.is_duplicate]
    assert len(active_reps) == 1
    assert active_reps[0].total_fare == 4950.0

def test_detect_outliers(normalization_engine):
    base_attrs = dict(
        observed_at=datetime.now(),
        source_type="airline",
        source_name="IndiGo",
        origin="DEL",
        destination="BOM",
        departure_date="2026-10-25",
        departure_time="12:00",
        booking_window_days=10,
        cabin="economy",
        fare_type="standard",
        taxes=500.0,
        fees=0.0
    )

    normal_fares = [
        RawFare(flight_no=f"6E-{i}", airline="IndiGo", base_fare=4000.0 + (i * 50), total_fare=4500.0 + (i * 50), **base_attrs)
        for i in range(15)
    ]
    # Inject extreme outlier
    outlier_fare = RawFare(flight_no="6E-999", airline="IndiGo", base_fare=35000.0, total_fare=36000.0, **base_attrs)

    all_fares = normal_fares + [outlier_fare]
    processed, outlier_count = normalization_engine.detect_outliers(all_fares)

    assert outlier_count >= 1
    flagged_outliers = [f for f in processed if f.is_outlier]
    assert len(flagged_outliers) >= 1
    assert flagged_outliers[0].total_fare == 36000.0
