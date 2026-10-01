import React from 'react';
import { Eye, ShieldAlert, AlertTriangle, CheckCircle2, Siren, Users, Dog } from 'lucide-react';

export const RoadSituationPanel = ({ roadSituation, safetyHold }) => {
  const { status = 'NORMAL_TRAFFIC', summary = 'Traffic is moving normally.', severity = 'normal', anomaly } = roadSituation || {};

  const getStatusBadge = () => {
    switch (status) {
      case 'PERSON_DOWN':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-rose-950 text-rose-200 border border-rose-600 text-xs font-mono font-bold animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>CRITICAL ROAD INCIDENT: PERSON DOWN</span>
          </div>
        );
      case 'EMERGENCY_VEHICLE':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-rose-950 text-rose-200 border border-rose-600 text-xs font-mono font-bold animate-pulse">
            <Siren className="w-4 h-4 text-rose-400" />
            <span>EMERGENCY PREEMPTION ACTIVE</span>
          </div>
        );
      case 'ALTERCATION':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber-950 text-amber-200 border border-amber-600 text-xs font-mono font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>UNUSUAL ACTIVITY: POSSIBLE ALTERCATION</span>
          </div>
        );
      case 'ANIMAL_ON_ROAD':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-amber-950 text-amber-200 border border-amber-600 text-xs font-mono font-bold">
            <Dog className="w-4 h-4 text-amber-400" />
            <span>CAUTION: ANIMAL ON ROADWAY</span>
          </div>
        );
      case 'HEAVY_TRAFFIC':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-cyan-950 text-cyan-200 border border-cyan-600 text-xs font-mono font-bold">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>HEAVY TRAFFIC VOLUME</span>
          </div>
        );
      case 'PEDESTRIAN_ACTIVITY':
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-900 text-slate-200 border border-slate-700 text-xs font-mono font-bold">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>PEDESTRIAN ACTIVITY ACTIVE</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-emerald-950/80 text-emerald-200 border border-emerald-700 text-xs font-mono font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>NORMAL TRAFFIC FLOW</span>
          </div>
        );
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      status === 'PERSON_DOWN' || safetyHold ? 'bg-rose-950/50 border-rose-600/80' :
      status === 'ALTERCATION' || status === 'ANIMAL_ON_ROAD' ? 'bg-amber-950/40 border-amber-600/70' :
      'bg-slate-900/60 border-slate-800'
    }`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold text-slate-300 tracking-wider uppercase">
            WHAT'S HAPPENING? — ROAD SITUATION SUMMARY
          </h2>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-1.5 mt-2">
        <p className="text-sm md:text-base font-sans font-medium text-slate-100 leading-snug">
          {summary}
        </p>

        {anomaly?.explanation && (
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono flex items-start gap-2">
            <span className="text-amber-400 font-bold shrink-0">Why?</span>
            <span className="text-slate-300">{anomaly.explanation}</span>
          </div>
        )}

        {safetyHold && (
          <div className="bg-rose-950/80 p-2 rounded border border-rose-700 text-xs font-mono text-rose-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>AUTOMATED TRAFFIC SAFETY HOLD ACTIVE — Corridors held to protect pedestrian safety.</span>
          </div>
        )}
      </div>
    </div>
  );
};
