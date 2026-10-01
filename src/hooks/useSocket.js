import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const INITIAL_STATE = {
  mode: 'AI',
  weather: 'Clear',
  emergency: false,
  safetyHold: false,
  anomalies: [],
  roadSituation: {
    status: 'NORMAL_TRAFFIC',
    summary: 'System initialized. Traffic moving normally.',
    severity: 'normal'
  },
  lanes: {
    north: { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, signal: 'RED', time: 0, boxes: [], ambulanceBoxes: [], anomalies: [] },
    east:  { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, signal: 'RED', time: 0, boxes: [], ambulanceBoxes: [], anomalies: [] },
    south: { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, signal: 'RED', time: 0, boxes: [], ambulanceBoxes: [], anomalies: [] },
    west:  { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, signal: 'RED', time: 0, boxes: [], ambulanceBoxes: [], anomalies: [] }
  }
};

export const useSocket = () => {
  const [systemState, setSystemState] = useState(INITIAL_STATE);
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const prevStateRef = useRef(INITIAL_STATE);
  const socketRef = useRef(null);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, timestamp, message, type },
      ...prev.slice(0, 99)
    ]);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('CONNECTED');
      addLog('Socket connected to traffic control engine server', 'system');
    });

    socket.on('disconnect', (reason) => {
      setConnectionStatus('DISCONNECTED');
      addLog(`Socket disconnected: ${reason}`, 'warning');
    });

    socket.on('connect_error', (error) => {
      setConnectionStatus('RECONNECTING');
      addLog(`Connection error to server: ${error.message}`, 'error');
    });

    socket.on('state_update', (data) => {
      if (!data) return;

      const newState = {
        mode: data.mode || 'AI',
        weather: data.weather || 'Clear',
        emergency: !!data.emergency,
        safetyHold: !!data.safetyHold,
        anomalies: data.anomalies || [],
        roadSituation: data.roadSituation || INITIAL_STATE.roadSituation,
        lanes: {
          north: data.north || INITIAL_STATE.lanes.north,
          east: data.east || INITIAL_STATE.lanes.east,
          south: data.south || INITIAL_STATE.lanes.south,
          west: data.west || INITIAL_STATE.lanes.west,
        }
      };

      setSystemState(newState);
      setLastUpdated(Date.now());

      const prev = prevStateRef.current;

      // Detect Emergency transition
      if (newState.emergency && !prev.emergency) {
        addLog('🚨 EMERGENCY PRIORITY ACTIVATED — Emergency vehicle detected', 'emergency');
      } else if (!newState.emergency && prev.emergency) {
        addLog('✅ Emergency priority cleared — Resuming normal traffic cycle', 'system');
      }

      // Detect Safety Hold transition
      if (newState.safetyHold && !prev.safetyHold) {
        addLog('⚠️ AUTOMATED SAFETY HOLD ENGAGED — Critical pedestrian incident in road corridor', 'emergency');
      } else if (!newState.safetyHold && prev.safetyHold) {
        addLog('✅ Safety hold cleared — Traffic flow safe to resume', 'system');
      }

      // Detect new anomalies
      const prevAnomIds = new Set((prev.anomalies || []).map(a => a.id));
      (newState.anomalies || []).forEach(anom => {
        if (!prevAnomIds.has(anom.id)) {
          addLog(`Road Alert: ${anom.title} on ${anom.lane.toUpperCase()} approach`, anom.severity === 'CRITICAL' ? 'emergency' : 'warning');
        }
      });

      // Detect Mode switch
      if (prev.mode !== newState.mode) {
        addLog(`System operating mode changed to: ${newState.mode}`, 'system');
      }

      // Detect active green signal transitions
      const LANES = ['north', 'east', 'south', 'west'];
      LANES.forEach((lane) => {
        const prevSignal = prev.lanes[lane]?.signal;
        const newSignal = newState.lanes[lane]?.signal;

        if (prevSignal !== newSignal) {
          if (newSignal === 'GREEN') {
            addLog(`Signal changed to GREEN for ${lane.toUpperCase()} (${newState.lanes[lane].time}s timer)`, 'signal');
          } else if (newSignal === 'YELLOW') {
            addLog(`Signal transitioning to YELLOW for ${lane.toUpperCase()}`, 'signal');
          }
        }
      });

      prevStateRef.current = newState;
    });

    return () => {
      socket.disconnect();
    };
  }, [addLog]);

  return {
    systemState,
    connectionStatus,
    lastUpdated,
    logs,
    addLog
  };
};
