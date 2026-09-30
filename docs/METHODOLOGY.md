# AIRFARE-INDEX: Real-Time Airfare Price Index for India
## Econometric Methodology & Data Governance Framework
**Ministry of Statistics and Programme Implementation (MoSPI) - Data Informatics and Innovation Division (DIID)**  
**Smart India Hackathon 2026 | Problem Statement 26056**  
**Team**: MediMinds  
**Target CPI Sub-Index**: Item 07.3.3.1 (*Passenger Transport by Air - Domestic*)

---

## 1. Executive Summary & Objective

In India's official Consumer Price Index (CPI), air travel prices have traditionally been captured via infrequent, manual spot-pricing surveys. However, modern dynamic pricing algorithms update airline fares multiple times per hour across booking windows, days of the week, and distribution channels.

**AIRFARE-INDEX** establishes an automated, high-frequency, robust price collection, normalization, and index aggregation pipeline that computes a **daily and hourly National Airfare Index** calibrated to MoSPI standards and aligned with the **ILO/IMF Consumer Price Index Manual (2020)**.

---

## 2. Standard Basket Specification

To maintain price comparability over time and eliminate quality bias, all collected observations must conform to the **Standard Consumer Airfare Basket**:

| Attribute | Standard Basket Specification | Rationale |
| :--- | :--- | :--- |
| **Cabin Class** | Economy | Accounts for >88% of domestic passenger volume |
| **Passenger Profile** | 1 Adult | Eliminates child/infant concession variances |
| **Trip Type** | One-Way Direct | Standardized elementary price unit |
| **Fare Category** | Standard / Regular (Saver) | Excludes premium flexi/cancellation bundles |
| **Baggage Allowance** | Cabin baggage (7 kg) | Baseline regulatory minimum standard |
| **Price Concept** | **All-in Total Price in INR** | Inclusive of Base Fare, User Development Fee (UDF), Passenger Service Fee (PSF), Goods and Services Tax (GST), and non-optional platform fees |
| **Currency** | Indian Rupee (INR / ₹) | Sovereign standard |

---

## 3. Booking Window Stratification

Dynamic pricing exhibits steep exponential decay as the flight date approaches. To measure pure price changes without mixing last-minute fares with early-bird discounts, price relatives are computed within **5 standardized booking horizon cells**:

| Cell ($b$) | Horizon (Days to Departure) | Market Characteristics | Cell Weight ($w_b$) |
| :--- | :--- | :--- | :---: |
| **B1** | 1 – 3 days | Urgent / emergency travel, inelastic demand | **0.20** |
| **B2** | 4 – 7 days | Short-notice business / personal travel | **0.25** |
| **B3** | 8 – 14 days | Standard planning window, high volume | **0.30** |
| **B4** | 15 – 30 days | Advance planned leisure / corporate travel | **0.15** |
| **B5** | 31 – 60 days | Early-bird bookings, discounted inventory | **0.10** |
| **Total** | | | **1.00** |

---

## 4. Normalization, Deduplication & Quality Governance

### 4.1 Missing Data Rules
- `missing != zero`: Missing fare components (e.g. omitted tax breakdowns) are never imputed as ₹0. Incomplete records with null totals are rejected.
- When an airline has no active flights in a cell, price movements are imputed using the higher-level route geometric average (matched model imputation).

### 4.2 Multi-Channel Deduplication
The identical physical flight (e.g. `6E-2041` on date `2026-10-15`) is frequently scraped from multiple endpoints (Direct Airline portal, MakeMyTrip, Cleartrip, EaseMyTrip, Goibibo).
1. Observations are grouped by unique flight key:
   $$\text{Key} = (\text{Origin}, \text{Destination}, \text{Departure Date}, \text{Flight No}, \text{Cabin})$$
2. The **minimum verified all-in price** across all channels is preserved as the representative consumer price.
3. Duplicates are tagged (`is_duplicate = True`), and `source_count` along with the list of observed portals is stored for market transparency.

### 4.3 Statistical Outlier Detection
To prevent scraped anomalies, web-layout errors, or extreme black-swan fare anomalies from distorting official CPI figures, a dual-layer statistical fence is enforced:

1. **Interquartile Range (IQR) Rule**:
   $$\text{IQR} = Q_3 - Q_1$$
   $$\text{Lower Fence} = Q_1 - 1.5 \times \text{IQR}, \quad \text{Upper Fence} = Q_3 + 1.5 \times \text{IQR}$$
2. **Rolling Z-Score Rule**:
   $$z_{r,b} = \frac{p - \mu_{r,b,7d}}{\sigma_{r,b,7d}}$$
   If $|z_{r,b}| > 3.0$, the observation is flagged as an outlier (`is_outlier = True`).

> **Rule**: Outlier observations and sold-out flights (`is_sold_out = True`) are quarantined and excluded from index calculation, but permanently preserved in the PostgreSQL observation repository for MoSPI audit trails.

