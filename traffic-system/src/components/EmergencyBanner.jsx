import React from 'react';
import { Siren, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const EmergencyBanner = ({ emergency, lanes }) => {
  if (!emergency) return null;

  // Identify active emergency lane
  const emergencyLane = ['north', 'east', 'south', 'west'].find(
    (l) => lanes?.[l]?.signal === 'GREEN' || (lanes?.[l]?.ambulanceBoxes && lanes[l].ambulanceBoxes.length > 0)
  );

  return (
    <div className="bg-rose-950/90 border border-rose-600 rounded-xl p-4 shadow-xl shadow-rose-950/30 mb-4 transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-900/80 rounded-lg border border-rose-700 text-rose-300 animate-pulse">
            <Siren className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-rose-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Priority Active
              </span>
              <h3 className="text-sm font-mono font-bold text-rose-100 uppercase tracking-wide">
                Emergency Vehicle Detected — Signal Preemption Engaged
              </h3>
            </div>
            <p className="text-xs text-rose-300 font-mono mt-0.5">
              Automated computer-vision override has granted green corridor right-of-way to the emergency vehicle.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center bg-rose-900/60 px-3.5 py-2 rounded-lg border border-rose-700/60 font-mono text-xs">
          <div>
            <span className="text-rose-400 block text-[10px]">CORRIDOR ROUTE</span>
            <span className="font-bold text-white uppercase text-sm">
              {emergencyLane ? `${emergencyLane} APPROACH` : 'IN TRANSITION'}
            </span>
          </div>
          <div className="h-6 w-px bg-rose-700"></div>
          <div>
            <span className="text-rose-400 block text-[10px]">HOLD TIMER</span>
            <span className="font-bold text-white text-sm">
              {emergencyLane ? `${lanes[emergencyLane]?.time || 99}s` : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
