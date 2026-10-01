import React from 'react';
import { CameraCard } from './CameraCard';

export const TrafficCameraGrid = ({ lanes, emergency }) => {
  const cameraList = [
    { id: 'north', name: 'NORTH APPROACH (CAM 01)', video: '/north.mp4' },
    { id: 'east',  name: 'EAST APPROACH (CAM 02)',  video: '/east.mp4' },
    { id: 'south', name: 'SOUTH APPROACH (CAM 03)', video: '/south.mp4' },
    { id: 'west',  name: 'WEST APPROACH (CAM 04)',  video: '/west.mp4' },
  ];

  return (
    <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          LIVE VIDEO MONITORING (2x2 INTERSECTION FEEDS)
        </h2>
        <span className="text-[11px] font-mono text-slate-500">
          REAL-TIME YOLO DETECTIONS ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameraList.map((cam) => {
          const laneData = lanes[cam.id] || {};
          const isEmergencyInThisLane = emergency && (laneData.ambulanceBoxes?.length > 0 || laneData.signal === 'GREEN');

          return (
            <CameraCard
              key={cam.id}
              laneId={cam.id}
              laneName={cam.name}
              videoSrc={cam.video}
              data={laneData}
              isEmergencyLane={isEmergencyInThisLane}
            />
          );
        })}
      </div>
    </div>
  );
};