---

## 5. Index Aggregation Methodology

### 5.1 Base Period Definition
- **Base Period ($t_0$)**: First 7 days of the reference baseline period.
- **Base Index Value**: 
  $$I^0 = 100.0$$

### 5.2 Elementary Aggregate: The Jevons Formula
At the lowest stratum (Route $r$, Booking Window $b$), unweighted geometric mean price relatives are computed. The **Jevons Index** is chosen over Dutot or Carli as recommended by the IMF CPI Manual because it satisfies transitivity, is robust to outliers, and allows for unitary elasticity of substitution:

$$I_{r,b}^t = 100 \times \left( \prod_{i=1}^{n_t} \frac{p_{r,b,i}^t}{p_{r,b,i}^0} \right)^{1/n_t} = 100 \times \frac{\exp\left(\frac{1}{n_t} \sum_{i=1}^{n_t} \ln p_{r,b,i}^t\right)}{\exp\left(\frac{1}{n_0} \sum_{j=1}^{n_0} \ln p_{r,b,j}^0\right)}$$

Where:
- $p_{r,b,i}^t$ = Price of flight $i$ on route $r$ in booking window $b$ at time $t$
- $p_{r,b,j}^0$ = Baseline geometric mean price for route $r$ in booking window $b$ during base period $t_0$
- $n_t$ = Number of valid, non-outlier observations at time $t$

### 5.3 Route-Level Rollup
The route index $I_r^t$ aggregates the 5 booking window cells using fixed booking-horizon weights $w_b$:

$$I_r^t = \sum_{b=1}^{5} w_b \cdot I_{r,b}^t$$

### 5.4 Regional & National Rollup (Laspeyres / Young Formulation)
Top 15 domestic routes (and their returns, total 30 directed corridors) represent >75% of Indian scheduled passenger traffic. Weights $W_r$ are derived from official DGCA annual passenger traffic statistics:

$$I_{\text{National}}^t = \sum_{r=1}^{30} W_r \cdot I_r^t \quad \text{where} \quad \sum_{r=1}^{30} W_r = 1.00$$

For regional sub-indices (North, South, East, West):

$$I_{\text{Region}}^t = \frac{\sum_{r \in \text{Region}} W_r \cdot I_r^t}{\sum_{r \in \text{Region}} W_r}$$

### 5.5 Month-on-Month (MoM) Inflation Rate
$$\text{MoM}_t = \left( \frac{I_t - I_{t-30d}}{I_{t-30d}} \right) \times 100\%$$

---

## 6. Live Alerting & Anomaly Detection

Real-time surveillance triggers automated alerts categorized into three severity tiers:

1. **PRICE SPIKE (Warning / Critical)**:
   - Condition: Route average fare increases $>20\%$ vs 7-day median, or $z\text{-score} > 2.5$.
   - Severity: CRITICAL if $>35\%$ jump; WARNING if $20\%-35\%$.
2. **PEAK-WINDOW SURGE**:
   - Condition: Urgent booking window (1-3d) surges $>40\%$ while advance windows remain flat (predatory dynamic pricing).
3. **SUDDEN FLASH DROP**:
   - Condition: Fare decreases $>25\%$ vs 7-day median (airline flash sale / fare wars).

Alerts are published instantaneously to Redis Pub/Sub and pushed to connected dashboards over WebSockets.

---

## 7. MoSPI CPI Integration & Data Export Standards

The system exposes official MoSPI-ready exports via `GET /export/cpi?format=csv|json`:

```json
{
  "cpi_sub_index_code": "07.3.3.1",
  "classification": "COICOP / National CPI Item 7.3.3.1",
  "item_description": "Passenger transport by air - Domestic scheduled services",
  "base_period": "2026-09-01 to 2026-09-07 = 100.0",
  "frequency": "Daily",
  "calculated_at": "2026-09-29T18:00:00Z",
  "national_index": 118.42,
  "mom_change_pct": 3.85,
  "yoy_change_pct": null,
  "sample_count": 8420,
  "regional_breakdown": {
    "North": 119.20,
    "West": 117.80,
    "South": 116.90,
    "East": 121.50
  }
}
```

---

## 8. Summary of Formula Compliance

| Metric | Official Standard Formula |
| :--- | :--- |
| **Elementary Cell Index** | Jevons Geometric Mean $I_{r,b}^t = 100 \times \prod (p_{r,b}^t / p_{r,b}^0)^{1/n}$ |
| **Advance Horizon Rollup** | $\sum_{b} w_b I_{r,b}^t$ |
| **National Aggregation** | Laspeyres/Young Weighted Rollup $\sum_{r} W_r I_r^t$ |
| **Inflation (MoM)** | $((I_t - I_{t-30d}) / I_{t-30d}) \times 100\%$ |
| **Outlier Fence** | $[Q_1 - 1.5 \times \text{IQR}, Q_3 + 1.5 \times \text{IQR}]$ |
