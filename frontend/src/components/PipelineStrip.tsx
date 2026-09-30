import React from 'react';
import { ArrowRight, Plane, Globe, SlidersHorizontal, Calculator, BellRing } from 'lucide-react';

interface PipelineStripProps {
  lastUpdated?: string;
  totalCollected?: number;
  totalDeduped?: number;
  totalOutliers?: number;
}

export const PipelineStrip: React.FC<PipelineStripProps> = ({
  lastUpdated = 'Just now',
  totalCollected = 114690,
  totalDeduped = 38400,
  totalOutliers = 142,
}) => {
  const stages = [
    {
      label: 'Airline Portals',
      sub: 'IndiGo, AI, Akasa, SpiceJet, AIX',
      count: '5 Direct APIs',
      icon: Plane,
      color: 'text-sky-400 bg-sky-950/60 border-sky-800/60',
    },
    {
      label: 'OTA Portals',
      sub: 'MMT, Goibibo, Cleartrip, EaseMyTrip',
      count: '4 Metasearchers',
      icon: Globe,
      color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60',
    },
    {
      label: 'Fare Normalization',
      sub: 'Basket Standard + Deduplication + IQR',
      count: `${totalDeduped.toLocaleString()} Deduped`,
      icon: SlidersHorizontal,
      color: 'text-teal-400 bg-teal-950/60 border-teal-800/60',
    },
    {
      label: 'Index Engine',
      sub: 'Jevons (r,b) + Laspeyres Rollup',
      count: 'MoSPI Aligned',
      icon: Calculator,
      color: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    },
    {
      label: 'Live Alerts',
      sub: 'Z-Score Spike + WebSocket Push',
      count: 'Active Stream',
      icon: BellRing,
      color: 'text-accent-orange bg-orange-950/60 border-orange-800/60',
    },
  ];

  return (
    <div className="bg-navy-800/90 border border-navy-700 rounded-xl p-3.5 shadow-md">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            End-to-End Autonomous Pipeline
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
            ACTIVE
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Last Cycle: <span className="text-teal-400 font-semibold">{lastUpdated}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 relative">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div key={idx} className="relative flex items-center">
              <div className={`w-full p-2.5 rounded-lg border flex items-center space-x-3 transition hover:border-slate-500 ${stage.color}`}>
                <div className="p-1.5 rounded-md bg-navy-900/60">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{stage.label}</div>
                  <div className="text-[10px] text-slate-300 truncate">{stage.sub}</div>
                  <div className="text-[9px] font-mono text-teal-300 font-medium mt-0.5">{stage.count}</div>
                </div>
              </div>
              {idx < stages.length - 1 && (
                <div className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 bg-navy-900 text-slate-500 rounded-full p-0.5 border border-navy-700">
                  <ArrowRight className="w-3 h-3 text-teal-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
