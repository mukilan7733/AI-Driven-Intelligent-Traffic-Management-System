import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Sun, CloudRain, Cpu, Radio } from 'lucide-react';

export const Header = ({ mode, weather, emergency, connectionStatus }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md sticky top-0 z-50">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded border border-slate-700 text-cyan-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 tracking-wide uppercase">
              AI Traffic Intelligence
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              v1.0.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span>TRAFFIC OPERATIONS CENTER</span>
            <span>•</span>
            <span className="text-cyan-400 font-semibold">{timeStr || '--:--:--'}</span>
          </p>
        </div>
      </div>

      {/* Operational Indicators */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Connection Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono">
          <Radio className={`w-3.5 h-3.5 ${
            connectionStatus === 'CONNECTED' ? 'text-emerald-400 animate-pulse' :
            connectionStatus === 'RECONNECTING' ? 'text-amber-400 animate-spin' : 'text-rose-400'
          }`} />
          <span className="text-slate-400">SERVER:</span>
          <span className={`font-semibold ${
            connectionStatus === 'CONNECTED' ? 'text-emerald-400' :
            connectionStatus === 'RECONNECTING' ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {connectionStatus}
          </span>
        </div>

        {/* Operating Mode */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">MODE:</span>
          <span className={`font-semibold ${mode === 'AI' ? 'text-cyan-400' : 'text-amber-400'}`}>
            {mode === 'AI' ? 'AI DYNAMIC' : 'STATIC FIXED'}
          </span>
        </div>

        {/* Weather Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono">
          {weather === 'Rain' ? (
            <CloudRain className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="text-slate-400">WEATHER:</span>
          <span className={`font-semibold ${weather === 'Rain' ? 'text-blue-400' : 'text-amber-300'}`}>
            {weather?.toUpperCase() || 'CLEAR'}
          </span>
        </div>

        {/* Emergency Alert Indicator */}
        {emergency ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs font-mono font-bold animate-pulse">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>EMERGENCY OVERRIDE</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>NORMAL TRAFFIC</span>
          </div>
        )}
      </div>
    </header>
  );
};
