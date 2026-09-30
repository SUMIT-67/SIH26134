import React from 'react';
import { 
  Plane, 
  Activity, 
  ShieldCheck, 
  Flame, 
  RefreshCw, 
  Radio, 
  FileSpreadsheet, 
  Map, 
  Bell, 
  Layers, 
  TrendingUp 
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSpikeModal: () => void;
  onManualTrigger: () => void;
  isTriggering: boolean;
  activeAlertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSpikeModal,
  onManualTrigger,
  isTriggering,
  activeAlertCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'radar', label: 'AIRFARE-RADAR', icon: Radio, highlight: true },
    { id: 'explorer', label: 'Route Explorer', icon: Plane },
    { id: 'geo', label: 'Geographic View', icon: Map },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: activeAlertCount },
    { id: 'governance', label: 'Data Quality & Audit', icon: ShieldCheck },
    { id: 'backtest', label: '30D Back-Test & CPI', icon: FileSpreadsheet },
  ];

  return (
    <header className="border-b border-navy-700 bg-navy-900/90 backdrop-blur sticky top-0 z-50">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-2 border-b border-navy-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-semibold text-teal-400">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>MoSPI DIID</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">Smart India Hackathon 2026 • PS 26056</span>
          <span className="text-slate-500">|</span>
          <span className="bg-navy-700 text-teal-300 px-2 py-0.5 rounded font-mono text-[11px]">
            Team: MediMinds
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>MOCK_MODE: True (5 Airlines • 4 OTAs)</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
            <span>Base: 2026-08-31=100</span>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-navy-700 flex items-center justify-center text-white shadow-lg shadow-teal-500/10">
            <Plane className="w-5 h-5 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-wider text-white">AIRFARE-INDEX</span>
              <span className="bg-accent-orange/20 text-accent-orange text-[10px] font-bold px-1.5 py-0.5 rounded border border-accent-orange/30">
                MoSPI PROTOTYPE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">National High-Frequency Airfare Consumer Price Index</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onManualTrigger}
            disabled={isTriggering}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-navy-700 hover:bg-navy-600 text-slate-200 text-xs font-medium border border-navy-600 transition disabled:opacity-50"
            title="Trigger an immediate collection cycle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin text-teal-400' : ''}`} />
            <span>{isTriggering ? 'Scraping...' : 'Trigger Run'}</span>
          </button>

          <button
            onClick={onOpenSpikeModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-gradient-to-r from-accent-orange to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition transform active:scale-95"
            title="Demo trigger: Inject price spike on a route"
          >
            <Flame className="w-3.5 h-3.5 animate-bounce" />
            <span>Simulate Spike</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex space-x-1 overflow-x-auto scrollbar-none border-t border-navy-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-navy-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'} ${item.highlight && !isActive ? 'text-accent-orange' : ''}`} />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500/80 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
