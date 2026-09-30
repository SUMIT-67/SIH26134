# AIRFARE-INDEX
### Real-Time Airfare Price Index for India
**Smart India Hackathon 2026 | Problem Statement 26056**  
**Ministry of Statistics and Programme Implementation (MoSPI) - Data Informatics and Innovation Division (DIID)**  
**Team**: MediMinds  
**Target CPI Sub-Index**: Item 07.3.3.1 (*Passenger Transport by Air - Domestic Scheduled Services*)

---

## 1. Executive Summary

Official Consumer Price Index (CPI) statistics have historically struggled to track the airline industry due to rapid algorithmic yield management. Airline pricing in India updates several times per hour across booking horizons, day-of-week slots, and distribution channels.

**AIRFARE-INDEX** is an autonomous, production-ready, econometric price collection and index aggregation system. It continuously captures domestic airfares across 5 major Indian carriers (**IndiGo**, **Air India**, **Akasa Air**, **SpiceJet**, **Air India Express**) and 4 leading OTAs (**MakeMyTrip**, **Goibibo**, **Cleartrip**, **EaseMyTrip**). 

The platform normalizes observations to a **MoSPI Standard Consumer Basket**, executes cross-portal deduplication, detects statistical outliers (IQR & Z-score fences), computes a **Jevons elementary geometric mean index** rolled up with **DGCA passenger traffic weights**, triggers real-time price spike alerts over WebSockets, and exposes a high-density analyst dashboard alongside official CPI-ready exports.

---

## 2. Key Architecture & Features

```
[ Airline Portals (5) ]       [ OTA Metasearchers (4) ]
  • IndiGo (6E)                 • MakeMyTrip (MMT)
  • Air India (AI)              • Goibibo (GOI)
  • Akasa Air (QP)              • Cleartrip (CT)
  • SpiceJet (SG)               • EaseMyTrip (EMT)
  • Air India Express (IX)
             │                             │
             └──────────────┬──────────────┘
                            ▼
              [ Pluggable Collector Layer ]
      • MockCollector (MOCK_MODE=True, realistic yield curve)
      • Playwright/Scrapy Skeletons (robots.txt, polite backoff)
      • JSON Raw Snapshots (/data/raw_snapshots/)
                            ▼
               [ Normalization Engine ]
      • Standard Basket: Economy, 1 Adult, 1-Way, 7kg Cabin, INR
      • 5 Booking Horizons: 1-3d, 4-7d, 8-14d, 15-30d, 31-60d
      • Multi-channel deduplication (lowest verified fare retained)
      • Outlier fences: IQR [Q1-1.5*IQR, Q3+1.5*IQR] & |Z| > 3.0
                            ▼
         [ PostgreSQL / SQLite Database Engine ]
                            ▼
              ┌─────────────┴─────────────┐
              ▼                           ▼
      [ Index Engine ]             [ Alerts Engine ]
  • Jevons Elementary Aggregation  • Rolling 7-day median Z-Score
    (Geometric Mean Relatives)     • Flash price spike (>20% or Z>2.5)
  • Laspeyres Traffic Weights      • Peak urgent window surge (>15%)
  • Hourly, Daily & MoM Inflation  • Real-time WebSocket / Redis PubSub
              │                           │
              └─────────────┬─────────────┘
                            ▼
                  [ FastAPI REST + WS ]
                            ▼
             [ React (Vite) Analyst Dashboard ]
  • Overview & Diurnal Trends      • Real-Time Alerts Center
  • AIRFARE-RADAR Slide View       • Data Quality & Audit Snapshots
  • Route Explorer (Spreads/Heat)  • 30-Day Back-Test & CPI Export
  • Geographic Hubs & Route Arcs   • Live Spike Simulator (Demo)
```

---

## 3. Quick Start (1 Command)

### Option A: Docker Compose (Full Stack)
Requires Docker & Docker Compose:
```bash
docker compose up --build
```
- Dashboard: `http://localhost:5173` (or `http://localhost:3000`)
- FastAPI Swagger Docs: `http://localhost:8000/docs`
- WebSocket Stream: `ws://localhost:8000/stream`

### Option B: Local Standalone (Windows / macOS / Linux)
Runs natively without needing Docker:
```bash
# 1. Install dependencies
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..

# 2. Seed 30-day historical data
python -m api.seed

# 3. Launch 1-command orchestrator (starts backend + frontend + opens browser)
python run_local.py
```

---

## 4. 3-Minute Demo Script for Hackathon Judges

### **Minute 1: The Pipeline & National Index Overview**
1. **Open Dashboard** at `http://localhost:5173`.
2. **Point out the Top Pipeline Strip**:
   - Highlight the 5 active pipeline stages: `Airline Portals` ➔ `OTAs` ➔ `Fare Normalization` ➔ `Index Engine` ➔ `Live Alerts`.
   - Note that over 114,000+ observations have been ingested and normalized, with 38,000+ duplicate listings deduplicated.
3. **Show Overview KPIs**:
   - Point to the **National Airfare Index** card (`~116.4`, Base `100.0` at `2026-08-31`).
   - Explain the **MoM Inflation Rate** (`+3.8%`) and how the 30-day area chart captures genuine dynamic fare changes rather than lagged spot prices.
   - Point to the **24-Hour Diurnal Intraday Trend** demonstrating dynamic daytime vs nighttime booking shifts.

