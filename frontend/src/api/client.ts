import {
  RouteDetail,
  NationalIndexSummary,
  RouteIndexResponse,
  FareObservation,
  AlertItem,
  CollectorHealthResponse,
  BacktestResponse,
  SeasonalityResponse,
} from '../types';

const API_BASE = '/api';

export const apiClient = {
  async getRoutes(): Promise<RouteDetail[]> {
    const res = await fetch(`${API_BASE}/routes`);
    if (!res.ok) throw new Error('Failed to fetch routes');
    return res.json();
  },

  async getNationalIndex(): Promise<NationalIndexSummary> {
    const res = await fetch(`${API_BASE}/index/national`);
    if (!res.ok) throw new Error('Failed to fetch national index');
    return res.json();
  },

  async getRouteIndex(routeId: string): Promise<RouteIndexResponse> {
    const res = await fetch(`${API_BASE}/index/route/${routeId}`);
    if (!res.ok) throw new Error(`Failed to fetch index for route ${routeId}`);
    return res.json();
  },

  async getLatestFares(route?: string, limit: number = 30): Promise<FareObservation[]> {
    const url = route ? `${API_BASE}/fares/latest?route=${route}&limit=${limit}` : `${API_BASE}/fares/latest?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch fares');
    return res.json();
  },

  async getAlerts(severity?: string, route?: string): Promise<AlertItem[]> {
    let url = `${API_BASE}/alerts?active_only=true`;
    if (severity) url += `&severity=${severity}`;
    if (route) url += `&route=${route}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  },

  async getSeasonality(route: string): Promise<SeasonalityResponse> {
    const res = await fetch(`${API_BASE}/seasonality/${route}`);
    if (!res.ok) throw new Error(`Failed to fetch seasonality for ${route}`);
    return res.json();
  },

  async getBacktest(days: number = 30): Promise<BacktestResponse> {
    const res = await fetch(`${API_BASE}/backtest?days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch backtest');
    return res.json();
  },

  async getCollectorHealth(): Promise<CollectorHealthResponse> {
    const res = await fetch(`${API_BASE}/health/collectors`);
    if (!res.ok) throw new Error('Failed to fetch collector health');
    return res.json();
  },

  async triggerManualCollection(): Promise<any> {
    const res = await fetch(`${API_BASE}/collector/run`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger collection');
    return res.json();
  },

  async simulateSpike(routeId: string = 'DEL-BOM', multiplier: number = 1.45): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/simulate-spike`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_id: routeId, spike_multiplier: multiplier }),
    });
    if (!res.ok) throw new Error('Failed to simulate spike');
    return res.json();
  },

  getCpiExportUrl(format: 'json' | 'csv'): string {
    return `${API_BASE}/export/cpi?format=${format}`;
  },
};

export class StreamSubscriber {
  private ws: WebSocket | null = null;
  private listeners: Array<(event: any) => void> = [];
  private isConnecting: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;
    this.isConnecting = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/stream`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('[WebSocket] Connected to AIRFARE-INDEX real-time stream');
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.listeners.forEach((cb) => cb(payload));
        } catch (err) {
          // ignore non-json messages (e.g. pong)
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        setTimeout(() => this.init(), 3000);
      };

      this.ws.onerror = (err) => {
        this.isConnecting = false;
      };
    } catch (e) {
      this.isConnecting = false;
    }
  }

  subscribe(callback: (event: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
}

export const streamSubscriber = new StreamSubscriber();
