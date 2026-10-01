# 🚦 AI-Driven Intelligent Traffic Management System

<div align="center">
  <img src="https://img.shields.io/badge/First_Prize-Winner-gold?style=for-the-badge&logo=trophy" alt="First Prize Winner" />
  <img src="https://img.shields.io/badge/24--Hour-Hackathon-blue?style=for-the-badge&logo=clock" alt="24 Hour Hackathon" />
  <br />
  <h3>🥇 1st Prize Winner — 24-Hour Hackathon Project</h3>
  <p>A resilient AI-powered platform for real-time traffic monitoring, adaptive signal control, and emergency vehicle priority.</p>
</div>

---

## 📌 Overview

The **AI-Driven Intelligent Traffic Management System** is a real-time traffic monitoring and signal-management platform designed to address urban congestion and improve emergency vehicle movement.

The system uses **computer vision, AI-based vehicle detection, adaptive signal logic, and real-time communication** to monitor traffic conditions and dynamically manage signal states.

Instead of relying only on fixed signal timings, the system analyzes traffic conditions and adjusts signal timing according to the current road situation.

---

## 🏆 Hackathon Achievement

🥇 **1st Prize**

Developed within a **24-hour hackathon**, the project focused on combining AI, real-time communication, and traffic signal logic into a functional software prototype.

---

## ✨ Key Features

### 🧠 AI-Based Traffic Detection

Uses **YOLOv8** and **OpenCV** to process traffic video and identify vehicles and road activity.

The detected traffic information is used by the backend to estimate lane-level traffic conditions.

### 🚦 Adaptive Traffic Signal Control

The system dynamically adjusts signal timing based on traffic conditions.

Traffic-heavy lanes can receive additional green time while the system also considers lane waiting time to prevent excessive starvation.

### 🚑 Emergency Vehicle Priority

The system supports ambulance detection and controlled emergency preemption.

When an ambulance is detected consistently, the signal controller can safely transition from the current phase and provide priority to the corresponding lane.

### 🛡️ Safety Preemption

Critical road events can trigger a controlled signal transition:

```text
GREEN
  ↓
YELLOW
  ↓
ALL RED / SAFETY HOLD
```

This prevents abrupt signal changes during critical situations.

### 🔄 Automatic Fallback

If the AI/sensor input becomes unavailable, the backend can switch to a predefined static signal mode instead of leaving the system without a valid signal state.

### ⚡ Real-Time Dashboard

The React dashboard provides:

* Live traffic camera feeds
* Vehicle counts
* Lane status
* Signal states
* Emergency status
* Road situations
* Activity logs
* Traffic analytics
* System mode information

### 🌐 Real-Time Communication

**Socket.IO** provides real-time communication between the backend and connected dashboard clients.

The backend acts as the authoritative source for signal state and timing, helping maintain consistent state across connected clients.

---

## 🏗️ System Architecture

```text
          Traffic Video Sources
                  │
                  ▼
        ┌───────────────────┐
        │ Python AI Engine  │
        │ YOLOv8 + OpenCV   │
        └─────────┬─────────┘
                  │
          Detection Data
                  │
                  ▼
        ┌───────────────────┐
        │ Node.js Backend   │
        │ Express + Socket.IO│
        └─────────┬─────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
       ▼                     ▼
 Signal Control          SQLite
 & State Engine          History
       │
       ▼
┌────────────────────────────┐
│ React Traffic Dashboard    │
│ Real-Time Visualization    │
└────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

* **React 19**
* **Vite**
* **Tailwind CSS v4**
* **Socket.IO Client**
* **Axios**
* **Lucide React**

### Real-Time Backend

* **Node.js**
* **Express 5**
* **Socket.IO**
* **CORS**
* **SQLite**

### AI & Computer Vision

* **Python**
* **FastAPI**
* **Uvicorn**
* **YOLOv8**
* **Ultralytics**
* **OpenCV**
* **Inference SDK**

### Database

* **SQLite**

The backend stores traffic detections, anomalies, signal changes, and road-situation history for monitoring and analysis.

---

## 📁 Project Structure

```text
AI-Driven-Intelligent-Traffic-Management-System/
│
├── backend/
│   ├── node/
│   │   ├── server.js
│   │   ├── package.json
│   │   └── ...
│   │
│   └── python/
│       ├── main.py
│       ├── requirements.txt
│       └── yolov8n.pt
│
├── traffic-system/
│   ├── public/
│   │   ├── east.mp4
│   │   ├── north.mp4
│   │   ├── south.mp4
│   │   └── west.mp4
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── ambulance.py
├── traffic.mp4
├── yolov8n.pt
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

