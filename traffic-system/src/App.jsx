import React from 'react';
import { useSocket } from './hooks/useSocket';
import { Header } from './components/Header';
import { EmergencyBanner } from './components/EmergencyBanner';
import { RoadSituationPanel } from './components/RoadSituationPanel';
import { RoadAnomaliesPanel } from './components/RoadAnomaliesPanel';
import { TrafficCameraGrid } from './components/TrafficCameraGrid';
import { IntersectionVisualizer } from './components/IntersectionVisualizer';
import { TrafficStatsPanel } from './components/TrafficStatsPanel';
import { ModeControlPanel } from './components/ModeControlPanel';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { SystemStatus } from './components/SystemStatus';
import { ScenarioSimulator } from './components/ScenarioSimulator';

export default function App() {
  const { systemState, connectionStatus, lastUpdated, logs, addLog } = useSocket();

  const { mode, weather, emergency, safetyHold, lanes, anomalies, roadSituation } = systemState;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-pattern">
      {/* Top Operations Header */}
      <Header
        mode={mode}
        weather={weather}
        emergency={emergency}
        connectionStatus={connectionStatus}
      />

      {/* Main Operations Dashboard Container */}
      <main className="flex-1 p-4 md:p-6 max-w-[1700px] w-full mx-auto space-y-4">
        {/* Emergency Preemption Banner */}
        <EmergencyBanner emergency={emergency} lanes={lanes} />

        {/* Prominent "WHAT'S HAPPENING?" Road Situation Summary Panel */}
        <RoadSituationPanel
          roadSituation={roadSituation}
          safetyHold={safetyHold}
        />

        {/* Primary 2-Column Responsive Operational Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left Column: Live Video Feeds, Telemetry Breakdown & Controls (7 Cols on XL) */}
          <div className="xl:col-span-7 space-y-4 flex flex-col">
            {/* Live 2x2 Camera Feeds with Color-Coded Entity Boxes */}
            <TrafficCameraGrid lanes={lanes} emergency={emergency} />

            {/* Classified Entity Telemetry (Vehicles, Pedestrians, Animals) */}
            <TrafficStatsPanel
              lanes={lanes}
              mode={mode}
            />

            {/* System Mode Switcher */}
            <ModeControlPanel currentMode={mode} addLog={addLog} />

            {/* Operational Scenario Test Harness (8 Master Test Cases) */}
            <ScenarioSimulator addLog={addLog} />
          </div>

          {/* Right Column: Signal Visualizer, Road Anomalies, System Health, Audit Log (5 Cols on XL) */}
          <div className="xl:col-span-5 space-y-4 flex flex-col">
            {/* 4-Way Intersection Signal Visualizer */}
            <IntersectionVisualizer
              lanes={lanes}
              weather={weather}
              emergency={emergency}
            />

            {/* Road Anomaly Monitoring & Safety Alerts */}
            <RoadAnomaliesPanel anomalies={anomalies} />

            {/* Infrastructure & Subsystem Heartbeat */}
            <SystemStatus
              connectionStatus={connectionStatus}
              lastUpdated={lastUpdated}
              mode={mode}
              emergency={emergency}
            />

            {/* Real-Time Operational Event Audit Log */}
            <div className="flex-1 min-h-[220px]">
              <ActivityLogPanel logs={logs} />
            </div>
          </div>
        </div>
      </main>

      {/* Industrial Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 px-6 text-center text-xs font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>AI TRAFFIC INTELLIGENCE • REAL-TIME ROAD ANOMALY & SAFETY PREEMPTION SYSTEM</span>
        </div>
        <div>
          <span>YOLOv8 Multi-Class Engine • Temporal Behavioral Analysis</span>
        </div>
      </footer>
    </div>
  );
}
