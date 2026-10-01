import React, { useState } from 'react';
import { Cpu, Clock, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { setSystemMode } from '../services/api';

export const ModeControlPanel = ({ currentMode, addLog }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleToggleMode = async (targetMode) => {
    if (targetMode === currentMode || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await setSystemMode(targetMode);
      addLog(`Manual command issued: Set mode to ${targetMode}`, 'system');
    } catch (err) {
      console.error('Failed to change mode:', err);
      setErrorMsg('Failed to update mode on server');
      addLog(`Error changing mode to ${targetMode}: Server unresponsive`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          OPERATIONAL CONTROL & MODE SELECTION
        </h2>
        {loading && (
          <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            UPDATING ENGINE...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* AI Dynamic Mode Button */}
        <button
          onClick={() => handleToggleMode('AI')}
          disabled={loading}
          className={`p-3 rounded-lg border text-left transition-all font-mono ${
            currentMode === 'AI'
              ? 'bg-cyan-950/80 border-cyan-500 shadow-sm shadow-cyan-950/40 text-slate-100'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Cpu className={`w-4 h-4 ${currentMode === 'AI' ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="text-xs font-bold uppercase tracking-wider">AI Dynamic Mode</span>
            </div>
            {currentMode === 'AI' ? (
              <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                ACTIVE
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Real-time YOLO computer vision adjusts phase timings dynamically according to vehicle density and queues.
          </p>
        </button>

        {/* Static Fixed Mode Button */}
        <button
          onClick={() => handleToggleMode('STATIC')}
          disabled={loading}
          className={`p-3 rounded-lg border text-left transition-all font-mono ${
            currentMode === 'STATIC'
              ? 'bg-amber-950/80 border-amber-500 shadow-sm shadow-amber-950/40 text-slate-100'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${currentMode === 'STATIC' ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="text-xs font-bold uppercase tracking-wider">Static Timed Mode</span>
            </div>
            {currentMode === 'STATIC' ? (
              <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded">
                ACTIVE
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Fixed 30-second round-robin cycle with 3-second yellow light intervals. Disables automated AI prioritization.
          </p>
        </button>
      </div>

      {errorMsg && (
        <div className="mt-2 text-xs font-mono text-rose-400 bg-rose-950/60 p-2 rounded border border-rose-900">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
