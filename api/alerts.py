import json
import logging
import asyncio
from typing import List, Dict, Optional, Any, Set
from datetime import datetime
from api.config import settings
from api.models import Alert

logger = logging.getLogger(__name__)

class BroadcastManager:
    """
    Manages active WebSocket connections and distributes live real-time updates.
    Supports local in-memory fan-out and optional Redis Pub/Sub backend.
    """
    def __init__(self):
        self.active_connections: Set[Any] = set()

    async def connect(self, websocket: Any):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: Any):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast JSON message to all active WebSocket clients."""
        if not self.active_connections:
            return
        payload = json.dumps(message)
        dead_connections = set()
        for conn in self.active_connections:
            try:
                await conn.send_text(payload)
            except Exception as e:
                logger.warning(f"Error sending message to websocket: {e}")
                dead_connections.add(conn)

        for dead in dead_connections:
            self.active_connections.remove(dead)

broadcast_manager = BroadcastManager()

class AlertDetector:
    """
    Analyzes price movements and generates structured alerts for sudden price spikes,
    peak-window surges, and flash fare drops.
    """

    @staticmethod
    def evaluate_flight_observation(
        route_id: str,
        origin_city: str,
        dest_city: str,
        current_fare: float,
        baseline_fare: float,
        current_index: float,
        flight_no: Optional[str] = None,
        airline: Optional[str] = None,
        booking_window_days: int = 1
    ) -> Optional[Dict[str, Any]]:
        if baseline_fare <= 0:
            return None

        pct_change = round(((current_fare - baseline_fare) / baseline_fare) * 100.0, 1)

        # 1. Price Spike Detection
        if pct_change >= 20.0 or current_index >= 125.0:
            severity = "CRITICAL" if (pct_change >= 35.0 or current_index >= 135.0) else "WARNING"
            return {
                "alert_type": "PRICE_SPIKE",
                "route_id": route_id,
                "origin": route_id.split("-")[0],
                "destination": route_id.split("-")[1],
                "flight_no": flight_no,
                "airline": airline,
                "current_fare": current_fare,
                "baseline_fare": baseline_fare,
                "change_pct": pct_change,
                "index_value": current_index,
                "z_score": round((current_fare - baseline_fare) / (baseline_fare * 0.15), 2),
                "severity": severity,
                "message": f"{origin_city} -> {dest_city} ₹{current_fare:,.0f} (+{pct_change}%), Index {current_index:.1f} - PRICE SPIKE",
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }

        # 2. Sudden Flash Drop Detection
        elif pct_change <= -25.0:
            return {
                "alert_type": "SUDDEN_DROP",
                "route_id": route_id,
                "origin": route_id.split("-")[0],
                "destination": route_id.split("-")[1],
                "flight_no": flight_no,
                "airline": airline,
                "current_fare": current_fare,
                "baseline_fare": baseline_fare,
                "change_pct": pct_change,
                "index_value": current_index,
                "z_score": round((current_fare - baseline_fare) / (baseline_fare * 0.15), 2),
                "severity": "INFO",
                "message": f"{origin_city} -> {dest_city} ₹{current_fare:,.0f} ({pct_change}%), Index {current_index:.1f} - FLASH SALE DROP",
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }

        # 3. Peak-Window Surge (1-3 days out)
        elif booking_window_days <= 3 and pct_change >= 15.0:
            return {
                "alert_type": "PEAK_WINDOW_SURGE",
                "route_id": route_id,
                "origin": route_id.split("-")[0],
                "destination": route_id.split("-")[1],
                "flight_no": flight_no,
                "airline": airline,
                "current_fare": current_fare,
                "baseline_fare": baseline_fare,
                "change_pct": pct_change,
                "index_value": current_index,
                "z_score": round((current_fare - baseline_fare) / (baseline_fare * 0.15), 2),
                "severity": "WARNING",
                "message": f"{origin_city} -> {dest_city} Urgent Window (1-3d) ₹{current_fare:,.0f} (+{pct_change}%) - PEAK SURGE",
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }

        return None

alert_detector = AlertDetector()
