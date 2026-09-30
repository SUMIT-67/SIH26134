import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
import time
import random

from api.database import SessionLocal
from api.models import Route, FareObservation, IndexValue, Alert, CollectorRun, Airport
from collector.mock_collector import MockCollector
from api.normalization import normalization_engine
from api.index_engine import index_engine
from api.alerts import alert_detector, broadcast_manager
from api.config import settings

logger = logging.getLogger("scheduler")

class IngestionScheduler:
    """
    Periodic job scheduler that coordinates scraping, normalization,
    index recalculation, and live alert broadcasting.
    """
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.collector = MockCollector()
        self.is_running = False
        self._loop = None

    def set_event_loop(self, loop):
        self._loop = loop

    def trigger_cycle(self, force_route: Optional[str] = None, force_spike: bool = False, spike_multiplier: float = 1.45) -> dict:
        """
        Executes a single collection and index pipeline cycle.
        """
        start_time = time.time()
        started_at = datetime.now()
        db = SessionLocal()

        try:
            # Query active routes
            routes_query = db.query(Route).filter(Route.is_active == True)
            if force_route:
                routes_query = routes_query.filter(Route.route_id == force_route)
            routes = routes_query.all()

            if not routes:
                return {"status": "skipped", "message": "No active routes found"}

            # Sample 4 routes per scheduled run to keep it nimble, or all if force_route
            active_subset = routes if force_route else random.sample(routes, min(5, len(routes)))

            total_collected = 0
            total_deduped = 0
            total_outliers = 0
            alerts_triggered = []

            for r in active_subset:
                # Scrape for upcoming dates (e.g. 2 days out and 10 days out)
                for days_out in [2, 10]:
                    travel_date = (date.today() + timedelta(days=days_out)).strftime("%Y-%m-%d")
                    
                    is_spike = force_spike and (r.route_id == force_route or not force_route)
                    raw_fares = self.collector.fetch(
                        route=r.route_id,
                        travel_date=travel_date,
                        force_spike=is_spike,
                        spike_multiplier=spike_multiplier
                    )
                    
                    processed, stats = normalization_engine.process(raw_fares)
                    total_collected += stats["total_raw"]
                    total_deduped += stats["duplicates_flagged"]
                    total_outliers += stats["outliers_flagged"]

                    # Persist valid observations
                    db_items = []
                    for f in processed:
                        db_obs = FareObservation(
                            observed_at=f.observed_at,
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
                        db_items.append(db_obs)

                        # Evaluate alerts on non-duplicate observations
                        if not f.is_duplicate and not f.is_sold_out:
                            origin_airport = db.query(Airport).filter(Airport.code == f.origin).first()
                            dest_airport = db.query(Airport).filter(Airport.code == f.destination).first()
                            origin_city = origin_airport.city if origin_airport else f.origin
                            dest_city = dest_airport.city if dest_airport else f.destination

                            current_route_index = round(100.0 * (f.total_fare / r.base_fare_inr), 1)

                            alert_dict = alert_detector.evaluate_flight_observation(
                                route_id=r.route_id,
                                origin_city=origin_city,
                                dest_city=dest_city,
                                current_fare=f.total_fare,
                                baseline_fare=r.base_fare_inr,
                                current_index=current_route_index,
                                flight_no=f.flight_no,
                                airline=f.airline,
                                booking_window_days=f.booking_window_days
                            )

                            if alert_dict:
                                alert_obj = Alert(
                                    created_at=datetime.now(),
                                    alert_type=alert_dict["alert_type"],
                                    route_id=alert_dict["route_id"],
                                    origin=alert_dict["origin"],
                                    destination=alert_dict["destination"],
                                    flight_no=alert_dict["flight_no"],
                                    airline=alert_dict["airline"],
                                    current_fare=alert_dict["current_fare"],
                                    baseline_fare=alert_dict["baseline_fare"],
                                    change_pct=alert_dict["change_pct"],
                                    index_value=alert_dict["index_value"],
                                    z_score=alert_dict["z_score"],
                                    severity=alert_dict["severity"],
                                    message=alert_dict["message"],
                                    is_active=True
                                )
                                db.add(alert_obj)
                                alerts_triggered.append(alert_dict)

                    db.bulk_save_objects(db_items)

            # Record run stats
            duration_ms = int((time.time() - start_time) * 1000)
            run_log = CollectorRun(
                started_at=started_at,
                completed_at=datetime.now(),
                source_name=self.collector.name,
                source_type="aggregator",
                status="success",
                items_collected=total_collected,
                items_deduped=total_deduped,
                outliers_flagged=total_outliers,
                duration_ms=duration_ms,
                error_message=None
            )
            db.add(run_log)
            db.commit()

            # Broadcast new alerts / ticker updates via WebSockets
            if self._loop and self._loop.is_running():
                for alert in alerts_triggered:
                    asyncio.run_coroutine_threadsafe(
                        broadcast_manager.broadcast({
                            "type": "NEW_ALERT",
                            "data": alert
                        }),
                        self._loop
                    )

                asyncio.run_coroutine_threadsafe(
                    broadcast_manager.broadcast({
                        "type": "COLLECTION_CYCLE_COMPLETED",
                        "data": {
                            "collected": total_collected,
                            "deduped": total_deduped,
                            "outliers": total_outliers,
                            "duration_ms": duration_ms,
                            "timestamp": datetime.now().isoformat()
                        }
                    }),
                    self._loop
                )

            logger.info(f"Ingestion cycle completed: {total_collected} collected, {total_deduped} deduped in {duration_ms}ms.")
            return {
                "status": "success",
                "collected": total_collected,
                "deduped": total_deduped,
                "outliers": total_outliers,
                "alerts_triggered": len(alerts_triggered),
                "duration_ms": duration_ms
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Error during ingestion cycle: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}
        finally:
            db.close()

    def start(self, interval_seconds: int = 60):
        if not self.is_running:
            self.scheduler.add_job(
                self.trigger_cycle,
                "interval",
                seconds=interval_seconds,
                id="airfare_collector_job",
                replace_existing=True
            )
            self.scheduler.start()
            self.is_running = True
            logger.info(f"Background ingestion scheduler started. Interval: {interval_seconds}s")

    def stop(self):
        if self.is_running:
            self.scheduler.shutdown(wait=False)
            self.is_running = False
            logger.info("Ingestion scheduler stopped.")

ingestion_scheduler = IngestionScheduler()
