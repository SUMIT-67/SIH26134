import React, { useState } from 'react';
import { 
  Radio, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle, 
  Flame, 
  Sliders, 
  Clock 
} from 'lucide-react';
import { RouteDetail } from '../types';

interface RadarViewProps {
  routes: RouteDetail[];
  onSelectRoute: (routeId: string) => void;
  onOpenSpikeModal: () => void;
}

export const RadarView: React.FC<RadarViewProps> = ({
  routes,
  onSelectRoute,
  onOpenSpikeModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'fare' | 'change' | 'index' | 'name'>('change');

  const filteredRoutes = routes.filter((r) => {
    const matchesSearch =
      r.route_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.origin_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.dest_city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRegion =
      regionFilter === 'ALL' ||
      r.origin_region?.toUpperCase() === regionFilter ||
      r.dest_region?.toUpperCase() === regionFilter;

    return matchesSearch && matchesRegion;
  });

  const sortedRoutes = [...filteredRoutes].sort((a, b) => {
    if (sortBy === 'change') return Math.abs(b.change_24h_pct || 0) - Math.abs(a.change_24h_pct || 0);
    if (sortBy === 'index') return (b.current_index || 0) - (a.current_index || 0);
    if (sortBy === 'fare') return (b.current_fare || 0) - (a.current_fare || 0);
    return a.route_id.localeCompare(b.route_id);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-navy-800/80 border border-navy-700/80 p-5 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">AIRFARE-RADAR</h2>
              <p className="text-xs text-slate-400">
                Real-Time Corridor Surveillance & High-Frequency Price Gouging Monitor
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search route or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-navy-900 border border-navy-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 w-48"
            />
          </div>

          {/* Region Tabs */}
          <div className="flex bg-navy-900 border border-navy-700 rounded-lg p-0.5 text-xs">
            {['ALL', 'NORTH', 'WEST', 'SOUTH', 'EAST'].map((reg) => (
              <button
                key={reg}
                onClick={() => setRegionFilter(reg)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  regionFilter === reg
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1.5 bg-navy-900 border border-navy-700 rounded-lg px-2 py-1 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="change" className="bg-navy-900">Highest % Volatility</option>
              <option value="index" className="bg-navy-900">Highest Index Value</option>
              <option value="fare" className="bg-navy-900">Highest Fare (INR)</option>
              <option value="name" className="bg-navy-900">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Corridor Cards Grid (Exact slide layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedRoutes.map((route) => {
          const currentFare = route.current_fare || route.base_fare_inr;
          const minFare = route.min_fare || Math.round(route.base_fare_inr * 0.8);
          const maxFare = route.max_fare || Math.round(route.base_fare_inr * 1.5);
          const changePct = route.change_24h_pct || 0;
          const isUp = changePct >= 0;
          const currentIndex = route.current_index || 100.0;
          const hasSpike = route.has_spike;

          // Compute percentage position in fare band
          const fareRange = Math.max(1, maxFare - minFare);
          const bandPosPct = Math.min(100, Math.max(0, ((currentFare - minFare) / fareRange) * 100));

          return (
            <div
              key={route.route_id}
              onClick={() => onSelectRoute(route.route_id)}
              className={`relative bg-navy-800/90 border rounded-2xl p-5 shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-2xl ${
                hasSpike
                  ? 'border-red-500/80 shadow-red-950/40 ring-1 ring-red-500/50'
                  : 'border-navy-700/80 hover:border-teal-500/50'
              }`}
            >
              {/* Spiking Flash Badge */}
              {hasSpike && (
                <div className="absolute -top-3 right-4 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-accent-orange text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-red-600/40 animate-bounce">
                  <Flame className="w-3.5 h-3.5 fill-white" />
                  <span>PRICE SPIKE ALERT</span>
                </div>
              )}

              {/* Card Header: Route Name & Direction */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-black font-mono text-white tracking-wide">
                      {route.route_id}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-navy-900 text-slate-300 font-mono border border-navy-700">
                      {route.distance_km} km
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    {route.origin_city} ➔ {route.dest_city}
                  </div>
                </div>

                {/* Sub-Index Value Pill */}
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Route Index</div>
                  <div className="text-lg font-black font-mono text-teal-400">
                    {currentIndex.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Middle Section: Current Fare & 24h Delta */}
              <div className="my-5 p-3 rounded-xl bg-navy-900/80 border border-navy-700/60 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Current Average Fare
                  </span>
                  <span className="text-2xl font-black font-mono text-white tracking-tight">
                    ₹{currentFare.toLocaleString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    24h Movement
                  </span>
                  <span
                    className={`inline-flex items-center text-sm font-bold font-mono px-2 py-0.5 rounded ${
                      isUp
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isUp ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                    {changePct > 0 ? `+${changePct}%` : `${changePct}%`}
                  </span>
                </div>
              </div>

              {/* Fare Band Slider Indicator */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Min: ₹{minFare.toLocaleString()}</span>
                  <span className="text-slate-300 font-semibold">Band Spread</span>
                  <span>Max: ₹{maxFare.toLocaleString()}</span>
                </div>
                <div className="w-full bg-navy-900 h-2 rounded-full overflow-hidden relative border border-navy-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      hasSpike ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-teal-500 to-sky-400'
                    }`}
                    style={{ width: `${Math.max(8, bandPosPct)}%` }}
                  ></div>
                </div>
              </div>

              {/* Card Footer: Updated Timer & Status */}
              <div className="mt-4 pt-3 border-t border-navy-700/60 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Updated {route.updated_at || 'Just now'}</span>
                </div>
                <span className="text-teal-400 hover:text-teal-300 font-medium">
                  Inspect Curve ➔
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRoutes.length === 0 && (
        <div className="text-center py-16 bg-navy-800/40 rounded-2xl border border-navy-700 text-slate-400">
          <p className="text-sm font-semibold">No corridors match your search criteria.</p>
          <button
            onClick={() => { setSearchTerm(''); setRegionFilter('ALL'); }}
            className="mt-2 text-xs text-teal-400 underline"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