Install:

* Node.js 18+
* Python 3.9+
* npm
* pip

### 1. Start the Node.js Backend

Open PowerShell:

```powershell
cd backend/node
npm install
npm start
```

The backend runs on:

```text
http://localhost:5000
```

### 2. Start the Python AI Engine

Open another terminal:

```powershell
cd backend/python
pip install -r requirements.txt
python main.py
```

The Python service provides the AI/computer-vision processing layer.

### 3. Start the React Dashboard

Open another terminal:

```powershell
cd traffic-system
npm install
npm run dev
```

Open the Vite development URL shown in the terminal, normally:

```text
http://localhost:5173
```

---

## 🔌 Backend API

The Node.js backend provides endpoints for traffic monitoring and historical data.

Examples include:

```text
GET  /status
POST /mode
POST /detections

GET  /history/detections
GET  /history/anomalies
GET  /history/signals
GET  /history/situations
GET  /history/stats

DELETE /history/clear
```

---

## 🔄 Traffic Signal Logic

The system uses an internal state machine to control signal phases.

A normal transition follows:

```text
GREEN
  ↓
YELLOW
  ↓
NEXT LANE
  ↓
GREEN
```

The controller considers factors such as:

* Current traffic density
* Lane waiting time
* Traffic spikes
* Emergency vehicles
* Weather information
* Critical anomalies
* Sensor/AI availability

The system also supports a predefined static mode as a fallback when AI input is unavailable.

---

## 🚑 Emergency Vehicle Flow

```text
Camera Input
     ↓
AI Detection
     ↓
Ambulance Confirmation
     ↓
Current Signal Assessment
     ↓
Safe Yellow Transition
     ↓
Emergency Lane GREEN
     ↓
Emergency Vehicle Passage
     ↓
Normal Traffic Control
```

This approach avoids abruptly switching signals and provides a controlled emergency-priority sequence.

---

## 📊 Data & Analytics

The backend uses SQLite to maintain historical information such as:

* Vehicle detection snapshots
* Traffic lanes
* Signal changes
* Traffic anomalies
* Road situations
* Operating mode
* Detection statistics

This history can be used for traffic analysis and future predictive features.

---

## 💡 What Makes the Project Different

The project combines multiple traffic-management functions into a single software platform:

* AI-based vehicle detection
* Dynamic signal timing
* Emergency vehicle priority
* Real-time dashboard monitoring
* Server-authoritative signal timing
* Safety-oriented signal transitions
* Automatic fallback operation
* Historical traffic data
* Multi-direction traffic monitoring

Rather than treating vehicle detection and signal control as separate components, the system connects AI-generated traffic information directly to the signal-control logic.

---

## 🔮 Future Scope

Possible future extensions include:

* Deployment with real roadside cameras
* IoT traffic sensors
* Edge-AI processing
* Multi-intersection coordination
* Green-corridor management for emergency vehicles
* Traffic-volume prediction
* Cloud-based centralized monitoring
* Integration with certified traffic signal controllers
* Automatic incident detection
* Larger-scale city traffic simulation

---

## ⚠️ Prototype & Deployment Note

This repository represents a **software prototype and traffic-management simulation**.

Deployment on real public-road traffic signals would require appropriate hardware integration, testing, safety validation, authorization, and compliance with applicable traffic-control standards.

---

## 🥇 Achievement

**1st Prize — 24-Hour Hackathon**

The project demonstrates how AI, computer vision, real-time communication, and adaptive decision logic can be combined to build a responsive traffic-management platform.

---

## ☕ Built With

**• Computer Vision • React • Node.js • Python • Socket.IO • SQLite**
