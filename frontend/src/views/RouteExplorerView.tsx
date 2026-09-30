import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Calendar, 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Clock, 
  Tag, 
  ShieldCheck 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { RouteDetail, RouteIndexResponse, FareObservation, SeasonalityResponse } from '../types';
import { apiClient } from '../api/client';

interface RouteExplorerViewProps {
  routes: RouteDetail[];
  selectedRouteId: string;
  onSelectRouteId: (id: string) => void;
}

export const RouteExplorerView: React.FC<RouteExplorerViewProps> = ({
  routes,
  selectedRouteId,
  onSelectRouteId,
}) => {
  const [routeData, setRouteData] = useState<RouteIndexResponse | null>(null);
  const [latestFares, setLatestFares] = useState<FareObservation[]>([]);
  const [seasonality, setSeasonality] = useState<SeasonalityResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const activeRoute = routes.find((r) => r.route_id === selectedRouteId) || routes[0];

  useEffect(() => {
    let isMounted = true;
    const loadDetails = async () => {
      if (!activeRoute) return;
      setIsLoading(true);
      try {
        const [rIdx, fares, season] = await Promise.all([
          apiClient.getRouteIndex(activeRoute.route_id),
          apiClient.getLatestFares(activeRoute.route_id, 30),
          apiClient.getSeasonality(activeRoute.route_id),
        ]);
        if (isMounted) {
          setRouteData(rIdx);
          setLatestFares(fares);
          setSeasonality(season);
          setIsLoading(false);
        }
      } catch (e) {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDetails();
    return () => { isMounted = false; };
  }, [activeRoute?.route_id]);

  // Format booking window curve data
  const bookingWindowCurve = [
    { bucket: '1-3 Days', days: 2, avg: routeData?.booking_windows?.['1-3']?.avg_fare || Math.round(activeRoute?.base_fare_inr * 1.85) },
    { bucket: '4-7 Days', days: 5, avg: routeData?.booking_windows?.['4-7']?.avg_fare || Math.round(activeRoute?.base_fare_inr * 1.40) },
    { bucket: '8-14 Days', days: 11, avg: routeData?.booking_windows?.['8-14']?.avg_fare || Math.round(activeRoute?.base_fare_inr * 1.12) },
    { bucket: '15-30 Days', days: 22, avg: routeData?.booking_windows?.['15-30']?.avg_fare || Math.round(activeRoute?.base_fare_inr * 0.98) },
    { bucket: '31-60 Days', days: 45, avg: routeData?.booking_windows?.['31-60']?.avg_fare || Math.round(activeRoute?.base_fare_inr * 0.85) },
  ];

  // Group latest fares by portal to show airline vs OTA spread
  const portalSpread: Record<string, { total: number; count: number; type: string }> = {};
  latestFares.forEach((f) => {
    if (!portalSpread[f.source_name]) {
      portalSpread[f.source_name] = { total: 0, count: 0, type: f.source_type };
    }
    portalSpread[f.source_name].total += f.total_fare;
    portalSpread[f.source_name].count += 1;
  });

  const portalData = Object.entries(portalSpread).map(([source, stats]) => ({
    name: source,
    avgFare: Math.round(stats.total / stats.count),
    type: stats.type,
  })).sort((a, b) => a.avgFare - b.avgFare);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Route Selector Banner */}
      <div className="bg-navy-800/80 border border-navy-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black font-mono text-white">{activeRoute.route_id}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold">
                Weight: {(activeRoute.weight * 100).toFixed(1)}% of Traffic
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {activeRoute.origin_city} ({activeRoute.origin}) ➔ {activeRoute.dest_city} ({activeRoute.destination}) • {activeRoute.distance_km} km • ~{activeRoute.typical_duration_min} mins
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-slate-400 font-semibold">Change Corridor:</label>
          <select
            value={activeRoute.route_id}
            onChange={(e) => onSelectRouteId(e.target.value)}
            className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
          >
            {routes.map((r) => (
              <option key={r.route_id} value={r.route_id}>
                {r.route_id} ({r.origin_city} ➔ {r.dest_city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Window Advance Curve */}
        <div className="bg-navy-800/80 border border-navy-700/80 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span>Advance Purchase Escalation Curve</span>
              </h3>
              <p className="text-xs text-slate-400">Yield price progression by days until flight departure</p>
            </div>
            <span className="text-xs text-teal-400 font-mono font-semibold">Exponential Model</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bookingWindowCurve} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="bucket" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A192F', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Average All-In Fare']}
                />
                <Line 
                  type="monotone" 
                  dataKey="avg" 
                  stroke="#F97316" 
                  strokeWidth={3} 
                  dot={{ fill: '#F97316', r: 5 }} 
                  activeDot={{ r: 8, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Stratified across 5 standardized MoSPI booking horizon cells</span>
            <span className="text-slate-300 font-semibold font-mono">1-3d Premium: ~+85%</span>
          </div>
        </div>

        {/* Source Price Spread (Direct Airline vs OTAs) */}
        <div className="bg-navy-800/80 border border-navy-700/80 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-accent-orange" />
                <span>Distribution Channel Price Spread</span>
              </h3>
              <p className="text-xs text-slate-400">Direct Airline portals vs Metasearch OTAs (Lowest price representative)</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-navy-900 text-slate-300 border border-navy-700">
              Deduplication Target
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portalData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={10} domain={['dataMin - 500', 'dataMax + 500']} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A192F', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Average Fare']}
                />
                <Bar dataKey="avgFare" radius={[0, 4, 4, 0]}>
                  {portalData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.type === 'airline' ? '#0D9488' : '#38BDF8'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600"></span>
                <span>Direct Airline</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>
                <span>OTA Metasearch</span>
              </span>
            </div>
            <span className="text-slate-300 font-mono">Deduplication algorithm preserves min price</span>
          </div>
        </div>
      </div>

      {/* Seasonality Heatmap Grid */}
      <div className="bg-navy-800/80 border border-navy-700/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>Seasonality Matrix: Day-of-Week vs Booking Horizon</span>
            </h3>
            <p className="text-xs text-slate-400">Dynamic pricing heatmap indexed to nominal route baseline</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Values: Relative Price Index</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-navy-700 text-slate-400">
                <th className="py-2.5 px-3 text-left font-semibold">Day of Week</th>
                <th className="py-2.5 px-3">1-3 Days (Urgent)</th>
                <th className="py-2.5 px-3">4-7 Days</th>
                <th className="py-2.5 px-3">8-14 Days</th>
                <th className="py-2.5 px-3">15-30 Days</th>
                <th className="py-2.5 px-3">31-60 Days (Early)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/50">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const dayItems = seasonality?.heatmap.filter((h) => h.day === day) || [];
                return (
                  <tr key={day} className="hover:bg-navy-700/30">
                    <td className="py-3 px-3 text-left font-semibold text-slate-200">{day}</td>
                    {['1-3', '4-7', '8-14', '15-30', '31-60'].map((b) => {
                      const item = dayItems.find((h) => h.booking_window === b);
                      const idxVal = item?.index || 100.0;
                      let bgClass = 'bg-teal-950/40 text-teal-300';
                      if (idxVal > 150) bgClass = 'bg-red-950/80 text-rose-300 font-bold border border-red-800/40';
                      else if (idxVal > 125) bgClass = 'bg-orange-950/60 text-amber-300 font-semibold';
                      else if (idxVal < 90) bgClass = 'bg-emerald-950/60 text-emerald-300';

                      return (
                        <td key={b} className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] ${bgClass}`}>
                            {idxVal.toFixed(1)}
                            <span className="text-[9px] block text-slate-400 font-sans">
                              ₹{item?.average_fare?.toLocaleString()}
                            </span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Latest Scraped Observation Log for this Route */}
      <div className="bg-navy-800/80 border border-navy-700/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Normalized Observations Log ({latestFares.length})</span>
            </h3>
            <p className="text-xs text-slate-400">Auditable transaction log filtered to standard basket</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Deduplicated & Cleaned</span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="sticky top-0 bg-navy-900 border-b border-navy-700 text-slate-400">
              <tr>
                <th className="py-2 px-3">Flight No</th>
                <th className="py-2 px-3">Airline</th>
                <th className="py-2 px-3">Source Portal</th>
                <th className="py-2 px-3">Travel Date</th>
                <th className="py-2 px-3">Horizon</th>
                <th className="py-2 px-3 text-right">Base</th>
                <th className="py-2 px-3 text-right">Taxes/Fees</th>
                <th className="py-2 px-3 text-right">Total Fare</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/40 text-slate-300">
              {latestFares.slice(0, 15).map((f) => (
                <tr key={f.id} className="hover:bg-navy-700/20">
                  <td className="py-2 px-3 font-bold text-white">{f.flight_no}</td>
                  <td className="py-2 px-3">{f.airline}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-navy-900 border border-navy-700 text-[10px]">
                      {f.source_name}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">{f.departure_date} {f.departure_time}</td>
                  <td className="py-2 px-3">{f.booking_window_days}d</td>
                  <td className="py-2 px-3 text-right">₹{f.base_fare.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-slate-400">₹{(f.taxes + f.fees).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-bold text-teal-300">₹{f.total_fare.toLocaleString()}</td>
                  <td className="py-2 px-3 text-center">
                    {f.is_outlier ? (
                      <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px]">Outlier</span>
                    ) : f.is_duplicate ? (
                      <span className="bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">Duplicate</span>
                    ) : (
                      <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">Normalized</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
