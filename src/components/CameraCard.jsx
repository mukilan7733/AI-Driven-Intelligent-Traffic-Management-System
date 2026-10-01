import React, { useRef, useEffect } from 'react';
import { Camera, ShieldAlert, Car, Users, Dog, AlertOctagon } from 'lucide-react';

export const CameraCard = ({ laneId, laneName, videoSrc, data, isEmergencyLane }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((e) => console.log(`Auto-play prevented for ${laneId}:`, e));
    }
  }, [laneId]);

  const {
    vehicles = 0,
    pedestrians = 0,
    animals = 0,
    signal = 'RED',
    time = 0,
    boxes = [],
    ambulanceBoxes = [],
    anomalies = []
  } = data || {};

  const isGreen = signal === 'GREEN';
  const isYellow = signal === 'YELLOW';
  const hasAnomaly = anomalies.length > 0;
  const hasCritical = anomalies.some(a => a.severity === 'CRITICAL');

  const getBoxStyle = (box) => {
    if (box.category === 'emergency' || box.class === 'Ambulance') {
      return {
        border: 'border-2 border-rose-500 bg-rose-500/20',
        badge: 'bg-rose-950 text-rose-200 border-rose-600',
        label: `🚑 AMBULANCE ${Math.round((box.confidence || 0) * 100)}%`
      };
    }
    if (box.category === 'animal' || ['Dog', 'Cat', 'Horse', 'Cow'].includes(box.class)) {
      return {
        border: 'border-2 border-amber-400 bg-amber-400/20',
        badge: 'bg-amber-950 text-amber-200 border-amber-600',
        label: `🐕 ${box.class.toUpperCase()} ${Math.round((box.confidence || 0) * 100)}%`
      };
    }
    if (box.category === 'pedestrian' || box.class === 'Person') {
      return {
        border: 'border border-indigo-400 bg-indigo-500/15',
        badge: 'bg-indigo-950 text-indigo-200 border-indigo-600',
        label: `👤 PERSON ${Math.round((box.confidence || 0) * 100)}%`
      };
    }
    return {
      border: 'border border-cyan-400/90 bg-cyan-500/10',
      badge: 'bg-cyan-950/90 text-cyan-300 border-cyan-700/80',
      label: `${box.class} ${Math.round((box.confidence || 0) * 100)}%`
    };
  };

  return (
    <div className={`relative bg-slate-900 rounded-lg border overflow-hidden transition-all duration-200 flex flex-col ${
      hasCritical ? 'border-rose-600 shadow-lg shadow-rose-950/50' :
      hasAnomaly ? 'border-amber-500/80 shadow-md shadow-amber-950/40' :
      isEmergencyLane ? 'border-rose-500/80' :
      isGreen ? 'border-emerald-500/40' :
      isYellow ? 'border-amber-500/40' : 'border-slate-800'
    }`}>
      {/* Top Info Bar */}
      <div className="bg-slate-950/90 px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-200 tracking-wider uppercase text-[11px]">
            {laneName}
          </span>
          {hasAnomaly && (
            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-950 text-amber-300 border border-amber-600 flex items-center gap-1">
              <AlertOctagon className="w-3 h-3 text-amber-400" />
              ANOMALY
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          {/* Vehicles Count */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <Car className="w-3 h-3 text-cyan-400" />
            <span className="font-bold text-cyan-300">{vehicles}</span>
          </div>

          {/* Pedestrians Count */}
          {pedestrians > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              <Users className="w-3 h-3 text-indigo-400" />
              <span className="font-bold text-indigo-300">{pedestrians}</span>
            </div>
          )}

          {/* Animals Count */}
          {animals > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
              <Dog className="w-3 h-3 text-amber-400" />
              <span className="font-bold text-amber-300">{animals}</span>
            </div>
          )}

          {/* Signal & Time Status */}
          <div className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 text-[11px] ${
            isGreen ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' :
            isYellow ? 'bg-amber-950 text-amber-300 border border-amber-700/60' :
            'bg-slate-900 text-slate-400 border border-slate-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isGreen ? 'bg-emerald-400 animate-pulse' :
              isYellow ? 'bg-amber-400 animate-ping' : 'bg-rose-500'
            }`} />
            <span>{signal}</span>
            {time > 0 && <span className="text-white">({time}s)</span>}
          </div>
        </div>
      </div>

      {/* Video Stream + Bounding Box Container */}
      <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Bounding Boxes Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Normal Entity Bounding Boxes */}
          {boxes.map((box, index) => {
            const width = Math.max(0, box.x2 - box.x1);
            const height = Math.max(0, box.y2 - box.y1);
            const style = getBoxStyle(box);

            return (
              <div
                key={`box-${index}`}
                style={{
                  left: `${box.x1}%`,
                  top: `${box.y1}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
                className={`absolute rounded-sm ${style.border}`}
              >
                <span className={`absolute -top-4 left-0 text-[9px] font-mono px-1 py-0.2 rounded border whitespace-nowrap shadow-sm ${style.badge}`}>
                  {style.label}
                </span>
              </div>
            );
          })}

          {/* Ambulance Bounding Boxes */}
          {ambulanceBoxes.map((box, index) => {
            const width = Math.max(0, box.x2 - box.x1);
            const height = Math.max(0, box.y2 - box.y1);
            return (
              <div
                key={`amb-box-${index}`}
                style={{
                  left: `${box.x1}%`,
                  top: `${box.y1}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
                className="absolute border-2 border-rose-500 bg-rose-500/20 rounded-sm animate-pulse"
              >
                <span className="absolute -top-5 left-0 bg-rose-950 text-rose-200 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-rose-600 flex items-center gap-1 whitespace-nowrap shadow-lg">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  AMBULANCE {Math.round((box.confidence || 0) * 100)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Telemetry Footer */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">REC ●</span>
            <span>LIVE FEED</span>
          </div>
          <div>
            <span>CV MODEL: YOLOv8n Multi-Class</span>
          </div>
        </div>
      </div>
    </div>
  );
};
