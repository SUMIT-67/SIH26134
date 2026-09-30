export interface RouteDetail {
  route_id: string;
  origin: string;
  destination: string;
  distance_km: number;
  weight: number;
  typical_duration_min: number;
  base_fare_inr: number;
  is_active: boolean;
  origin_city?: string;
  dest_city?: string;
  origin_region?: string;
  dest_region?: string;
  current_index?: number;
  current_fare?: number;
  change_24h_pct?: number;
  has_spike?: boolean;
  min_fare?: number;
  max_fare?: number;
  updated_at?: string;
}

export interface NationalIndexSummary {
  latest_index: number;
  mom_change_pct: number;
  base_value: number;
  as_of_date: string;
  hourly_trend_24h: Array<{ timestamp: string; index_value: number }>;
  historical_daily: Array<{ date: string; index_value: number; sample_size: number }>;
  regional_breakdown: Record<string, number>;
  sample_count: number;
}

export interface RouteIndexResponse {
  route_id: string;
  base_fare_inr: number;
  weight: number;
  history: Array<{ date: string; index_value: number }>;
  booking_windows: Record<string, { avg_fare: number; count: number; min: number; max: number }>;
}

export interface FareObservation {
  id: number;
  observed_at: string;
  source_type: string;
  source_name: string;
  origin: string;
  destination: string;
  flight_no: string;
  airline: string;
  departure_date: string;
  departure_time: string;
  booking_window_days: number;
  total_fare: number;
  base_fare: number;
  taxes: number;
  fees: number;
  is_sold_out: boolean;
  is_duplicate: boolean;
  is_outlier: boolean;
  raw_snapshot_path?: string;
}

export interface AlertItem {
  id: number;
  created_at: string;
  alert_type: string;
  route_id: string;
  origin: string;
  destination: string;
  flight_no?: string;
  airline?: string;
  current_fare: number;
  baseline_fare: number;
  change_pct: number;
  index_value: number;
  z_score?: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  is_active: boolean;
}

export interface CollectorHealthResponse {
  status: string;
  mock_mode: boolean;
  success_rate_pct: number;
  total_runs: number;
  total_deduped_across_otas: number;
  total_outliers_quarantined: number;
  collectors: Array<{
    name: string;
    status: string;
    mode?: string;
    total_observations_generated?: number;
    total_errors?: number;
    snapshot_dir?: string;
    airlines_modeled?: string[];
    otas_modeled?: string[];
  }>;
  recent_runs: Array<{
    id: number;
    started_at: string;
    completed_at: string;
    source_name: string;
    status: string;
    items_collected: number;
    items_deduped: number;
    outliers_flagged: number;
    duration_ms: number;
    error_message?: string;
  }>;
}

export interface BacktestResponse {
  days: number;
  benchmark_name: string;
  series: Array<{
    date: string;
    airfare_index: number;
    benchmark_index: number;
    spread: number;
    sample_size: number;
  }>;
  metrics: {
    pearson_correlation: number;
    mean_absolute_tracking_error: number;
    index_volatility: number;
    sample_count: number;
  };
}

export interface SeasonalityResponse {
  route: string;
  heatmap: Array<{
    day: string;
    booking_window: string;
    average_fare: number;
    index: number;
  }>;
}
