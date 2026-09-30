import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Flame, 
  Info, 
  Filter, 
  CheckCircle, 
  Plane, 
  ArrowUpRight 
} from 'lucide-react';
import { AlertItem } from '../types';

interface AlertsViewProps {
  alerts: AlertItem[];
  onOpenSpikeModal: () => void;
  onSelectRoute: (routeId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onOpenSpikeModal,
  onSelectRoute,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    const matchesSev = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchesType = typeFilter === 'ALL' || a.alert_type === typeFilter;
    return matchesSev && matchesType;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;
  const infoCount = alerts.filter((a) => a.severity === 'INFO').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-navy-800/80 border border-navy-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-orange-500/20 text-accent-orange border border-orange-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">Market Surveillance & Price Surge Alerts</h2>
              <p className="text-xs text-slate-400">
                Automated statistical anomaly detection (Rolling Z-Score &gt; 2.5 &amp; Volatility Thresholds)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenSpikeModal}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent-orange to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-orange-600/30 transition transform active:scale-95 self-start md:self-auto"
        >
          <Flame className="w-4 h-4 animate-pulse" />
          <span>Simulate Spike (Demo)</span>
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setSeverityFilter(severityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            severityFilter === 'CRITICAL'
              ? 'bg-red-950/80 border-red-500 ring-1 ring-red-500'
              : 'bg-navy-800/80 border-navy-700 hover:border-red-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Critical Surges</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2">{criticalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Jump &gt; 35% or Index &gt; 135.0</div>
        </div>

        <div 
          onClick={() => setSeverityFilter(severityFilter === 'WARNING' ? 'ALL' : 'WARNING')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            severityFilter === 'WARNING'
              ? 'bg-orange-950/80 border-orange-500 ring-1 ring-orange-500'
              : 'bg-navy-800/80 border-navy-700 hover:border-orange-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-orange">Warning Spikes</span>
            <AlertTriangle className="w-4 h-4 text-accent-orange" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2">{warningCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Jump 20% - 35% vs 7d Median</div>
        </div>

        <div 
          onClick={() => setSeverityFilter(severityFilter === 'INFO' ? 'ALL' : 'INFO')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            severityFilter === 'INFO'
              ? 'bg-sky-950/80 border-sky-500 ring-1 ring-sky-500'
              : 'bg-navy-800/80 border-navy-700 hover:border-sky-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Flash Drops / Info</span>
            <Info className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2">{infoCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Promotional drops &lt; -25%</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-navy-800/60 p-3 rounded-xl border border-navy-700">
        <div className="flex items-center space-x-2 text-xs font-medium">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400">Filter Severity:</span>
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                severityFilter === s
                  ? 'bg-teal-600 text-white'
                  : 'bg-navy-900 text-slate-400 hover:text-white border border-navy-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredAlerts.length} active events
        </span>
      </div>

      {/* Alerts Table */}
      <div className="bg-navy-800/80 border border-navy-700/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-navy-900 border-b border-navy-700 text-slate-400">
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Corridor</th>
                <th className="py-3 px-4">Flight / Airline</th>
                <th className="py-3 px-4 text-right">Current Fare</th>
                <th className="py-3 px-4 text-right">Baseline Fare</th>
                <th className="py-3 px-4 text-right">% Change</th>
                <th className="py-3 px-4 text-right">Z-Score</th>
                <th className="py-3 px-4">Notification Message</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/50 text-slate-200">
              {filteredAlerts.map((a) => {
                const isCritical = a.severity === 'CRITICAL';
                const isWarning = a.severity === 'WARNING';
                return (
                  <tr key={a.id} className="hover:bg-navy-700/30 transition">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCritical
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isWarning
                            ? 'bg-orange-500/20 text-accent-orange border border-orange-500/30'
                            : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {isCritical && <Flame className="w-3 h-3" />}
                        {isWarning && <AlertTriangle className="w-3 h-3" />}
                        <span>{a.severity}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{a.route_id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{a.flight_no || 'Route-Wide'}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{a.airline || 'Multiple Carriers'}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white">₹{a.current_fare.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-slate-400">₹{a.baseline_fare.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${a.change_pct >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {a.change_pct >= 0 ? `+${a.change_pct}%` : `${a.change_pct}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-teal-400 font-bold">{a.z_score || 'N/A'}</td>
                    <td className="py-3 px-4 font-sans text-xs text-slate-300 max-w-xs truncate">
                      {a.message}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectRoute(a.route_id)}
                        className="px-2.5 py-1 rounded bg-navy-900 hover:bg-teal-600 hover:text-white text-teal-400 border border-navy-700 text-[11px] font-semibold transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
