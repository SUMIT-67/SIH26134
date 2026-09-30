import React, { useState } from 'react';
import { X, Flame, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { RouteDetail } from '../types';

interface SimulateSpikeModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: RouteDetail[];
  onTriggerSpike: (routeId: string, multiplier: number) => Promise<void>;
}

export const SimulateSpikeModal: React.FC<SimulateSpikeModalProps> = ({
  isOpen,
  onClose,
  routes,
  onTriggerSpike,
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string>('DEL-BOM');
  const [spikeMultiplier, setSpikeMultiplier] = useState<number>(1.65);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      await onTriggerSpike(selectedRoute, spikeMultiplier);
      const pct = Math.round((spikeMultiplier - 1.0) * 100);
      setSuccessMsg(`Simulated +${pct}% spike injected on ${selectedRoute}! Watch the AIRFARE-RADAR card and Alerts view.`);
      setTimeout(() => {
        setIsSubmitting(false);
      }, 500);
    } catch (err: any) {
      alert(`Error injecting spike: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-navy-800 border border-navy-600 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-navy-700"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-accent-orange border border-orange-500/30 flex items-center justify-center">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Live Spike Simulator (Demo Mode)</h3>
            <p className="text-xs text-slate-400">Inject an intentional price surge to demonstrate live detection.</p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        <div className="space-x-1 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Target Corridor
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
            >
              {routes.map((r) => (
                <option key={r.route_id} value={r.route_id}>
                  {r.route_id} ({r.origin_city} ➔ {r.dest_city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Spike Intensity
              </label>
              <span className="text-xs font-mono font-bold text-accent-orange">
                +{Math.round((spikeMultiplier - 1.0) * 100)}% Jump
              </span>
            </div>
            <input
              type="range"
              min="1.25"
              max="2.50"
              step="0.05"
              value={spikeMultiplier}
              onChange={(e) => setSpikeMultiplier(parseFloat(e.target.value))}
              className="w-full h-2 bg-navy-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>+25% (Warning)</span>
              <span>+65% (Critical)</span>
              <span>+150% (Flash Gouge)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-navy-900/80 border border-navy-700/60 text-xs text-slate-300 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              Upon clicking, the scheduler runs an abnormal observation batch. The <strong>Normalization Engine</strong> preserves it for audit, the <strong>Index Engine</strong> elevates the sub-index, and the <strong>Alerts Engine</strong> pushes a real-time event.
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-700 transition"
          >
            Close
          </button>
          <button
            onClick={handleSimulate}
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent-orange to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-orange-600/30 transition transform active:scale-95 disabled:opacity-50"
          >
            <Flame className="w-4 h-4" />
            <span>{isSubmitting ? 'Injecting...' : 'Inject Spike Live'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
