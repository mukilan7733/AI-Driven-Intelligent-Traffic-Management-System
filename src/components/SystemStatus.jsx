import React, { useState, useEffect } from 'react';
import { Server, Cpu, Radio, Shield, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { checkPythonHealth } from '../services/api';

export const SystemStatus = ({ connectionStatus, lastUpdated, mode, emergency }) => {
  const [pythonStatus, setPythonStatus] = useState('UNKNOWN');

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      const data = await checkPythonHealth();
      if (isMounted) {
        setPythonStatus(data ? 'ONLINE' : 'OFFLINE');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const timeDiff = lastUpdated ? Math.floor((Date.now() - lastUpdated) / 1000) : null;

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          INFRASTRUCTURE & SUBSYSTEM HEALTH
        </h2>
        <span className="text-[10px] font-mono text-slate-500">
          HEARTBEAT MONITOR
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        {/* Node.js Signaling Engine */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px]">SIGNAL SERVER</span>
            <Server className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-center gap-1.5">
            {connectionStatus === 'CONNECTED' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className={`font-bold ${
              connectionStatus === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {connectionStatus === 'CONNECTED' ? 'ONLINE (PORT 5000)' : 'UNAVAILABLE'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {timeDiff !== null ? `Tick sync: ${timeDiff}s ago` : 'Waiting for sync...'}
          </span>
        </div>

        {/* Python AI Engine */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px]">AI / CV ENGINE</span>
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-center gap-1.5">
            {pythonStatus === 'ONLINE' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className={`font-bold ${
              pythonStatus === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {pythonStatus === 'ONLINE' ? 'ONLINE (PORT 8000)' : 'STANDBY / OFFLINE'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            YOLOv8 + Roboflow API
          </span>
        </div>

        {/* Socket.IO Link */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px]">WEBSOCKET LINK</span>
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
            }`} />
            <span className={`font-bold ${
              connectionStatus === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {connectionStatus}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Duplex State Telemetry
          </span>
        </div>

        {/* Preemption Engine */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px]">PREEMPTION ENGINE</span>
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              emergency ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
            }`} />
            <span className={`font-bold ${emergency ? 'text-rose-400' : 'text-emerald-400'}`}>
              {emergency ? 'PRIORITY ENGAGED' : 'ARMED / MONITORING'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Ambulance 2-Frame Conf.
          </span>
        </div>
      </div>
    </div>
  );
};