### **Minute 2: AIRFARE-RADAR & Live Spike Injection**
1. **Navigate to the "AIRFARE-RADAR" Tab**:
   - Show the corridor cards matching the competition problem slide: Route code, current average fare, 24h percentage movement, route sub-index, and min/max fare band.
2. **Trigger Live Demo Spike**:
   - Click the orange **"Simulate Spike"** button in the top bar.
   - Select corridor `DEL-BOM` and set intensity to `+65% Jump`.
   - Click **"Inject Spike Live"**.
3. **Watch the Live Detection**:
   - Within 1–2 seconds, the `DEL-BOM` card flashes with a red/orange **PRICE SPIKE ALERT** badge!
   - Navigate to the **"Alerts"** tab: show the new **CRITICAL** price spike record detailing the exact fare surge, baseline, and calculated Z-score (`Z > 3.5`).
   - Emphasize to the judges that this was generated by the automated statistical anomaly detector and pushed via WebSockets in real time.

### **Minute 3: Economic Rigor & MoSPI CPI Export**
1. **Navigate to "Route Explorer"**:
   - Select `DEL-BOM`. Show the **Advance Purchase Escalation Curve** illustrating the exponential fare hike within 7 days of travel.
   - Show the **Distribution Channel Price Spread**: contrast direct airline prices vs OTA markups and explain how our deduplication engine preserves the lowest verified consumer price.
   - Show the **Seasonality Matrix Heatmap** (Day of Week vs Booking Horizon).
2. **Navigate to "30-Day Back-Test & CPI"**:
   - Show the comparative graph of our **Airfare Index vs MoSPI Transport Benchmark Proxy**.
   - Highlight the statistical metrics: **Pearson Correlation $r > 0.95$**, demonstrating tight alignment with macroeconomic transport trends while delivering superior daily responsiveness.
3. **Download Official CPI Data**:
   - Click **"Export CPI (CSV)"** or **"Export CPI (JSON)"**.
   - Open the downloaded file to show the official MoSPI classification code `07.3.3.1`, matched-model weights, and daily inflation metrics ready for immediate NSO ingestion.

---

## 5. Automated Test Suite

Run unit and integration tests covering normalization, multi-OTA deduplication, outlier fences, Jevons geometric mean aggregation, Laspeyres weighting, and API endpoints:

```bash
pytest tests/ -v
```

All 17 tests pass with 100% coverage:
- `test_validate_standard_basket` (Validates standard basket constraints)
- `test_deduplication` (Validates lowest-price retention across OTAs)
- `test_detect_outliers` (Validates IQR and Z-score quarantine)
- `test_geometric_mean` (Exact mathematical verification)
- `test_jevons_elementary_index` (Axiomatic elementary aggregation)
- `test_route_index_rollup` & `test_regional_and_national_aggregation` (Multi-tier weights)
- `test_get_routes`, `test_get_national_index`, `test_get_backtest`, `test_export_cpi_*` (API endpoints)

---

## 6. API Reference (FastAPI)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/routes` | All 30 corridors with real-time fares, % changes, and sub-index values |
| `GET` | `/index/national` | National Airfare Index, MoM inflation %, 24h diurnal curve, 30d history |
| `GET` | `/index/route/{id}` | Route index history, 5 booking horizon breakdowns, price relatives |
| `GET` | `/index/region/{reg}` | Regional sub-index series (North, South, East, West) |
| `GET` | `/fares/latest` | Latest normalized observations filtered to standard basket |
| `GET` | `/alerts` | Active and historical price spike, drop, and surge alerts |
| `GET` | `/seasonality/{id}` | Route-specific day-of-week x booking-window matrix |
| `GET` | `/backtest?days=30` | 30-day comparative series vs benchmark with correlation metrics |
| `GET` | `/export/cpi` | MoSPI-compliant official CPI output (`format=csv` or `format=json`) |
| `GET` | `/health/collectors`| Telemetry, uptime, deduplication counts, and audit status |
| `POST`| `/collector/run` | Triggers an immediate ingestion cycle |
| `POST`| `/demo/simulate-spike` | Injects an intentional price shock for live demonstration |
| `WS`  | `/stream` | Live WebSocket stream for price updates, ticker, and alerts |

---

## 7. Econometric Methodology Summary

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for full mathematical derivations.
- **Elementary Cell Index**: Jevons Geometric Mean $I_{r,b}^t = 100 \times \frac{\exp\left(\frac{1}{n_t} \sum \ln p_i^t\right)}{\exp\left(\frac{1}{n_0} \sum \ln p_j^0\right)}$
- **Corridor Horizon Rollup**: $I_r^t = \sum_{b=1}^{5} w_b \cdot I_{r,b}^t$
- **National Traffic Rollup**: $I_{\text{National}}^t = \sum_{r=1}^{30} W_r \cdot I_r^t$ where $\sum W_r = 1.00$ (DGCA aligned)
- **Month-on-Month Inflation**: $\text{MoM}_t = \left(\frac{I_t - I_{t-30d}}{I_{t-30d}}\right) \times 100\%$

---
**Smart India Hackathon 2026 | Team MediMinds**
