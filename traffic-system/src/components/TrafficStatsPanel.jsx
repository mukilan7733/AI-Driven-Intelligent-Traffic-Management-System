import React from 'react';
import { Car, Truck, Bus, Bike, Users, Dog, AlertTriangle, Layers } from 'lucide-react';

export const TrafficStatsPanel = ({ lanes, mode }) => {
  const LANES = ['north', 'east', 'south', 'west'];

  let totalVehicles = 0;
  let totalPedestrians = 0;
  let totalAnimals = 0;

  const aggregatedBreakdown = {
    car: 0,
    truck: 0,
    bus: 0,
    motorcycle: 0,
    bicycle: 0
  };

  const laneCounts = LANES.map((id) => {
    const lane = lanes?.[id] || {};
    const count = lane.vehicles || 0;
    totalVehicles += count;
    totalPedestrians += (lane.pedestrians || 0);
    totalAnimals += (lane.animals || 0);

    const bd = lane.breakdown || {};
    aggregatedBreakdown.car += (bd.car || 0);
    aggregatedBreakdown.truck += (bd.truck || 0);
    aggregatedBreakdown.bus += (bd.bus || 0);
    aggregatedBreakdown.motorcycle += (bd.motorcycle || 0);
    aggregatedBreakdown.bicycle += (bd.bicycle || 0);

    return {
      id,
      name: `${id.toUpperCase()} Approach`,
      count,
      signal: lane.signal || 'RED',
      pedestrians: lane.pedestrians || 0,
      animals: lane.animals || 0
    };
  });

  const busiest = [...laneCounts].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          ROAD ENTITY TELEMETRY & CLASSIFIED COUNTS
        </h2>
        <span className="text-[11px] font-mono text-slate-500">
          DISTINCT ENTITY CLASSIFICATION
        </span>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Total Vehicles */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Vehicles</span>
            <Car className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100">{totalVehicles}</div>
          <span className="text-[10px] font-mono text-slate-500">All 4 Corridors</span>
        </div>

        {/* Pedestrians */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Pedestrians</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-indigo-300">{totalPedestrians}</div>
          <span className="text-[10px] font-mono text-slate-500">Crosswalks & Curbs</span>
        </div>

        {/* Animals */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Animals</span>
            <Dog className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-amber-300">{totalAnimals}</div>
          <span className="text-[10px] font-mono text-slate-500">Dogs / Cats Monitored</span>
        </div>

        {/* Peak Approach */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Peak Corridor</span>
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 uppercase">
            {busiest?.count > 0 ? busiest.id : 'EQUAL'}
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {busiest?.count > 0 ? `${busiest.count} waiting vehicles` : 'Free flow'}
          </span>
        </div>
      </div>

      {/* Vehicle Type Classification Breakdown */}
      <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
        <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider uppercase block mb-2">
          VEHICLE CATEGORY BREAKDOWN (COCO MODEL VERIFIED)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <div className="bg-slate-900/90 p-2 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Car className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cars</span>
            </div>
            <strong className="text-cyan-300">{aggregatedBreakdown.car}</strong>
          </div>
          <div className="bg-slate-900/90 p-2 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span>Trucks</span>
            </div>
            <strong className="text-amber-300">{aggregatedBreakdown.truck}</strong>
          </div>
          <div className="bg-slate-900/90 p-2 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Bus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buses</span>
            </div>
            <strong className="text-emerald-300">{aggregatedBreakdown.bus}</strong>
          </div>
          <div className="bg-slate-900/90 p-2 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Bike className="w-3.5 h-3.5 text-blue-400" />
              <span>Motorcycles</span>
            </div>
            <strong className="text-blue-300">{aggregatedBreakdown.motorcycle}</strong>
          </div>
          <div className="bg-slate-900/90 p-2 rounded border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Bike className="w-3.5 h-3.5 text-teal-400" />
              <span>Bicycles</span>
            </div>
            <strong className="text-teal-300">{aggregatedBreakdown.bicycle}</strong>
          </div>
        </div>
      </div>

      {/* Lane Distribution Bars */}
      <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
        <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider uppercase block mb-1">
          QUEUE DENSITY DISTRIBUTION PER APPROACH
        </span>
        {laneCounts.map((item) => {
          const percentage = totalVehicles > 0 ? Math.round((item.count / totalVehicles) * 100) : 0;
          const isGreen = item.signal === 'GREEN';

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isGreen ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {item.signal}
                  </span>
                  <span className="text-cyan-300 font-bold">{item.count} veh</span>
                  <span className="text-slate-500 text-[10px]">({percentage}%)</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isGreen ? 'bg-emerald-500' : 'bg-cyan-500/70'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(item.count > 0 ? 5 : 0, percentage))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
