import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Plane, 
  Database, 
  MapPin, 
  Clock, 
  Compass, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { NationalIndexSummary, RouteDetail, AlertItem } from '../types';
import { MetricCard } from '../components/MetricCard';

interface OverviewViewProps {
  nationalData: NationalIndexSummary | null;
  routes: RouteDetail[];
  alerts: AlertItem[];
  onSelectRoute: (routeId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  nationalData,
  routes,
  alerts,
  onSelectRoute,
}) => {
  const latestIndex = nationalData?.latest_index || 116.4;
  const momChange = nationalData?.mom_change_pct || 3.8;
  const sampleCount = nationalData?.sample_count || 114690;
  const activeAlerts = alerts.filter(a => a.is_active);

  const regionalData = nationalData?.regional_breakdown
    ? Object.entries(nationalData.regional_breakdown).map(([name, value]) => ({
        region: name,
        index: value,
      }))
    : [
        { region: 'North', index: 118.2 },
        { region: 'West', index: 117.5 },
        { region: 'South', index: 115.1 },
        { region: 'East', index: 119.8 },
      ];

  const regionColors: Record<string, string> = {
    North: '#38BDF8',
    West: '#F97316',
    South: '#14B8A6',
    East: '#A855F7',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Live Ticker Bar */}
      <div className="bg-navy-800/60 border border-navy-700 rounded-lg p-2.5 flex items-center space-x-3 overflow-hidden">
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-teal-500/20 text-teal-300 font-bold text-[11px] shrink-0 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
          <span>Live Ticker</span>
        </div>
        <div className="flex space-x-6 overflow-x-auto scrollbar-none text-xs whitespace-nowrap">
          {routes.slice(0, 10).map((r) => {
            const isUp = (r.change_24h_pct || 0) >= 0;
            return (
              <button
                key={r.route_id}
                onClick={() => onSelectRoute(r.route_id)}
                className="flex items-center space-x-2 text-slate-300 hover:text-white transition"
              >
                <span className="font-bold font-mono text-slate-200">{r.route_id}</span>
                <span className="font-mono text-slate-400">₹{r.current_fare?.toLocaleString()}</span>
                <span className={`flex items-center text-[11px] font-mono font-bold ${isUp ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {r.change_24h_pct}%
                </span>
                {r.has_spike && (
                  <span className="text-[9px] bg-red-500/30 text-red-400 px-1 py-0.2 rounded font-bold uppercase animate-pulse">
                    Spike
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="National Airfare Index"
          value={latestIndex.toFixed(1)}
          badge="Base 100.0"
          delta={{
            value: `${momChange >= 0 ? '+' : ''}${momChange}%`,
            isPositive: momChange > 0,
            label: 'MoM inflation',
          }}
          icon={TrendingUp}
          colorScheme="teal"
        />

        <MetricCard
          title="Active Market Alerts"
          value={activeAlerts.length}
          subValue={`${alerts.filter(a => a.severity === 'CRITICAL').length} Critical Spikes`}
          icon={AlertTriangle}
          colorScheme={activeAlerts.length > 0 ? 'orange' : 'emerald'}
        />

        <MetricCard
          title="Domestic Corridors"
          value={`${routes.length} Directed`}
          subValue="15 Top City Pairs (DGCA Traffic)"
          icon={Plane}
          colorScheme="sky"
        />

        <MetricCard
          title="Observations Ingested"
          value={sampleCount.toLocaleString()}
          subValue="Standard Basket Normalized"
          icon={Database}
          colorScheme="indigo"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* National 30-Day Index Trend (2 cols) */}
        <div className="lg:col-span-2 bg-navy-800/80 border border-navy-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>National Airfare Index (30-Day Series)</span>
                <span className="bg-teal-500/10 text-teal-300 text-[10px] px-2 py-0.5 rounded border border-teal-500/20 font-mono">
                  Daily Jevons-Laspeyres
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregated from {sampleCount.toLocaleString()} normalized observations across 5 airlines and 4 OTAs.
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs text-slate-400">Current: </span>
              <span className="text-sm font-bold text-teal-400">{latestIndex.toFixed(1)}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={nationalData?.historical_daily || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748B" 
                  fontSize={11} 
                  tickFormatter={(val) => val.slice(5)} 
                />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={11} 
                  domain={['dataMin - 3', 'dataMax + 3']} 
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A192F', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${Number(val).toFixed(1)}`, 'Airfare Index']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="index_value" 
                  stroke="#14B8A6" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#indexGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Breakdown (1 col) */}
        <div className="bg-navy-800/80 border border-navy-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Compass className="w-4 h-4 text-teal-400" />
              <span>Regional Sub-Indices</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Price indices rolled up by geographic zone</p>
          </div>

          <div className="h-44 w-full my-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} layout="vertical" margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" domain={[90, 130]} stroke="#64748B" fontSize={10} />
                <YAxis dataKey="region" type="category" stroke="#94A3B8" fontSize={11} width={45} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A192F', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${Number(val).toFixed(1)}`, 'Sub-Index']}
                />
                <Bar dataKey="index" radius={[0, 4, 4, 0]}>
                  {regionalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={regionColors[entry.region] || '#0D9488'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-navy-700/60 font-mono">
            {regionalData.map((reg) => (
              <div key={reg.region} className="bg-navy-900/60 p-2 rounded-lg border border-navy-700/50 flex justify-between items-center">
                <span className="text-slate-400">{reg.region}:</span>
                <span className="font-bold text-white">{reg.index.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 24-Hour Diurnal Hourly Trend & Active Alerts Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 24h Hourly Diurnal Trend */}
        <div className="bg-navy-800/80 border border-navy-700/80 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>24-Hour Hourly Diurnal Variation</span>
              </h3>
              <p className="text-xs text-slate-400">Intraday dynamic yield pricing fluctuations</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Hourly Frequency</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={nationalData?.hourly_trend_24h || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A192F', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)}`, 'Index']}
                />
                <Area type="monotone" dataKey="index_value" stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Alerts Callout */}
        <div className="bg-navy-800/80 border border-navy-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-accent-orange" />
              <span>Priority Price Alerts ({activeAlerts.length})</span>
            </h3>
            <span className="text-[11px] text-teal-400 font-medium">Real-Time Surveillance</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-48 pr-1">
            {activeAlerts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No active price anomalies detected. Fares tracking within standard statistical bounds.
              </div>
            ) : (
              activeAlerts.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition ${
                    a.severity === 'CRITICAL'
                      ? 'bg-red-950/40 border-red-800/60 text-red-200'
                      : 'bg-orange-950/40 border-orange-800/60 text-orange-200'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold truncate text-slate-100">{a.message}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Route: {a.route_id} • Z-Score: {a.z_score || 2.5} • Airline: {a.airline || 'Multiple'}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      a.severity === 'CRITICAL'
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-accent-orange text-navy-900'
                    }`}
                  >
                    {a.severity}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 text-[11px] text-slate-400 text-right">
            Threshold: Z &gt; 2.5 or Jump &gt; 20% vs 7-day median
          </div>
        </div>
      </div>
    </div>
  );
};
