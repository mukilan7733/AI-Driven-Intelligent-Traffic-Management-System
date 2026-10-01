const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SQLite Database Setup
// ─────────────────────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'traffic_data.db');
const db = new DatabaseSync(DB_PATH);
console.log(`📦 SQLite database: ${DB_PATH}`);

// Enable WAL mode for better concurrent write performance
db.exec('PRAGMA journal_mode = WAL;');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS detections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          TEXT    NOT NULL,
    lane        TEXT    NOT NULL,
    vehicles    INTEGER NOT NULL DEFAULT 0,
    car         INTEGER NOT NULL DEFAULT 0,
    truck       INTEGER NOT NULL DEFAULT 0,
    bus         INTEGER NOT NULL DEFAULT 0,
    motorcycle  INTEGER NOT NULL DEFAULT 0,
    bicycle     INTEGER NOT NULL DEFAULT 0,
    pedestrians INTEGER NOT NULL DEFAULT 0,
    animals     INTEGER NOT NULL DEFAULT 0,
    signal      TEXT    NOT NULL DEFAULT 'RED',
    mode        TEXT    NOT NULL DEFAULT 'AI'
  );

  CREATE TABLE IF NOT EXISTS anomalies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          TEXT    NOT NULL,
    event_id    TEXT    NOT NULL,
    type        TEXT    NOT NULL,
    severity    TEXT    NOT NULL,
    lane        TEXT    NOT NULL,
    title       TEXT    NOT NULL,
    explanation TEXT    NOT NULL,
    confidence  REAL    NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS signal_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         TEXT    NOT NULL,
    lane       TEXT    NOT NULL,
    signal     TEXT    NOT NULL,
    phase      TEXT    NOT NULL,
    timer      INTEGER NOT NULL DEFAULT 0,
    mode       TEXT    NOT NULL DEFAULT 'AI'
  );

  CREATE TABLE IF NOT EXISTS road_situations (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    ts       TEXT    NOT NULL,
    status   TEXT    NOT NULL,
    summary  TEXT    NOT NULL,
    severity TEXT    NOT NULL
  );
`);

// Prepared statements
const insertDetection = db.prepare(`
  INSERT INTO detections (ts, lane, vehicles, car, truck, bus, motorcycle, bicycle, pedestrians, animals, signal, mode)
  VALUES (@ts, @lane, @vehicles, @car, @truck, @bus, @motorcycle, @bicycle, @pedestrians, @animals, @signal, @mode)
`);

const insertAnomaly = db.prepare(`
  INSERT INTO anomalies (ts, event_id, type, severity, lane, title, explanation, confidence)
  VALUES (@ts, @event_id, @type, @severity, @lane, @title, @explanation, @confidence)
`);

const insertSignalHistory = db.prepare(`
  INSERT INTO signal_history (ts, lane, signal, phase, timer, mode)
  VALUES (@ts, @lane, @signal, @phase, @timer, @mode)
`);

const insertRoadSituation = db.prepare(`
  INSERT INTO road_situations (ts, status, summary, severity)
  VALUES (@ts, @status, @summary, @severity)
