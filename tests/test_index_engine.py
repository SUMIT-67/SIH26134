import pytest
import math
from api.index_engine import IndexEngine

@pytest.fixture
def index_engine():
    return IndexEngine()

def test_geometric_mean(index_engine):
    # Geometric mean of [2, 8] is sqrt(16) = 4.0
    assert pytest.approx(index_engine.geometric_mean([2.0, 8.0]), 0.001) == 4.0

    # Geometric mean of [1000, 2000, 4000] = (8 * 10^9)^(1/3) = 2000.0
    assert pytest.approx(index_engine.geometric_mean([1000.0, 2000.0, 4000.0]), 0.001) == 2000.0

def test_jevons_elementary_index(index_engine):
    # Set baseline price for DEL-BOM bucket 8-14 to 5000.0
    index_engine.set_baselines({("DEL-BOM", "8-14"): 5000.0})

    # Current prices: average 5500.0 (+10%)
    current_prices = [5200.0, 5500.0, 5800.0]
    computed_index = index_engine.compute_elementary_jevons(current_prices, "DEL-BOM", "8-14")

    expected_geom = index_engine.geometric_mean(current_prices)
    expected_index = round(100.0 * (expected_geom / 5000.0), 2)
    assert computed_index == expected_index

def test_route_index_rollup(index_engine):
    # Setup baselines for all 5 buckets
    baselines = {("DEL-BOM", b): 4000.0 for b in index_engine.BUCKET_WEIGHTS}
    index_engine.set_baselines(baselines)

    # All buckets have prices equal to baseline => Index should be 100.0
    fares_by_bucket = {b: [4000.0] for b in index_engine.BUCKET_WEIGHTS}
    route_idx = index_engine.compute_route_index(fares_by_bucket, "DEL-BOM")
    assert route_idx == 100.0

    # If all buckets double in price => Index should be 200.0
    double_fares = {b: [8000.0] for b in index_engine.BUCKET_WEIGHTS}
    route_idx_2 = index_engine.compute_route_index(double_fares, "DEL-BOM")
    assert route_idx_2 == 200.0

def test_regional_and_national_aggregation(index_engine):
    route_indices = {
        "DEL-BOM": 110.0,
        "DEL-BLR": 120.0
    }
    routes_metadata = [
        {"route_id": "DEL-BOM", "weight": 0.60, "origin_region": "North"},
        {"route_id": "DEL-BLR", "weight": 0.40, "origin_region": "North"}
    ]

    nat_idx, reg_indices = index_engine.aggregate_regional_and_national(route_indices, routes_metadata)
    # Expected national: (110 * 0.6) + (120 * 0.4) = 66 + 48 = 114.0
    assert nat_idx == 114.0
    assert reg_indices["North"] == 114.0

def test_calculate_mom_change(index_engine):
    # 110 vs 100 => +10.0%
    assert index_engine.calculate_mom_change(110.0, 100.0) == 10.0
    # 95 vs 100 => -5.0%
    assert index_engine.calculate_mom_change(95.0, 100.0) == -5.0
    # Zero or missing previous returns 0.0
    assert index_engine.calculate_mom_change(105.0, 0.0) == 0.0
