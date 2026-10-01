import React from 'react';
import { ShieldAlert } from 'lucide-react';

const TrafficLight = ({ signal, time }) => {
  const isRed = signal === 'RED';
  const isYellow = signal === 'YELLOW';
  const isGreen = signal === 'GREEN';

  return (
    <div className="flex flex-col items-center gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800 shadow-inner">
      {/* Red Lamp */}
      <div
        className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
          isRed
            ? 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
            : 'bg-rose-950/40 border-rose-950/50'
        }`}
      />
      {/* Yellow Lamp */}
      <div
        className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
          isYellow
            ? 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse'
            : 'bg-amber-950/40 border-amber-950/50'
        }`}
      />
      {/* Green Lamp */}
      <div
        className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
          isGreen
            ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            : 'bg-emerald-950/40 border-emerald-950/50'
        }`}
      />
      {/* Active Timer readout */}
      {(isGreen || isYellow) && time > 0 ? (
        <span className="text-[10px] font-mono font-bold text-white mt-0.5">
          {time}s
        </span>
      ) : (
        <span className="text-[10px] font-mono text-slate-600 mt-0.5">--</span>
      )}
    </div>
  );
};

export const IntersectionVisualizer = ({ lanes, weather, emergency }) => {
  const north = lanes?.north || { signal: 'RED', time: 0, vehicles: 0 };
  const east = lanes?.east || { signal: 'RED', time: 0, vehicles: 0 };
  const south = lanes?.south || { signal: 'RED', time: 0, vehicles: 0 };
  const west = lanes?.west || { signal: 'RED', time: 0, vehicles: 0 };

  // Find active lane
  const activeLaneKey = ['north', 'east', 'south', 'west'].find(
    (k) => lanes?.[k]?.signal === 'GREEN' || lanes?.[k]?.signal === 'YELLOW'
  );
  const activeLane = activeLaneKey ? lanes[activeLaneKey] : null;

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          INTERSECTION SIGNAL STATUS & PHASE MAP
        </h2>
        {emergency && (
          <span className="text-[10px] font-mono text-rose-400 font-bold flex items-center gap-1 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            PRIORITY PREEMPTION ACTIVE
          </span>
        )}
      </div>

      {/* 4-Way Cross Diagram */}
      <div className="relative w-full max-w-[340px] mx-auto aspect-square bg-slate-950/90 rounded-xl border border-slate-800/90 p-3 my-2 flex items-center justify-center">
        {/* Road Cross Overlays */}
        {/* Vertical Road */}
        <div className="absolute top-0 bottom-0 w-24 bg-slate-900 border-x border-dashed border-slate-700/60 flex flex-col justify-between py-2 items-center">
          <div className="w-0.5 h-full border-r border-dashed border-slate-700"></div>
        </div>
        {/* Horizontal Road */}
        <div className="absolute left-0 right-0 h-24 bg-slate-900 border-y border-dashed border-slate-700/60 flex justify-between px-2 items-center">
          <div className="h-0.5 w-full border-b border-dashed border-slate-700"></div>
        </div>

        {/* NORTH APPROACH */}
        <div className="absolute top-2 flex flex-col items-center z-10">
          <span className="text-[10px] font-mono font-bold text-slate-400">NORTH</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TrafficLight signal={north.signal} time={north.time} />
            <span className="text-[9px] font-mono text-cyan-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              {north.vehicles} veh
            </span>
          </div>
        </div>

        {/* SOUTH APPROACH */}
        <div className="absolute bottom-2 flex flex-col items-center z-10">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TrafficLight signal={south.signal} time={south.time} />
            <span className="text-[9px] font-mono text-cyan-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              {south.vehicles} veh
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400">SOUTH</span>
        </div>

        {/* WEST APPROACH */}
        <div className="absolute left-2 flex items-center gap-1 z-10">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400">WEST</span>
            <span className="text-[9px] font-mono text-cyan-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              {west.vehicles} veh
            </span>
          </div>
          <TrafficLight signal={west.signal} time={west.time} />
        </div>

        {/* EAST APPROACH */}
        <div className="absolute right-2 flex items-center gap-1 z-10">
          <TrafficLight signal={east.signal} time={east.time} />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono font-bold text-slate-400">EAST</span>
            <span className="text-[9px] font-mono text-cyan-400 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
              {east.vehicles} veh
            </span>
          </div>
        </div>

        {/* INTERSECTION CENTER JUNCTION BOX */}
        <div className="relative z-20 w-20 h-20 rounded-lg bg-slate-950 border border-slate-700/80 flex flex-col items-center justify-center p-1 text-center shadow-lg">
          {activeLane ? (
            <>
              <span className={`text-[9px] font-mono font-bold uppercase ${
                activeLane.signal === 'GREEN' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {activeLaneKey}
              </span>
              <span className="text-xl font-mono font-extrabold text-white leading-tight">
                {activeLane.time}s
              </span>
              <span className={`text-[8px] font-mono px-1 rounded uppercase ${
                activeLane.signal === 'GREEN' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
              }`}>
                {activeLane.signal}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-mono font-bold text-rose-400">ALL RED</span>
              <span className="text-xs font-mono text-slate-500">HOLD</span>
            </>
          )}
        </div>
      </div>

      {/* Junction Telemetry Footer */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-2 pt-2 border-t border-slate-800">
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-500 block text-[10px]">ACTIVE PHASE</span>
          <span className="font-bold text-slate-200">
            {activeLaneKey ? `${activeLaneKey.toUpperCase()} — ${activeLane.signal}` : 'ALL RED TRANSITION'}
          </span>
        </div>
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-500 block text-[10px]">WEATHER CORRECTION</span>
          <span className={`font-bold ${weather === 'Rain' ? 'text-blue-400' : 'text-slate-300'}`}>
            {weather === 'Rain' ? '+10s Wet Offset' : 'Standard 15s'}
          </span>
        </div>
      </div>
    </div>
  );
};
