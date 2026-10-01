import React, { useState } from 'react';
import axios from 'axios';
import { PlayCircle, RotateCcw, AlertTriangle, ShieldAlert, Dog, Users, Car, Siren, Activity } from 'lucide-react';

export const ScenarioSimulator = ({ addLog }) => {
  const [activeScenario, setActiveScenario] = useState(0);
  const [loading, setLoading] = useState(false);

  const scenarios = [
    { id: 1, label: 'Scenario 1: Normal Traffic', desc: '16 vehicles flowing smoothly, no road anomalies.', icon: Car, color: 'text-emerald-400' },
    { id: 2, label: 'Scenario 2: Heavy Traffic', desc: '37 vehicles, triggers adaptive dynamic green extension.', icon: Activity, color: 'text-cyan-400' },
    { id: 3, label: 'Scenario 3: Ambulance Preemption', desc: 'Emergency ambulance detected, triggers green corridor override.', icon: Siren, color: 'text-rose-400' },
    { id: 4, label: 'Scenario 4: Animal on Road', desc: 'Dog detected inside active road corridor. Caution warning.', icon: Dog, color: 'text-amber-400' },
    { id: 5, label: 'Scenario 5: Person Standing', desc: 'Normal pedestrian on sidewalk. NOT person-down.', icon: Users, color: 'text-indigo-400' },
    { id: 6, label: 'Scenario 6: Person Down', desc: 'Individual lying stationary in roadway. Critical safety hold engaged.', icon: ShieldAlert, color: 'text-rose-400' },
    { id: 7, label: 'Scenario 7: Two People Talking', desc: 'Normal pedestrian conversation. NOT an altercation.', icon: Users, color: 'text-indigo-400' },
    { id: 8, label: 'Scenario 8: Physical Altercation', desc: 'Multiple persons in close proximity with rapid altercation dynamics.', icon: AlertTriangle, color: 'text-amber-400' },
  ];

  const handleTriggerScenario = async (id) => {
    setLoading(true);
    try {
      await axios.post(`http://localhost:8000/scenario/${id}`);
      setActiveScenario(id);
      if (id === 0) {
        addLog('Reset simulation: Resumed live camera AI computer vision inference.', 'system');
      } else {
        const sc = scenarios.find(s => s.id === id);
        addLog(`Triggered Test ${sc?.label || `Scenario ${id}`}`, 'info');
      }
    } catch (err) {
      console.error('Failed to trigger test scenario:', err);
      addLog(`Failed to communicate with CV simulator on port 8000`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-bold text-slate-300 tracking-wider uppercase">
            OPERATIONAL SCENARIO TEST HARNESS (8 MASTER TEST CASES)
          </h2>
        </div>
        {activeScenario !== 0 && (
          <button
            onClick={() => handleTriggerScenario(0)}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-all border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET TO LIVE CV</span>
          </button>
        )}
      </div>

      <p className="text-xs font-sans text-slate-400 leading-relaxed">
        Test each specific operational scenario specified in the prompt. Evaluates temporal reasoning, false positive prevention, and automated safety responses.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isActive = activeScenario === sc.id;

          return (
            <button
              key={sc.id}
              onClick={() => handleTriggerScenario(sc.id)}
              disabled={loading}
              className={`p-2.5 rounded-lg border text-left font-mono transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-cyan-950/80 border-cyan-500 shadow-md shadow-cyan-950/40 text-slate-100'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${sc.color}`} />
                    <span className="text-[11px] font-bold uppercase">{sc.label.split(':')[1] || sc.label}</span>
                  </div>
                  {isActive && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500 text-slate-950 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-tight line-clamp-2">
                  {sc.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