`);

// Track previously persisted anomaly IDs and signal states to avoid duplicate writes
const persistedAnomalyIds = new Set();
let lastSignalState = { north: null, east: null, south: null, west: null };
let lastRoadSituationStatus = null;

// Batch insert detections using a transaction
function insertDetectionsBatch(rows) {
  db.exec('BEGIN');
  try {
    for (const row of rows) insertDetection.run(row);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistence Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
function persistTick() {
  const ts = new Date().toISOString();
  const mode = systemState.mode;

  // 1. Persist per-lane detection snapshot (every second)
  const rows = LANES.map(l => ({
    ts,
    lane: l,
    vehicles:    systemState.lanes[l].vehicles,
    car:         systemState.lanes[l].breakdown?.car        || 0,
    truck:       systemState.lanes[l].breakdown?.truck      || 0,
    bus:         systemState.lanes[l].breakdown?.bus        || 0,
    motorcycle:  systemState.lanes[l].breakdown?.motorcycle || 0,
    bicycle:     systemState.lanes[l].breakdown?.bicycle    || 0,
    pedestrians: systemState.lanes[l].pedestrians,
    animals:     systemState.lanes[l].animals,
    signal:      systemState.lanes[l].signal,
    mode
  }));

  try {
    insertDetectionsBatch(rows);
  } catch (e) {
    console.error('DB detection insert error:', e.message);
  }

  // 2. Persist new anomalies (only insert each unique event_id once)
  const anomalies = systemState.anomalies || [];
  for (const a of anomalies) {
    if (!persistedAnomalyIds.has(a.id)) {
      try {
        insertAnomaly.run({
          ts,
          event_id:    a.id,
          type:        a.type,
          severity:    a.severity,
          lane:        a.lane,
          title:       a.title,
          explanation: a.explanation,
          confidence:  a.confidence || 0
        });
        persistedAnomalyIds.add(a.id);
      } catch (e) {
        console.error('DB anomaly insert error:', e.message);
      }
    }
  }

  // 3. Persist signal changes (only when signal changes for a lane)
  for (const l of LANES) {
    const sig = systemState.lanes[l].signal;
    if (sig !== lastSignalState[l]) {
      try {
        insertSignalHistory.run({
          ts,
          lane:   l,
          signal: sig,
          phase:  engine.phase,
          timer:  engine.timer,
          mode
        });
      } catch (e) {
        console.error('DB signal history insert error:', e.message);
      }
      lastSignalState[l] = sig;
    }
  }

  // 4. Persist road situation changes (only when status changes)
  const rs = systemState.roadSituation;
  if (rs && rs.status !== lastRoadSituationStatus) {
    try {
      insertRoadSituation.run({
        ts,
        status:   rs.status,
        summary:  rs.summary,
        severity: rs.severity
      });
    } catch (e) {
      console.error('DB road situation insert error:', e.message);
    }
    lastRoadSituationStatus = rs.status;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Traffic Engine State
// ─────────────────────────────────────────────────────────────────────────────
const LANES = ['north', 'east', 'south', 'west'];

let systemState = {
  mode: 'AI',
  weather: 'Clear',
  emergency: false,
  safetyHold: false,
  anomalies: [],
  roadSituation: {
    status: 'NORMAL_TRAFFIC',
    summary: 'Traffic is normal. Moving smoothly across all approaches.',
    severity: 'normal'
  },
  lanes: {
    north: { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, signal: 'RED', time: 0, boxes: [], ambulanceBoxes: [], anomalies: [] },
    east:  { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, signal: 'RED', time: 0, boxes: [], ambulanceBoxes: [], anomalies: [] },
    south: { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, signal: 'RED', time: 0, boxes: [], ambulanceBoxes: [], anomalies: [] },
    west:  { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, signal: 'RED', time: 0, boxes: [], ambulanceBoxes: [], anomalies: [] }
  }
};

let engine = {
  activeLane: 'north',
  phase: 'GREEN',
  timer: 30,
  ambulanceHistory: { north: 0, east: 0, south: 0, west: 0 },
  ambulanceConfirmation: { north: 0, east: 0, south: 0, west: 0 },
  laneIdleTimer: { north: 0, east: 0, south: 0, west: 0 },
  ambulanceQueue: [],
  ambulanceActiveLane: null,
  ambulanceCapTimer: 0,
  pendingAmbulanceLane: null,
  prevVehicles: { north: 0, east: 0, south: 0, west: 0 },
  lastPingTime: Date.now()
};

let detections = {
  north: { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, ambulance: false, confidence: 0.0, boxes: [], ambulanceBoxes: [], anomalies: [] },
  east:  { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, ambulance: false, confidence: 0.0, boxes: [], ambulanceBoxes: [], anomalies: [] },
  south: { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, ambulance: false, confidence: 0.0, boxes: [], ambulanceBoxes: [], anomalies: [] },
  west:  { vehicles: 0, breakdown: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 }, pedestrians: 0, animals: 0, ambulance: false, confidence: 0.0, boxes: [], ambulanceBoxes: [], anomalies: [] },
  weather: 'Clear',
  anomalies: [],
  roadSituation: {
    status: 'NORMAL_TRAFFIC',
    summary: 'Traffic is normal. Moving smoothly across all approaches.',
    severity: 'normal'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Loop (1-second tick)
// ─────────────────────────────────────────────────────────────────────────────
setInterval(() => {
  systemState.weather = detections.weather || 'Clear';

  if (systemState.mode === 'STATIC') {
    handleStaticMode();
  } else {
    handleAiMode();
  }

  updateExternalState();

  // Persist data to SQLite
  persistTick();

  io.emit('state_update', {
    north: systemState.lanes.north,
    east: systemState.lanes.east,
    south: systemState.lanes.south,
    west: systemState.lanes.west,
    weather: systemState.weather,
    mode: systemState.mode,
    emergency: systemState.emergency,
    safetyHold: systemState.safetyHold,
    anomalies: systemState.anomalies,
    roadSituation: systemState.roadSituation
  });
}, 1000);

// ─────────────────────────────────────────────────────────────────────────────
// Traffic Logic Functions
// ─────────────────────────────────────────────────────────────────────────────
function handleStaticMode() {
  systemState.safetyHold = false;
  if (engine.phase === 'ALL_RED') {
    engine.phase = 'GREEN';
    engine.timer = 30;
    engine.activeLane = 'north';
    return;
  }

  engine.timer--;

  if (engine.phase === 'GREEN' && engine.timer <= 3 && engine.timer > 0) {
    engine.phase = 'YELLOW';
  }

  if (engine.timer <= 0) {
    engine.activeLane = getNextLane(engine.activeLane);
    engine.phase = 'GREEN';
    engine.timer = 30;
  }
}

function handleAiMode() {
  // SENSOR FAILURE CHECK
  if (Date.now() - engine.lastPingTime > 10000) {
     console.log("Sensor failure detected (10s no ping). Switching to STATIC mode.");
     systemState.mode = 'STATIC';
     return handleStaticMode();
  }

  // ─── SAFETY PREEMPTION FOR CRITICAL ANOMALIES (e.g. Person Down) ───
  let criticalInActiveLane = (detections[engine.activeLane]?.anomalies || []).some(a => a.severity === 'CRITICAL');
  if (criticalInActiveLane) {
    systemState.safetyHold = true;
    if (engine.phase === 'GREEN') {
      engine.phase = 'YELLOW';
      engine.timer = 3;
      console.log(`🚨 Safety Preemption: Critical incident in ${engine.activeLane}. Switching to YELLOW.`);
      return;
    } else if (engine.phase === 'YELLOW') {
      engine.timer--;
      if (engine.timer <= 0) {
        engine.phase = 'ALL_RED';
        engine.timer = 99;
        console.log(`🚨 Safety Preemption: ALL_RED hold active for pedestrian incident in ${engine.activeLane}.`);
      }
      return;
    } else if (engine.phase === 'ALL_RED') {
      engine.timer = 99;
      return;
    }
  } else {
    if (systemState.safetyHold) {
      console.log("✅ Critical safety incident cleared. Resuming normal AI traffic cycle.");
      systemState.safetyHold = false;
      if (engine.phase === 'ALL_RED') {
        engine.phase = 'GREEN';
        engine.timer = 15;
      }
    }
  }

  // UPDATE IDLE TIMERS
  for (let l of LANES) {
    if (engine.phase === 'GREEN' && engine.activeLane === l) {
      engine.laneIdleTimer[l] = 0;
    } else if (detections[l].vehicles > 0) {
      engine.laneIdleTimer[l]++;
    } else {
      engine.laneIdleTimer[l] = 0;
    }
  }

  // AI STEP 1: AMBULANCE PRIORITY (With 2-frame confirmation)
  let activeAmbulances = [];
  for (let l of LANES) {
    if (detections[l].ambulance) {
      engine.ambulanceConfirmation[l]++;
      if (engine.ambulanceConfirmation[l] >= 2) {
        activeAmbulances.push({ lane: l, conf: detections[l].confidence });
      }
      engine.ambulanceHistory[l] = 0;
    } else {
      engine.ambulanceHistory[l]++;
      engine.ambulanceConfirmation[l] = 0;
    }
  }

  // ─── HANDLE PENDING AMBULANCE (waiting for yellow to finish) ───
  if (engine.pendingAmbulanceLane) {
    engine.timer--;
    if (engine.timer <= 0) {
      engine.activeLane = engine.pendingAmbulanceLane;
      engine.ambulanceActiveLane = engine.pendingAmbulanceLane;
      engine.pendingAmbulanceLane = null;
      systemState.emergency = true;
      engine.phase = 'GREEN';
      engine.timer = 99;
      engine.ambulanceCapTimer = 0;
      console.log(`🚑 Ambulance GREEN activated for ${engine.activeLane}`);
    }
    return;
  }

  // ─── CHECK IF CURRENT EMERGENCY LANE LOST AMBULANCE ───
  if (systemState.emergency) {
    engine.ambulanceCapTimer++;
    if (engine.ambulanceHistory[engine.ambulanceActiveLane] >= 3 || engine.ambulanceCapTimer >= 60) {
      systemState.emergency = false;
      engine.activeLane = engine.ambulanceActiveLane;
      engine.ambulanceActiveLane = null;
      engine.ambulanceCapTimer = 0;
      engine.phase = 'YELLOW';
      engine.timer = 3;
      console.log(`🚑 Emergency ended. Yellow transition from ${engine.activeLane}.`);
      return;
    } else {
      engine.phase = 'GREEN';
      engine.activeLane = engine.ambulanceActiveLane;
      engine.timer = 99;
      return;
    }
  }

  // ─── NEW AMBULANCE DETECTED → trigger YELLOW transition first ───
  if (activeAmbulances.length > 0 && !systemState.emergency) {
    activeAmbulances.sort((a, b) => b.conf - a.conf);
    let targetAmbulance = activeAmbulances[0].lane;

    if (targetAmbulance === engine.activeLane && engine.phase === 'GREEN') {
      systemState.emergency = true;
      engine.ambulanceActiveLane = targetAmbulance;
      engine.phase = 'GREEN';
      engine.timer = 99;
      engine.ambulanceCapTimer = 0;
      console.log(`🚑 Ambulance detected in current GREEN lane: ${targetAmbulance}`);
      return;
    }

    engine.pendingAmbulanceLane = targetAmbulance;
    engine.phase = 'YELLOW';
    engine.timer = 3;
    console.log(`🚑 Ambulance detected in ${targetAmbulance}. Current lane ${engine.activeLane} → YELLOW (3s)`);
    return;
  }

  // ─── NORMAL AI MODE TICK ───
  engine.timer--;

  if (engine.phase === 'GREEN') {
     let currentDiff = detections[engine.activeLane].vehicles - engine.prevVehicles[engine.activeLane];
     if (currentDiff >= 5 && engine.timer < 10) {
        engine.timer += 5;
        console.log(`Traffic Spike Detected in ${engine.activeLane}, adding 5 secs.`);
     }
  }

  if (engine.timer <= 0) {
    if (engine.phase === 'GREEN') {
      engine.phase = 'YELLOW';
      engine.timer = 3;
    } else if (engine.phase === 'YELLOW') {
      let nextLane = null;

      for (let l of LANES) {
          if (engine.laneIdleTimer[l] >= 30) {
              nextLane = l;
              engine.laneIdleTimer[l] = 0;
              console.log(`Lane Starvation Triggered: Forcing ${l} to GREEN`);
              break;
          }
      }

      if (!nextLane) {
          nextLane = getNextLane(engine.activeLane);
          let attempts = 0;

          while (detections[nextLane].vehicles === 0 && attempts < 4) {
            nextLane = getNextLane(nextLane);
            attempts++;
          }

          if (attempts === 4) {
            engine.phase = 'ALL_RED';
            engine.timer = 2;
            return;
          }
      }

      engine.activeLane = nextLane;
      engine.phase = 'GREEN';
      let baseTime = 15;
      if (systemState.weather === 'Rain') baseTime += 10;
      engine.timer = baseTime;
    } else if (engine.phase === 'ALL_RED') {
      let foundLane = LANES.find(l => detections[l].vehicles > 0);
      if (foundLane) {
        engine.activeLane = foundLane;
        engine.phase = 'GREEN';
        let baseTime = 15;
        if (systemState.weather === 'Rain') baseTime += 10;
        engine.timer = baseTime;
      } else {
        engine.timer = 2;
      }
    }
  }

  for (let l of LANES) {
    engine.prevVehicles[l] = detections[l].vehicles;
  }
}

function getNextLane(current) {
  let idx = LANES.indexOf(current);
  return LANES[(idx + 1) % LANES.length];
}

function updateExternalState() {
  systemState.anomalies = detections.anomalies || [];
  systemState.roadSituation = detections.roadSituation || systemState.roadSituation;

  for (let l of LANES) {
    systemState.lanes[l].vehicles = detections[l].vehicles || 0;
    systemState.lanes[l].breakdown = detections[l].breakdown || { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 };
    systemState.lanes[l].pedestrians = detections[l].pedestrians || 0;
    systemState.lanes[l].animals = detections[l].animals || 0;
    systemState.lanes[l].anomalies = detections[l].anomalies || [];

    const isActiveLane = (l === engine.activeLane) && (engine.phase === 'GREEN' || engine.phase === 'YELLOW');
    const hasAnomaly = (detections[l].anomalies && detections[l].anomalies.length > 0);

    if (systemState.mode === 'AI' && (isActiveLane || hasAnomaly)) {
      systemState.lanes[l].boxes = detections[l].boxes || [];
      systemState.lanes[l].ambulanceBoxes = detections[l].ambulanceBoxes || [];
    } else {
      systemState.lanes[l].boxes = [];
      systemState.lanes[l].ambulanceBoxes = [];
    }

    if (engine.phase === 'ALL_RED') {
      systemState.lanes[l].signal = 'RED';
      systemState.lanes[l].time = 0;
      continue;
    }

    if (l === engine.activeLane) {
      systemState.lanes[l].signal = engine.phase;
      systemState.lanes[l].time = engine.timer;
    } else {
      systemState.lanes[l].signal = 'RED';
      systemState.lanes[l].time = 0;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Endpoints
// ─────────────────────────────────────────────────────────────────────────────
app.get('/status', (req, res) => {
  res.json(systemState);
});

app.post('/mode', (req, res) => {
  const { mode } = req.body;
  if (['AI', 'STATIC'].includes(mode)) {
    systemState.mode = mode;
    systemState.emergency = false;
    systemState.safetyHold = false;
    engine.ambulanceActiveLane = null;
    engine.ambulanceCapTimer = 0;
    engine.pendingAmbulanceLane = null;

    if (engine.phase === 'ALL_RED') {
      engine.phase = 'GREEN';
      engine.timer = 30;
      engine.activeLane = 'north';
    }

    if (mode === 'STATIC' && engine.timer > 30) {
      engine.timer = 30;
    }

    res.json({ success: true, mode });
  } else {
    res.status(400).json({ error: 'Invalid mode' });
  }
});

app.post('/detections', (req, res) => {
  const data = req.body;
  if (data) {
    if (data.timestamp) engine.lastPingTime = data.timestamp;

    for (let l of LANES) {
      if (data[l]) {
        detections[l].vehicles = data[l].vehicles !== undefined ? data[l].vehicles : detections[l].vehicles;
        detections[l].breakdown = data[l].breakdown || detections[l].breakdown;
        detections[l].pedestrians = data[l].pedestrians !== undefined ? data[l].pedestrians : detections[l].pedestrians;
        detections[l].animals = data[l].animals !== undefined ? data[l].animals : detections[l].animals;
        detections[l].ambulance = data[l].ambulance !== undefined ? data[l].ambulance : detections[l].ambulance;
        detections[l].confidence = data[l].confidence !== undefined ? data[l].confidence : detections[l].confidence;
        detections[l].boxes = Array.isArray(data[l].boxes) ? data[l].boxes : detections[l].boxes;
        detections[l].ambulanceBoxes = Array.isArray(data[l].ambulanceBoxes) ? data[l].ambulanceBoxes : detections[l].ambulanceBoxes;
        detections[l].anomalies = Array.isArray(data[l].anomalies) ? data[l].anomalies : detections[l].anomalies;
      }
    }
    if (data.weather) detections.weather = data.weather;
    if (data.anomalies) detections.anomalies = data.anomalies;
    if (data.roadSituation) detections.roadSituation = data.roadSituation;
  }
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// History API Endpoints (SQLite queries)
// ─────────────────────────────────────────────────────────────────────────────

// GET /history/detections?lane=north&limit=100&from=ISO&to=ISO
app.get('/history/detections', (req, res) => {
  try {
    const { lane, limit = 100, from, to } = req.query;
    let query = 'SELECT * FROM detections WHERE 1=1';
    const params = [];
    if (lane) { query += ' AND lane = ?'; params.push(lane); }
    if (from)  { query += ' AND ts >= ?';  params.push(from); }
    if (to)    { query += ' AND ts <= ?';  params.push(to); }
    query += ' ORDER BY ts DESC LIMIT ?';
    params.push(Number(limit));
    const rows = db.prepare(query).all(...params);
    res.json({ count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /history/anomalies?lane=east&limit=50&severity=CRITICAL
app.get('/history/anomalies', (req, res) => {
  try {
    const { lane, limit = 50, severity, from, to } = req.query;
    let query = 'SELECT * FROM anomalies WHERE 1=1';
    const params = [];
    if (lane)     { query += ' AND lane = ?';     params.push(lane); }
    if (severity) { query += ' AND severity = ?'; params.push(severity); }
    if (from)     { query += ' AND ts >= ?';      params.push(from); }
    if (to)       { query += ' AND ts <= ?';      params.push(to); }
    query += ' ORDER BY ts DESC LIMIT ?';
    params.push(Number(limit));
    const rows = db.prepare(query).all(...params);
    res.json({ count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /history/signals?lane=west&limit=100
app.get('/history/signals', (req, res) => {
  try {
    const { lane, limit = 100, from, to } = req.query;
    let query = 'SELECT * FROM signal_history WHERE 1=1';
    const params = [];
    if (lane) { query += ' AND lane = ?'; params.push(lane); }
    if (from) { query += ' AND ts >= ?';  params.push(from); }
    if (to)   { query += ' AND ts <= ?';  params.push(to); }
    query += ' ORDER BY ts DESC LIMIT ?';
    params.push(Number(limit));
    const rows = db.prepare(query).all(...params);
    res.json({ count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /history/situations?limit=50
app.get('/history/situations', (req, res) => {
  try {
    const { limit = 50, from, to } = req.query;
    let query = 'SELECT * FROM road_situations WHERE 1=1';
    const params = [];
    if (from) { query += ' AND ts >= ?'; params.push(from); }
    if (to)   { query += ' AND ts <= ?'; params.push(to); }
    query += ' ORDER BY ts DESC LIMIT ?';
    params.push(Number(limit));
    const rows = db.prepare(query).all(...params);
    res.json({ count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /history/stats — summary statistics
app.get('/history/stats', (req, res) => {
  try {
    const totalDetections = db.prepare('SELECT COUNT(*) as count FROM detections').get();
    const totalAnomalies  = db.prepare('SELECT COUNT(*) as count FROM anomalies').get();
    const totalSignals    = db.prepare('SELECT COUNT(*) as count FROM signal_history').get();
    const oldestRecord    = db.prepare('SELECT MIN(ts) as oldest FROM detections').get();
    const latestRecord    = db.prepare('SELECT MAX(ts) as latest FROM detections').get();

    const peakByLane = db.prepare(`
      SELECT lane, MAX(vehicles) as peak_vehicles, AVG(vehicles) as avg_vehicles
      FROM detections GROUP BY lane
    `).all();

    const anomalyBreakdown = db.prepare(`
      SELECT type, severity, COUNT(*) as count FROM anomalies GROUP BY type, severity
    `).all();

    res.json({
      totalDetections: totalDetections.count,
      totalAnomalies:  totalAnomalies.count,
      totalSignalChanges: totalSignals.count,
      oldestRecord:    oldestRecord.oldest,
      latestRecord:    latestRecord.latest,
      peakByLane,
      anomalyBreakdown,
      dbPath: DB_PATH
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /history/clear — wipe all stored data (use with caution)
app.delete('/history/clear', (req, res) => {
  try {
    db.exec('DELETE FROM detections; DELETE FROM anomalies; DELETE FROM signal_history; DELETE FROM road_situations;');
    persistedAnomalyIds.clear();
    lastSignalState = { north: null, east: null, south: null, west: null };
    lastRoadSituationStatus = null;
    console.log('⚠️  All historical data cleared via API.');
    res.json({ success: true, message: 'All history cleared.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Node Engine listening on port ${PORT}`);
  console.log(`📊 History API: http://localhost:${PORT}/history/stats`);
});
