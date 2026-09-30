import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PipelineStrip } from './components/PipelineStrip';
import { SimulateSpikeModal } from './components/SimulateSpikeModal';
import { OverviewView } from './views/OverviewView';
import { RadarView } from './views/RadarView';
import { RouteExplorerView } from './views/RouteExplorerView';
import { GeographicView } from './views/GeographicView';
import { AlertsView } from './views/AlertsView';
import { GovernanceView } from './views/GovernanceView';
import { BacktestView } from './views/BacktestView';
import { RouteDetail, NationalIndexSummary, AlertItem } from './types';
import { apiClient, streamSubscriber } from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [routes, setRoutes] = useState<RouteDetail[]>([]);
  const [nationalData, setNationalData] = useState<NationalIndexSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('DEL-BOM');
  const [isSpikeModalOpen, setIsSpikeModalOpen] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [lastCycleTime, setLastCycleTime] = useState<string>('Just now');

  const loadData = async () => {
    try {
      const [routesRes, nationalRes, alertsRes] = await Promise.all([
        apiClient.getRoutes(),
        apiClient.getNationalIndex(),
        apiClient.getAlerts(),
      ]);
      setRoutes(routesRes);
      setNationalData(nationalRes);
      setAlerts(alertsRes);
      setLastCycleTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
    // Periodic refresh every 15s to keep live data fresh
    const interval = setInterval(loadData, 15000);

    // WebSocket real-time event listener
    const unsubscribe = streamSubscriber.subscribe((event) => {
      console.log('[WebSocket Event Received]:', event);
      if (event.type === 'NEW_ALERT' || event.type === 'COLLECTION_CYCLE_COMPLETED') {
        loadData();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      await apiClient.triggerManualCollection();
      await loadData();
    } catch (err) {
      console.error('Failed manual trigger:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleTriggerSpike = async (routeId: string, multiplier: number) => {
    await apiClient.simulateSpike(routeId, multiplier);
    await loadData();
  };

  const handleSelectRouteFromAnywhere = (routeId: string) => {
    setSelectedRouteId(routeId);
    setActiveTab('explorer');
  };

  return (
    <div className="min-h-screen bg-[#070F1D] text-slate-100 flex flex-col font-['Inter',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSpikeModal={() => setIsSpikeModalOpen(true)}
        onManualTrigger={handleManualTrigger}
        isTriggering={isTriggering}
        activeAlertCount={alerts.filter((a) => a.is_active).length}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Pipeline Visualizer Strip */}
        <PipelineStrip
          lastUpdated={lastCycleTime}
          totalCollected={nationalData?.sample_count || 114690}
          totalDeduped={38400}
          totalOutliers={142}
        />

        {/* Active Tab View */}
        {activeTab === 'overview' && (
          <OverviewView
            nationalData={nationalData}
            routes={routes}
            alerts={alerts}
            onSelectRoute={handleSelectRouteFromAnywhere}
          />
        )}

        {activeTab === 'radar' && (
          <RadarView
            routes={routes}
            onSelectRoute={handleSelectRouteFromAnywhere}
            onOpenSpikeModal={() => setIsSpikeModalOpen(true)}
          />
        )}

        {activeTab === 'explorer' && (
          <RouteExplorerView
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRouteId={setSelectedRouteId}
          />
        )}

        {activeTab === 'geo' && (
          <GeographicView
            routes={routes}
            nationalData={nationalData}
            onSelectRoute={handleSelectRouteFromAnywhere}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            onOpenSpikeModal={() => setIsSpikeModalOpen(true)}
            onSelectRoute={handleSelectRouteFromAnywhere}
          />
        )}

        {activeTab === 'governance' && <GovernanceView />}

        {activeTab === 'backtest' && <BacktestView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-800 bg-navy-900/60 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white">AIRFARE-INDEX</span>
            <span>• Ministry of Statistics and Programme Implementation (MoSPI, DIID)</span>
          </div>
          <div>
            Smart India Hackathon 2026 • Problem Statement 26056 • <span className="text-teal-400 font-semibold">Team MediMinds</span>
          </div>
        </div>
      </footer>

      {/* Interactive Spike Simulator Modal */}
      <SimulateSpikeModal
        isOpen={isSpikeModalOpen}
        onClose={() => setIsSpikeModalOpen(false)}
        routes={routes}
        onTriggerSpike={handleTriggerSpike}
      />
    </div>
  );
};
