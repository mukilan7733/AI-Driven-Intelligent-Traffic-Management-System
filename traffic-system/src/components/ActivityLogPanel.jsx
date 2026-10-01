import React, { useRef, useEffect } from 'react';
import { Terminal, ShieldAlert, Cpu, Radio, CheckCircle, AlertTriangle } from 'lucide-react';

export const ActivityLogPanel = ({ logs = [] }) => {
  const scrollRef = useRef(null);

  const getBadge = (type) => {
    switch (type) {
      case 'emergency':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
            EMERGENCY
          </span>
        );
      case 'signal':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            SIGNAL
          </span>
        );
      case 'system':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            SYSTEM
          </span>
        );
      case 'warning':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
            WARN
          </span>
        );
      case 'error':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-900">
            ERROR
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          SYSTEM ACTIVITY LOG & EVENT AUDIT
        </h2>
        <span className="text-[10px] font-mono text-slate-500">
          {logs.length} EVENTS RECORDED
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto max-h-[220px] bg-slate-950/80 rounded-lg border border-slate-800/80 p-2.5 space-y-2 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center py-6 text-xs">
            Awaiting system events from signaling engine...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2.5 pb-1.5 border-b border-slate-900 last:border-0 last:pb-0"
            >
              <span className="text-slate-500 text-[10px] shrink-0 pt-0.5">
                {log.timestamp}
              </span>
              <div className="shrink-0">{getBadge(log.type)}</div>
              <span className="text-slate-300 text-[11px] leading-relaxed break-all">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
