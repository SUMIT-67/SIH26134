import json
import random
import logging
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

from api.database import engine, SessionLocal, Base
from api.models import Airport, Route, FareObservation, IndexValue, Alert, CollectorRun
from api.normalization import NormalizationEngine, normalization_engine
from api.index_engine import IndexEngine, index_engine
from collector.mock_collector import MockCollector
from api.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

def seed_database():
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_airports = db.query(Airport).count()
        if existing_airports > 0 and db.query(IndexValue).count() > 50:
            logger.info("Database already seeded with sufficient historical data. Skipping duplicate seed.")
            return

        logger.info("Seeding Airports metadata...")
        airports_path = Path(settings.AIRPORTS_JSON_PATH)
        if airports_path.exists():
            with open(airports_path, "r", encoding="utf-8") as f:
                airports_data = json.load(f)
                for a in airports_data:
                    airport_obj = Airport(
                        code=a["code"],
                        name=a["name"],
                        city=a["city"],
                        state=a["state"],
                        region=a["region"],
                        lat=a["lat"],
                        lng=a["lng"]
                    )
                    db.merge(airport_obj)
            db.commit()

        logger.info("Seeding Routes metadata...")
        routes_path = Path(settings.ROUTES_JSON_PATH)
        routes_metadata = []
        if routes_path.exists():
            with open(routes_path, "r", encoding="utf-8") as f:
                routes_metadata = json.load(f)
                for r in routes_metadata:
                    route_obj = Route(
                        route_id=r["route_id"],
                        origin=r["origin"],
                        destination=r["destination"],
                        distance_km=r["distance_km"],
                        weight=r["weight"],
                        typical_duration_min=r.get("typical_duration_min", 120),
                        base_fare_inr=r.get("base_fare_inr", 4800.0),
                        is_active=True
                    )
                    db.merge(route_obj)
            db.commit()

        collector = MockCollector(routes_metadata=routes_metadata)

        # We will generate 30 days of historical data: Day -30 to Day 0 (today)
        end_date = date.today()
        start_date = end_date - timedelta(days=29)
        logger.info(f"Generating 30-day historical time-series from {start_date} to {end_date}...")

        # Step 1: Collect / simulate observations for all 30 days
        all_daily_observations: Dict[str, List[FareObservation]] = {}
        daily_prices_by_route_bucket: Dict[str, Dict[str, Dict[str, List[float]]]] = {}
        # structure: {date_str: {route_id: {bucket: [prices]}}}

        total_obs_inserted = 0

        # Pre-seed 30 days
        for day_offset in range(30):
            current_day = start_date + timedelta(days=day_offset)
            current_day_str = current_day.strftime("%Y-%m-%d")
            daily_prices_by_route_bucket[current_day_str] = {}

            # Collect for sample routes (all 30 directed routes)
            day_observations_to_add = []
            for r_meta in routes_metadata:
                r_id = r_meta["route_id"]
                daily_prices_by_route_bucket[current_day_str][r_id] = {b: [] for b in NormalizationEngine.BOOKING_BUCKETS}

                # Sample 2 booking dates for this observation day (e.g. +2 days out and +12 days out)
                for days_out in [2, 7, 14, 28]:
                    flight_target_date = (current_day + timedelta(days=days_out)).strftime("%Y-%m-%d")
                    raw_fares = collector.fetch(r_id, flight_target_date)
                    processed_fares, stats = normalization_engine.process(raw_fares)

                    bucket = NormalizationEngine.get_booking_bucket(days_out)
                    for f in processed_fares:
                        # Convert to DB model
                        db_obs = FareObservation(
                            observed_at=datetime.combine(current_day, datetime.min.time()) + timedelta(hours=random.randint(6, 22)),
                            source_type=f.source_type,
                            source_name=f.source_name,
                            origin=f.origin,
                            destination=f.destination,
                            flight_no=f.flight_no,
                            airline=f.airline,
                            departure_date=f.departure_date,
                            departure_time=f.departure_time,
                            booking_window_days=f.booking_window_days,
                            cabin=f.cabin,
                            fare_type=f.fare_type,
                            base_fare=f.base_fare,
                            taxes=f.taxes,
                            fees=f.fees,
                            total_fare=f.total_fare,
                            baggage_included=f.baggage_included,
                            is_sold_out=f.is_sold_out,
                            is_duplicate=f.is_duplicate,
                            is_outlier=f.is_outlier,
                            raw_snapshot_path=f.raw_snapshot_path
                        )
                        day_observations_to_add.append(db_obs)

                        # Eligible for index math
                        if not f.is_duplicate and not f.is_outlier and not f.is_sold_out:
                            daily_prices_by_route_bucket[current_day_str][r_id][bucket].append(f.total_fare)

            # Insert in batch
            db.bulk_save_objects(day_observations_to_add)
            db.commit()
            total_obs_inserted += len(day_observations_to_add)
            logger.info(f"Seeded Day {day_offset+1}/30 ({current_day_str}): {len(day_observations_to_add)} fare observations.")

        logger.info(f"Total fare observations seeded: {total_obs_inserted}")

        # Step 2: Calculate Base Period (First 7 days) geometric means
        base_days = [(start_date + timedelta(days=d)).strftime("%Y-%m-%d") for d in range(7)]
        logger.info(f"Computing base period baseline prices from first 7 days: {base_days[0]} to {base_days[-1]}...")
        
        baseline_geom_means: Dict[Tuple[str, str], float] = {}
        for r_meta in routes_metadata:
            r_id = r_meta["route_id"]
            nominal_base = r_meta.get("base_fare_inr", 4800.0)

            for bucket in NormalizationEngine.BOOKING_BUCKETS:
                pooled_base_prices = []
                for b_day in base_days:
                    pooled_base_prices.extend(daily_prices_by_route_bucket.get(b_day, {}).get(r_id, {}).get(bucket, []))
                
                if pooled_base_prices:
                    g_mean = IndexEngine.geometric_mean(pooled_base_prices)
                else:
                    g_mean = nominal_base * 1.10
                
                baseline_geom_means[(r_id, bucket)] = g_mean

        index_engine.set_baselines(baseline_geom_means)
        logger.info(f"Configured {len(baseline_geom_means)} baseline price reference cells.")

        # Step 3: Compute Daily Index Values across all 30 days
        index_records = []
        national_index_history = []

        for day_offset in range(30):
            current_day = start_date + timedelta(days=day_offset)
            current_day_str = current_day.strftime("%Y-%m-%d")
            calc_time = datetime.combine(current_day, datetime.min.time()) + timedelta(hours=18)

            # Compute route indices for this day
            route_indices = {}
            for r_meta in routes_metadata:
                r_id = r_meta["route_id"]
                bucket_prices = daily_prices_by_route_bucket.get(current_day_str, {}).get(r_id, {})
                r_index = index_engine.compute_route_index(bucket_prices, r_id)
                route_indices[r_id] = r_index

                # Store route-level index
                route_rec = IndexValue(
                    calculated_at=calc_time,
                    date=current_day_str,
                    period_type="daily",
                    level="route",
                    entity_id=r_id,
                    index_value=r_index,
                    base_value=100.0,
                    mom_change_pct=None,
                    sample_size=sum(len(v) for v in bucket_prices.values())
                )
                index_records.append(route_rec)

            # Roll up to Regional & National
            nat_idx, reg_indices = index_engine.aggregate_regional_and_national(route_indices, routes_metadata)
            national_index_history.append((current_day_str, nat_idx))

            # Regional index records
            for reg_name, reg_val in reg_indices.items():
                reg_rec = IndexValue(
                    calculated_at=calc_time,
                    date=current_day_str,
                    period_type="daily",
                    level="regional",
                    entity_id=reg_name,
                    index_value=reg_val,
                    base_value=100.0,
                    mom_change_pct=None,
                    sample_size=100
                )
                index_records.append(reg_rec)

            # National index record
            mom_change = None
            if day_offset >= 7:
                # Approximate 7-day or MoM comparison
                base_first_day = national_index_history[0][1]
                mom_change = round(((nat_idx - base_first_day) / base_first_day) * 100.0, 2)

            nat_rec = IndexValue(
                calculated_at=calc_time,
                date=current_day_str,
                period_type="daily",
                level="national",
                entity_id="national",
                index_value=nat_idx,
                base_value=100.0,
                mom_change_pct=mom_change or 0.0,
                sample_size=sum(len(routes_metadata) * 4 for _ in range(4))
            )
            index_records.append(nat_rec)

        db.bulk_save_objects(index_records)
        db.commit()
        logger.info(f"Seeded {len(index_records)} daily index series values across National, Regional, and Route levels.")

        # Step 4: Seed sample active alerts for realistic demo
        logger.info("Seeding realistic market alerts...")
        sample_alerts = [
            Alert(
                created_at=datetime.utcnow() - timedelta(minutes=14),
                alert_type="PRICE_SPIKE",
                route_id="DEL-BOM",
                origin="DEL",
                destination="BOM",
                flight_no="6E-2041",
                airline="IndiGo",
                current_fare=8420.0,
                baseline_fare=4800.0,
                change_pct=75.4,
                index_value=134.8,
                z_score=3.82,
                severity="CRITICAL",
                message="Delhi -> Mumbai ₹8,420 (+75.4%), Index 134.8 - PRICE SPIKE",
                is_active=True
            ),
            Alert(
                created_at=datetime.utcnow() - timedelta(minutes=48),
                alert_type="PEAK_WINDOW_SURGE",
                route_id="BOM-GOI",
                origin="BOM",
                destination="GOI",
                flight_no="QP-1304",
                airline="Akasa Air",
                current_fare=5890.0,
                baseline_fare=3100.0,
                change_pct=90.0,
                index_value=128.5,
                z_score=2.94,
                severity="WARNING",
                message="Mumbai -> Goa Urgent Window (1-3d) ₹5,890 (+90.0%) - PEAK SURGE",
                is_active=True
            ),
            Alert(
                created_at=datetime.utcnow() - timedelta(hours=2, minutes=10),
                alert_type="SUDDEN_DROP",
                route_id="DEL-BLR",
                origin="DEL",
                destination="BLR",
                flight_no="AI-804",
                airline="Air India",
                current_fare=3890.0,
                baseline_fare=5500.0,
                change_pct=-29.3,
                index_value=94.2,
                z_score=-2.12,
                severity="INFO",
                message="Delhi -> Bengaluru ₹3,890 (-29.3%), Index 94.2 - FLASH SALE DROP",
                is_active=True
            ),
            Alert(
                created_at=datetime.utcnow() - timedelta(hours=4, minutes=5),
                alert_type="PRICE_SPIKE",
                route_id="DEL-CCU",
                origin="DEL",
                destination="CCU",
                flight_no="SG-8169",
                airline="SpiceJet",
                current_fare=7100.0,
                baseline_fare=4900.0,
                change_pct=44.9,
                index_value=126.3,
                z_score=2.68,
                severity="WARNING",
                message="Delhi -> Kolkata ₹7,100 (+44.9%), Index 126.3 - PRICE SPIKE",
                is_active=True
            ),
        ]
        for a in sample_alerts:
            db.add(a)

        # Seed initial collector runs audit log
        sample_runs = [
            CollectorRun(
                started_at=datetime.utcnow() - timedelta(minutes=2),
                completed_at=datetime.utcnow() - timedelta(minutes=1, seconds=55),
                source_name="MockIndianAviationCollector",
                source_type="aggregator",
                status="success",
                items_collected=180,
                items_deduped=64,
                outliers_flagged=2,
                duration_ms=4820,
                error_message=None
            ),
            CollectorRun(
                started_at=datetime.utcnow() - timedelta(minutes=4),
                completed_at=datetime.utcnow() - timedelta(minutes=3, seconds=56),
                source_name="MockIndianAviationCollector",
                source_type="aggregator",
                status="success",
                items_collected=175,
                items_deduped=61,
                outliers_flagged=1,
                duration_ms=4120,
                error_message=None
            ),
            CollectorRun(
                started_at=datetime.utcnow() - timedelta(minutes=15),
                completed_at=datetime.utcnow() - timedelta(minutes=14, seconds=58),
                source_name="Playwright-EaseMyTrip",
                source_type="ota",
                status="partial",
                items_collected=0,
                items_deduped=0,
                outliers_flagged=0,
                duration_ms=120,
                error_message="Skeleton collector disabled by default (MOCK_MODE=True)"
            )
        ]
        for cr in sample_runs:
            db.add(cr)

        db.commit()
        logger.info("Successfully seeded AIRFARE-INDEX database with 30-day history, index values, and alerts!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
