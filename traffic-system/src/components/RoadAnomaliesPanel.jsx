import React from 'react';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, MapPin } from 'lucide-react';

export const RoadAnomaliesPanel = ({ anomalies = [] }) => {
  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
          <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
          ROAD ANOMALY MONITORING & SAFETY ALERTS
        </h2>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
          anomalies.length > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-400'
        }`}>
          {anomalies.length} ACTIVE INCIDENT(S)
        </span>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[260px] pr-1">
        {anomalies.length === 0 ? (
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400/80 mx-auto mb-1.5" />
            <span className="text-xs font-mono text-slate-300 font-semibold block">
              NO ANOMALIES DETECTED
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Road corridors are clear of pedestrians down, altercations, or animals.
            </span>
          </div>
        ) : (
          anomalies.map((anom) => {
            const isCritical = anom.severity === 'CRITICAL';
            const isWarning = anom.severity === 'WARNING';

            const timeStr = new Date(anom.timestamp || Date.now()).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={anom.id}
                className={`p-3 rounded-lg border font-mono transition-all ${
                  isCritical
                    ? 'bg-rose-950/70 border-rose-600/90 shadow-sm shadow-rose-950/50'
                    : isWarning
                    ? 'bg-amber-950/60 border-amber-600/80'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isCritical ? 'bg-rose-600 text-white' :
                      isWarning ? 'bg-amber-500 text-slate-950' : 'bg-cyan-600 text-white'
                    }`}>
                      {anom.severity}
                    </span>
                    <span className="text-xs font-bold text-slate-100 uppercase">
                      {anom.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{timeStr}</span>
                </div>

                {/* Location & Confidence */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    APPROACH: <strong className="text-cyan-300 uppercase">{anom.lane}</strong>
                  </span>
                  {anom.confidence && (
                    <span>CONFIDENCE: <strong>{Math.round(anom.confidence * 100)}%</strong></span>
                  )}
                </div>

                {/* Explainability Why */}
                <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-1.5 font-sans">
                  <span className="font-bold font-mono text-amber-400 shrink-0">Why?</span>
                  <span>{anom.explanation}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
