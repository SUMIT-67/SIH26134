import pytest
from fastapi.testclient import TestClient
from api.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_get_routes(client):
    response = client.get("/routes")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 15
    first = data[0]
    assert "route_id" in first
    assert "current_fare" in first
    assert "current_index" in first
    assert "has_spike" in first

def test_get_national_index(client):
    response = client.get("/index/national")
    assert response.status_code == 200
    data = response.json()
    assert "latest_index" in data
    assert "mom_change_pct" in data
    assert "regional_breakdown" in data
    assert "North" in data["regional_breakdown"]
    assert "historical_daily" in data
    assert len(data["historical_daily"]) >= 7

def test_get_fares_latest(client):
    response = client.get("/fares/latest?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    fare = data[0]
    assert "flight_no" in fare
    assert "total_fare" in fare
    assert "airline" in fare

def test_get_alerts(client):
    response = client.get("/alerts")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    alert = data[0]
    assert "alert_type" in alert
    assert "severity" in alert
    assert "message" in alert

def test_get_backtest(client):
    response = client.get("/backtest?days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["days"] > 0
    assert "series" in data
    assert "metrics" in data
    assert "pearson_correlation" in data["metrics"]
    assert data["metrics"]["pearson_correlation"] > 0.8

def test_export_cpi_json(client):
    response = client.get("/export/cpi?format=json")
    assert response.status_code == 200
    data = response.json()
    assert "cpi_sub_index" in data
    items = data["cpi_sub_index"]
    assert len(items) > 0
    assert items[0]["cpi_item_code"] == "07.3.3.1"

def test_export_cpi_csv(client):
    response = client.get("/export/cpi?format=csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "07.3.3.1" in response.text

def test_get_collector_health(client):
    response = client.get("/health/collectors")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "collectors" in data
    assert len(data["collectors"]) >= 2

def test_simulate_spike(client):
    response = client.post("/demo/simulate-spike", json={"route_id": "DEL-BOM", "spike_multiplier": 1.6})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "spike_injected"
    assert data["route_id"] == "DEL-BOM"
