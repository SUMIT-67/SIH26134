import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  delta?: {
    value: string | number;
    isPositive: boolean;
    label?: string;
  };
  icon: LucideIcon;
  badge?: string;
  colorScheme?: 'teal' | 'orange' | 'sky' | 'indigo' | 'emerald';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subValue,
  delta,
  icon: Icon,
  badge,
  colorScheme = 'teal',
}) => {
  const colorMap = {
    teal: 'from-teal-500/20 to-teal-500/5 text-teal-400 border-teal-500/30',
    orange: 'from-orange-500/20 to-orange-500/5 text-accent-orange border-orange-500/30',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/30',
    indigo: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/30',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30',
  };

  return (
    <div className="bg-navy-800/80 border border-navy-700/80 rounded-xl p-4 shadow-md hover:border-slate-600 transition flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg bg-gradient-to-br border ${colorMap[colorScheme]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black text-white font-mono">{value}</span>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-navy-700 text-teal-300 border border-navy-600">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-navy-700/50 text-xs">
          {delta ? (
            <div className="flex items-center space-x-1">
              <span
                className={`font-semibold font-mono ${
                  delta.isPositive ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {delta.isPositive ? '▲' : '▼'} {delta.value}
              </span>
              <span className="text-[11px] text-slate-400">{delta.label || 'vs baseline'}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">{subValue}</span>
          )}
        </div>
      </div>
    </div>
  );
};
