import React, { useState } from 'react';
import { Map, Plane, Compass, Info, ArrowRight } from 'lucide-react';
import { RouteDetail, NationalIndexSummary } from '../types';

interface GeographicViewProps {
  routes: RouteDetail[];
  nationalData: NationalIndexSummary | null;
  onSelectRoute: (routeId: string) => void;
}

// Normalized SVG positions for major Indian aviation hubs (0 to 600 width, 0 to 650 height)
const AIRPORT_COORDS: Record<string, { x: number; y: number; name: string; city: string; region: string }> = {
  DEL: { x: 260, y: 160, name: 'Indira Gandhi Intl', city: 'Delhi', region: 'North' },
  JAI: { x: 240, y: 195, name: 'Jaipur Intl', city: 'Jaipur', region: 'North' },
  AMD: { x: 195, y: 280, name: 'Sardar Vallabhbhai Patel', city: 'Ahmedabad', region: 'West' },
  BOM: { x: 200, y: 360, name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', region: 'West' },
  PNQ: { x: 220, y: 390, name: 'Pune Airport', city: 'Pune', region: 'West' },
  GOI: { x: 215, y: 470, name: 'Dabolim / Manohar Intl', city: 'Goa', region: 'West' },
  HYD: { x: 295, y: 400, name: 'Rajiv Gandhi Intl', city: 'Hyderabad', region: 'South' },
  BLR: { x: 275, y: 490, name: 'Kempegowda Intl', city: 'Bengaluru', region: 'South' },
  MAA: { x: 330, y: 505, name: 'Chennai Intl', city: 'Chennai', region: 'South' },
  CCU: { x: 450, y: 270, name: 'Netaji Subhash Chandra Bose', city: 'Kolkata', region: 'East' },
};

export const GeographicView: React.FC<GeographicViewProps> = ({
  routes,
  nationalData,
  onSelectRoute,
}) => {
  const [selectedRouteHover, setSelectedRouteHover] = useState<RouteDetail | null>(null);
  const [selectedHub, setSelectedHub] = useState<string | null>(null);

  // Group unique undirected pairs for cleaner map visualization
  const routePairs = routes.slice(0, 15);

  const getRouteStroke = (route: RouteDetail) => {
    if (route.has_spike || (route.current_index && route.current_index >= 125)) {
      return '#EF4444'; // Red for spike
    }
    if (route.current_index && route.current_index >= 115) {
      return '#F59E0B'; // Amber for elevated
    }
    return '#0D9488'; // Teal for standard
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-navy-800/80 border border-navy-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">Geographic Price Index & Corridor Arcs</h2>
              <p className="text-xs text-slate-400">
                Spatial distribution of price relatives across Indian domestic airspace
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs font-medium">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1 bg-teal-500 rounded"></span>
            <span className="text-slate-300">Baseline (Index &lt; 115)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1 bg-amber-500 rounded"></span>
            <span className="text-slate-300">Elevated (115-125)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1 bg-red-500 rounded animate-pulse"></span>
            <span className="text-rose-400 font-bold">Surge / Spike (&gt; 125)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive SVG India Aviation Map (2 cols) */}
        <div className="lg:col-span-2 bg-navy-800/80 border border-navy-700/80 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          {/* Active Hover Floating Info Card */}
          {selectedRouteHover && (
            <div className="absolute top-4 left-4 z-20 bg-navy-900/95 border border-teal-500/60 rounded-xl p-3.5 shadow-2xl backdrop-blur max-w-xs animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black font-mono text-white">{selectedRouteHover.route_id}</span>
                <span className="text-xs font-mono font-bold text-teal-400">
                  Index {selectedRouteHover.current_index?.toFixed(1)}
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {selectedRouteHover.origin_city} ➔ {selectedRouteHover.dest_city}
              </div>
              <div className="mt-2 pt-2 border-t border-navy-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">₹{selectedRouteHover.current_fare?.toLocaleString()}</span>
                <span className={`font-mono font-bold ${(selectedRouteHover.change_24h_pct || 0) >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {(selectedRouteHover.change_24h_pct || 0) >= 0 ? '+' : ''}{selectedRouteHover.change_24h_pct}%
                </span>
              </div>
            </div>
          )}

          <svg
            viewBox="0 0 580 620"
            className="w-full max-w-[540px] h-auto drop-shadow-md select-none"
          >
            <defs>
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
              </radialGradient>
              <linearGradient id="indiaBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#0A192F" />
              </linearGradient>
            </defs>

            {/* Stylized Indian Subcontinent Outline Path */}
            <path
              d="M 230,80 L 290,95 L 320,130 L 350,150 L 460,190 L 510,210 L 490,260 L 430,290 L 360,330 L 340,430 L 310,540 L 260,560 L 230,510 L 200,450 L 175,340 L 155,270 L 170,200 L 205,140 Z"
              fill="url(#indiaBg)"
              stroke="#1E293B"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              opacity="0.8"
            />

            {/* Flight Route Arcs */}
            {routePairs.map((route) => {
              const orig = AIRPORT_COORDS[route.origin];
              const dest = AIRPORT_COORDS[route.destination];
              if (!orig || !dest) return null;

              // Quadratic bezier curve midpoint offset for arc effect
              const midX = (orig.x + dest.x) / 2;
              const midY = (orig.y + dest.y) / 2 - 25;
              const pathD = `M ${orig.x} ${orig.y} Q ${midX} ${midY} ${dest.x} ${dest.y}`;
              const strokeColor = getRouteStroke(route);
              const isSpike = route.has_spike || (route.current_index && route.current_index >= 125);

              return (
                <g key={route.route_id} className="cursor-pointer">
                  {/* Invisible thicker hover target */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                    onMouseEnter={() => setSelectedRouteHover(route)}
                    onMouseLeave={() => setSelectedRouteHover(null)}
                    onClick={() => onSelectRoute(route.route_id)}
                  />
                  {/* Visual Route Arc */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isSpike ? 3.0 : 1.8}
                    strokeOpacity={isSpike ? 0.95 : 0.65}
                    className="transition-all hover:stroke-white hover:stroke-width-3"
                  />
                </g>
              );
            })}

            {/* Airport Hub Nodes */}
            {Object.entries(AIRPORT_COORDS).map(([code, airport]) => {
              const isSelected = selectedHub === code;
              return (
                <g
                  key={code}
                  transform={`translate(${airport.x}, ${airport.y})`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedHub(code)}
                >
                  <circle r="14" fill="url(#hubGlow)" className="animate-pulse" />
                  <circle
                    r="5"
                    fill={code === 'DEL' || code === 'BOM' ? '#F97316' : '#14B8A6'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  {/* Airport Label */}
                  <text
                    y="-9"
                    textAnchor="middle"
                    fill="#F1F5F9"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {code}
                  </text>
                  <text
                    y="16"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="8"
                    fontFamily="Inter, sans-serif"
                  >
                    {airport.city}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Regional Breakdown Panels & Corridors List (1 col) */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="bg-navy-800/80 border border-navy-700/80 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <Compass className="w-4 h-4 text-teal-400" />
              <span>Regional Sub-Index Performance</span>
            </h3>

            <div className="space-y-3">
              {[
                { name: 'North', index: nationalData?.regional_breakdown?.North || 118.2, routes: 'DEL, JAI', color: 'border-sky-500/40 text-sky-400' },
                { name: 'West', index: nationalData?.regional_breakdown?.West || 117.5, routes: 'BOM, GOI, AMD, PNQ', color: 'border-orange-500/40 text-accent-orange' },
                { name: 'South', index: nationalData?.regional_breakdown?.South || 115.1, routes: 'BLR, HYD, MAA', color: 'border-teal-500/40 text-teal-400' },
                { name: 'East', index: nationalData?.regional_breakdown?.East || 119.8, routes: 'CCU', color: 'border-purple-500/40 text-purple-400' },
              ].map((reg) => (
                <div key={reg.name} className={`p-3 rounded-xl bg-navy-900/80 border ${reg.color} flex items-center justify-between`}>
                  <div>
                    <div className="font-bold text-white text-xs">{reg.name} Region</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Airports: {reg.routes}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black font-mono text-white">{reg.index.toFixed(1)}</div>
                    <div className="text-[9px] text-slate-400 uppercase">Sub-Index</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Corridor Navigation */}
          <div className="bg-navy-800/80 border border-navy-700/80 rounded-2xl p-5 shadow-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Top Trunk Corridors
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {routes.slice(0, 6).map((r) => (
                <div
                  key={r.route_id}
                  onClick={() => onSelectRoute(r.route_id)}
                  className="p-2 rounded-lg bg-navy-900/60 hover:bg-navy-700/50 border border-navy-700/60 flex items-center justify-between cursor-pointer transition"
                >
                  <span className="font-mono font-bold text-slate-200">{r.route_id}</span>
                  <div className="flex items-center space-x-3 font-mono">
                    <span className="text-slate-400">₹{r.current_fare?.toLocaleString()}</span>
                    <span className="text-teal-400 font-bold">{r.current_index?.toFixed(1)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
