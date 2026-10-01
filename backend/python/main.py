import time
import requests
import cv2
import threading
import base64
import random
import math
from collections import deque
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from ultralytics import YOLO

app = FastAPI(title="AI Traffic Intelligence CV Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
NODE_URL = "http://localhost:5000/detections"
ROBOFLOW_API_KEY = "yVwkM1ahb9RV40ESfTpr"
ROBOFLOW_URL = "https://serverless.roboflow.com/ambulance-detection-u4ao4-9qdka/1"

LANES = ["north", "east", "south", "west"]
VIDEO_PATHS = {
    "north": "../../traffic-system/public/north.mp4",
    "east": "../../traffic-system/public/east.mp4",
    "south": "../../traffic-system/public/south.mp4",
    "west": "../../traffic-system/public/west.mp4"
}

# Accurate COCO Class Definitions
VEHICLE_CLASSES = {1: "Bicycle", 2: "Car", 3: "Motorcycle", 5: "Bus", 7: "Truck"}
PEDESTRIAN_CLASSES = {0: "Person"}
ANIMAL_CLASSES = {15: "Cat", 16: "Dog", 17: "Horse", 18: "Sheep", 19: "Cow"}

# Temporal Tracker State per lane
lane_trackers = {
    lane: {
        "prev_persons": [],
        "person_down_streak": 0,
        "altercation_streak": 0,
        "animal_streak": 0,
        "active_anomalies": []
    }
    for lane in LANES
}

# Active Simulation Override (None = live camera processing)
active_scenario_override = None
override_expiry = 0

# Global State for Detections
latest_detections = {
    lane: {
        "vehicles": 0,
        "breakdown": {"car": 0, "truck": 0, "bus": 0, "motorcycle": 0, "bicycle": 0},
        "pedestrians": 0,
        "animals": 0,
        "ambulance": False,
        "confidence": 0.0,
        "boxes": [],
        "ambulanceBoxes": [],
        "anomalies": []
    }
    for lane in LANES
}
latest_detections["weather"] = "Clear"
latest_detections["timestamp"] = 0
latest_detections["roadSituation"] = {
    "status": "NORMAL_TRAFFIC",
    "summary": "Initializing computer vision pipeline...",
    "severity": "info"
}

# Load YOLO model
try:
    yolo_model = YOLO('yolov8n.pt')
    print("✅ YOLOv8n loaded successfully")
except Exception as e:
    print("❌ Failed to load YOLO:", e)
    yolo_model = None


def compute_iou(box1, box2):
    """Compute Intersection over Union between two normalized boxes {x1, y1, x2, y2}."""
    xa = max(box1["x1"], box2["x1"])
    ya = max(box1["y1"], box2["y1"])
    xb = min(box1["x2"], box2["x2"])
    yb = min(box1["y2"], box2["y2"])
    inter = max(0, xb - xa) * max(0, yb - ya)
    area1 = (box1["x2"] - box1["x1"]) * (box1["y2"] - box1["y1"])
    area2 = (box2["x2"] - box2["x1"]) * (box2["y2"] - box2["y1"])
    union = area1 + area2 - inter
    return inter / union if union > 0 else 0


def analyze_lane_anomalies(lane_id, persons, animals):
    """
    Temporal multi-frame anomaly detection:
    1. Possible Person-Down: Aspect ratio horizontal (width > height) + stationary in road.
    2. Possible Physical Altercation: Close proximity between multiple persons + rapid displacement variance.
    3. Animal on Road: Animal inside active roadway corridor.
    """
    tracker = lane_trackers[lane_id]
    anomalies = []
    current_time = int(time.time() * 1000)

    # ──── 1. ANIMAL ON ROAD DETECTION ────
    # Road region is typically y1 > 30% of frame
    road_animals = [a for a in animals if a["y1"] > 30.0]
    if len(road_animals) > 0:
        tracker["animal_streak"] += 1
        if tracker["animal_streak"] >= 2:
            highest_conf_animal = max(road_animals, key=lambda a: a["confidence"])
            anomalies.append({
                "id": f"anom-animal-{lane_id}-{current_time}",
                "type": "ANIMAL_ON_ROAD",
                "severity": "WARNING",
                "lane": lane_id,
                "title": f"Animal Detected on Road ({highest_conf_animal['class']})",
                "explanation": f"{highest_conf_animal['class']} detected inside active vehicle corridor across multiple frames.",
                "confidence": highest_conf_animal["confidence"],
                "box": highest_conf_animal,
                "timestamp": current_time
            })
    else:
        tracker["animal_streak"] = max(0, tracker["animal_streak"] - 1)

    # ──── 2. PERSON-DOWN DETECTION ────
    # Look for a person in road area with width > height or very flat aspect ratio
    person_down_found = False
    for p in persons:
        w = max(0.1, p["x2"] - p["x1"])
        h = max(0.1, p["y2"] - p["y1"])
        aspect_ratio = w / h
        # In roadway (y1 > 35%) and horizontal posture (w > 1.1 * h)
        if p["y1"] > 35.0 and aspect_ratio >= 1.1:
            # Check stationarity against previous frame
            stationary = True
            cx = (p["x1"] + p["x2"]) / 2.0
            cy = (p["y1"] + p["y2"]) / 2.0
            for prev_p in tracker["prev_persons"]:
                prev_cx = (prev_p["x1"] + prev_p["x2"]) / 2.0
                prev_cy = (prev_p["y1"] + prev_p["y2"]) / 2.0
                dist = math.hypot(cx - prev_cx, cy - prev_cy)
                if dist > 6.0:  # Moving rapidly -> not stationary down
                    stationary = False
                    break

            if stationary:
                tracker["person_down_streak"] += 1
                person_down_found = True
                if tracker["person_down_streak"] >= 2:
                    anomalies.append({
                        "id": f"anom-person-down-{lane_id}-{current_time}",
                        "type": "PERSON_DOWN",
                        "severity": "CRITICAL",
                        "lane": lane_id,
                        "title": "Possible Person-Down Incident",
                        "explanation": "Individual detected lying in roadway remaining stationary across consecutive frames.",
                        "confidence": p["confidence"],
                        "box": p,
                        "timestamp": current_time
                    })
                break

    if not person_down_found:
        tracker["person_down_streak"] = max(0, tracker["person_down_streak"] - 1)

    # ──── 3. POSSIBLE PHYSICAL ALTERCATION (With False-Positive Control) ────
    # Must distinguish two people talking/walking together vs actual rapid physical struggle
    altercation_found = False
    if len(persons) >= 2:
        for i in range(len(persons)):
            for j in range(i + 1, len(persons)):
                p1, p2 = persons[i], persons[j]
                c1x, c1y = (p1["x1"] + p1["x2"]) / 2.0, (p1["y1"] + p1["y2"]) / 2.0
                c2x, c2y = (p2["x1"] + p2["x2"]) / 2.0, (p2["y1"] + p2["y2"]) / 2.0
                dist = math.hypot(c1x - c2x, c1y - c2y)
                iou = compute_iou(p1, p2)

                # Close physical contact / proximity (within 10% frame distance or box overlap)
                if dist < 10.0 or iou > 0.12:
                    # Check relative motion against previous frame
                    if len(tracker["prev_persons"]) >= 2:
                        prev_p1, prev_p2 = tracker["prev_persons"][0], tracker["prev_persons"][1]
                        prev_c1x, prev_c1y = (prev_p1["x1"] + prev_p1["x2"]) / 2.0, (prev_p1["y1"] + prev_p1["y2"]) / 2.0
                        prev_c2x, prev_c2y = (prev_p2["x1"] + prev_p2["x2"]) / 2.0, (prev_p2["y1"] + prev_p2["y2"]) / 2.0
                        prev_dist = math.hypot(prev_c1x - prev_c2x, prev_c1y - prev_c2y)
                        
                        # Displacement jitter (shoving/grappling creates rapid distance expansion/contraction)
                        dist_delta = abs(dist - prev_dist)
                        
                        # Only flag if erratic relative displacement is high (dist_delta > 5.0%)
                        # Two people talking/walking together maintain steady distance (dist_delta < 3.0%)
                        if dist_delta > 5.0 and p1["confidence"] > 0.6 and p2["confidence"] > 0.6:
                            tracker["altercation_streak"] += 1
                            altercation_found = True
                            if tracker["altercation_streak"] >= 3:
                                anomalies.append({
                                    "id": f"anom-altercation-{lane_id}-{current_time}",
                                    "type": "POSSIBLE_ALTERCATION",
                                    "severity": "WARNING",
                                    "lane": lane_id,
                                    "title": "Possible Physical Altercation",
                                    "explanation": "Multiple individuals exhibiting close proximity and rapid erratic interaction dynamics.",
                                    "confidence": round(min(p1["confidence"], p2["confidence"]), 2),
                                    "boxes": [p1, p2],
                                    "timestamp": current_time
                                })
                            break
            if altercation_found:
                break

    if not altercation_found:
        tracker["altercation_streak"] = max(0, tracker["altercation_streak"] - 1)

    tracker["prev_persons"] = persons
    tracker["active_anomalies"] = anomalies
    return anomalies


def synthesize_road_situation(detections_snapshot):
    """Generate concise, human-understandable explanation of what is happening."""
    total_vehicles = sum(detections_snapshot[l]["vehicles"] for l in LANES)
    total_pedestrians = sum(detections_snapshot[l]["pedestrians"] for l in LANES)
    total_animals = sum(detections_snapshot[l]["animals"] for l in LANES)

    # Check for active emergency
    emergency_lane = next((l for l in LANES if detections_snapshot[l]["ambulance"]), None)
    if emergency_lane:
        return {
            "status": "EMERGENCY_VEHICLE",
            "summary": f"Emergency vehicle approaching on {emergency_lane.upper()} approach. Automated green preemption engaged.",
            "severity": "critical"
        }

    # Check for active anomalies across lanes
    all_anomalies = []
    for l in LANES:
        all_anomalies.extend(detections_snapshot[l].get("anomalies", []))

    critical_anomaly = next((a for a in all_anomalies if a["severity"] == "CRITICAL"), None)
    if critical_anomaly:
        return {
            "status": "PERSON_DOWN",
            "summary": f"SAFETY ALERT: Possible person-down incident on {critical_anomaly['lane'].upper()} road. Traffic hold safety response initiated.",
            "severity": "critical",
            "anomaly": critical_anomaly
        }

    altercation = next((a for a in all_anomalies if a["type"] == "POSSIBLE_ALTERCATION"), None)
    if altercation:
        return {
            "status": "ALTERCATION",
            "summary": f"WARNING: Possible physical altercation observed on {altercation['lane'].upper()} approach. Operator monitoring advised.",
            "severity": "warning",
            "anomaly": altercation
        }

    animal_anomaly = next((a for a in all_anomalies if a["type"] == "ANIMAL_ON_ROAD"), None)
    if animal_anomaly:
        return {
            "status": "ANIMAL_ON_ROAD",
            "summary": f"CAUTION: Animal detected crossing the road on {animal_anomaly['lane'].upper()} approach. Drivers should proceed with care.",
            "severity": "warning",
            "anomaly": animal_anomaly
        }

    if total_vehicles >= 18:
        return {
            "status": "HEAVY_TRAFFIC",
            "summary": f"Heavy traffic volume ({total_vehicles} vehicles). Dynamic signal timers automatically extended.",
            "severity": "info"
        }

    if total_pedestrians > 0:
        return {
            "status": "PEDESTRIAN_ACTIVITY",
            "summary": f"Moderate traffic with {total_pedestrians} pedestrian(s) active near crosswalks. All vehicles moving normally.",
            "severity": "info"
        }

    return {
        "status": "NORMAL_TRAFFIC",
        "summary": f"Traffic is normal. {total_vehicles} vehicle(s) moving smoothly across all approaches. No road anomalies detected.",
        "severity": "normal"
    }


def process_camera(lane_id, video_path):
    """Background thread: process one camera feed with full object & anomaly detection."""
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"❌ Cannot open video for {lane_id}: {video_path}")
        return

    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"📹 {lane_id}: {frame_w}x{frame_h}")

    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame_count += 1

        # Process every 30 frames (~1 detection/sec at 30fps)
        if frame_count % 30 != 0:
            time.sleep(0.005)
            continue

        vehicle_boxes = []
        pedestrian_boxes = []
        animal_boxes = []
        ambulance_boxes = []

        breakdown = {"car": 0, "truck": 0, "bus": 0, "motorcycle": 0, "bicycle": 0}
        ambulance_detected = False
        amb_conf = 0.0

        # ─────────────── YOLO MULTI-CLASS DETECTION ───────────────
        if yolo_model:
            try:
                results = yolo_model(frame, verbose=False, conf=0.25)
                for r in results:
                    for box in r.boxes:
                        conf = float(box.conf[0])
                        cls_id = int(box.cls[0])
                        if conf < 0.25:
                            continue

                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        norm_box = {
                            "x1": round((x1 / frame_w) * 100, 2),
                            "y1": round((y1 / frame_h) * 100, 2),
                            "x2": round((x2 / frame_w) * 100, 2),
                            "y2": round((y2 / frame_h) * 100, 2),
                            "confidence": round(conf, 2)
                        }

                        # 1. VEHICLES
                        if cls_id in VEHICLE_CLASSES:
                            v_class = VEHICLE_CLASSES[cls_id]
                            norm_box["class"] = v_class
                            norm_box["category"] = "vehicle"
                            vehicle_boxes.append(norm_box)
                            v_key = v_class.lower()
                            if v_key in breakdown:
                                breakdown[v_key] += 1

                        # 2. PEDESTRIANS
                        elif cls_id in PEDESTRIAN_CLASSES:
                            norm_box["class"] = "Person"
                            norm_box["category"] = "pedestrian"
                            pedestrian_boxes.append(norm_box)

                        # 3. ANIMALS
                        elif cls_id in ANIMAL_CLASSES:
                            a_class = ANIMAL_CLASSES[cls_id]
                            norm_box["class"] = a_class
                            norm_box["category"] = "animal"
                            animal_boxes.append(norm_box)

            except Exception as e:
                print(f"YOLO error on {lane_id}: {e}")

        # ─────────────── ROBOFLOW AMBULANCE DETECTION ───────────────
        try:
            _, img_encoded = cv2.imencode('.jpg', frame)
            img_b64 = base64.b64encode(img_encoded).decode('utf-8')

            resp = requests.post(
                f"{ROBOFLOW_URL}?api_key={ROBOFLOW_API_KEY}",
                data=img_b64,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=3
            )
            data = resp.json()

            if 'predictions' in data:
                for p in data['predictions']:
                    if p['confidence'] > 0.5:
                        ambulance_detected = True
                        amb_conf = max(amb_conf, p['confidence'])

                        cx = p['x']
                        cy = p['y']
                        bw = p['width']
                        bh = p['height']

                        ax1 = (cx - bw / 2) / frame_w * 100
                        ay1 = (cy - bh / 2) / frame_h * 100
                        ax2 = (cx + bw / 2) / frame_w * 100
                        ay2 = (cy + bh / 2) / frame_h * 100

                        ambulance_boxes.append({
                            "x1": round(max(0, ax1), 2),
                            "y1": round(max(0, ay1), 2),
                            "x2": round(min(100, ax2), 2),
                            "y2": round(min(100, ay2), 2),
                            "class": "Ambulance",
                            "category": "emergency",
                            "confidence": round(p['confidence'], 2)
                        })
        except Exception as e:
            # Roboflow is secondary to YOLO; fail quietly
            pass

        # ─────────────── ANOMALY DETECTION ENGINE ───────────────
        lane_anomalies = analyze_lane_anomalies(lane_id, pedestrian_boxes, animal_boxes)

        # Combine all boxes for frontend display
        all_display_boxes = vehicle_boxes + pedestrian_boxes + animal_boxes

        total_vehicles = len(vehicle_boxes)

        # Update global state for this lane if not in active manual simulation
        global active_scenario_override, override_expiry
        if active_scenario_override is None or time.time() > override_expiry:
            active_scenario_override = None
            latest_detections[lane_id] = {
                "vehicles": total_vehicles,
                "breakdown": breakdown,
                "pedestrians": len(pedestrian_boxes),
                "animals": len(animal_boxes),
                "ambulance": ambulance_detected,
                "confidence": round(amb_conf, 2),
                "boxes": all_display_boxes,
                "ambulanceBoxes": ambulance_boxes,
                "anomalies": lane_anomalies
            }

        time.sleep(0.01)


# Start camera threads
for lane, path in VIDEO_PATHS.items():
    t = threading.Thread(target=process_camera, args=(lane, path), daemon=True)
    t.start()
    print(f"🚀 Started camera thread with anomaly tracking: {lane}")


# Sync to Node.js every second
def sync_to_node():
    global active_scenario_override, override_expiry
    while True:
        try:
            # If not in manual scenario override, synthesize from live camera data
            if active_scenario_override is None or time.time() > override_expiry:
                active_scenario_override = None
                latest_detections["roadSituation"] = synthesize_road_situation(latest_detections)
                active_anoms = []
                for l in LANES:
                    active_anoms.extend(latest_detections[l].get("anomalies", []))
                latest_detections["anomalies"] = active_anoms
            else:
                active_anoms = []
                for l in LANES:
                    active_anoms.extend(latest_detections[l].get("anomalies", []))
                latest_detections["anomalies"] = active_anoms

            latest_detections["timestamp"] = int(time.time() * 1000)
            requests.post(NODE_URL, json=latest_detections, timeout=2)
        except Exception as e:
            pass
        time.sleep(1)


t_sync = threading.Thread(target=sync_to_node, daemon=True)
t_sync.start()


# ─────────────────────────────────────────────────────────────
# SCENARIO SIMULATOR HARNESS FOR THE 8 MASTER TEST CASES
# ─────────────────────────────────────────────────────────────
@app.post("/scenario/{scenario_id}")
@app.get("/scenario/{scenario_id}")
def trigger_scenario(scenario_id: int):
    """
    Test scenario harness covering all 8 prompt scenarios:
    1: Normal Traffic
    2: Heavy Traffic
    3: Ambulance Priority
    4: Animal Crossing (Dog on road)
    5: Person Standing (Normal Pedestrian)
    6: Person Down (Critical Medical / Safety Incident)
    7: Two People Talking (Normal Pedestrian Interaction)
    8: Possible Physical Altercation
    0: Reset to Live Camera Feed
    """
    global active_scenario_override, override_expiry
    curr_time = int(time.time() * 1000)

    if scenario_id == 0:
        active_scenario_override = None
        override_expiry = 0
        return {"status": "success", "message": "Returned to live camera AI processing"}

    active_scenario_override = scenario_id
    override_expiry = time.time() + 60  # Active for 60 seconds

    # Reset lane states
    for l in LANES:
        latest_detections[l] = {
            "vehicles": 4,
            "breakdown": {"car": 3, "truck": 1, "bus": 0, "motorcycle": 0, "bicycle": 0},
            "pedestrians": 0,
            "animals": 0,
            "ambulance": False,
            "confidence": 0.0,
            "boxes": [
                {"x1": 20, "y1": 50, "x2": 40, "y2": 75, "class": "Car", "category": "vehicle", "confidence": 0.88},
                {"x1": 55, "y1": 55, "x2": 78, "y2": 82, "class": "Truck", "category": "vehicle", "confidence": 0.81}
            ],
            "ambulanceBoxes": [],
            "anomalies": []
        }

    if scenario_id == 1:
        # Scenario 1: Normal Traffic
        latest_detections["north"]["vehicles"] = 5
        latest_detections["roadSituation"] = {
            "status": "NORMAL_TRAFFIC",
            "summary": "Normal traffic flow. 16 vehicles moving smoothly. No road anomaly detected.",
            "severity": "normal"
        }

    elif scenario_id == 2:
        # Scenario 2: Heavy Traffic
        latest_detections["north"]["vehicles"] = 12
        latest_detections["east"]["vehicles"] = 10
        latest_detections["south"]["vehicles"] = 8
        latest_detections["west"]["vehicles"] = 7
        latest_detections["roadSituation"] = {
            "status": "HEAVY_TRAFFIC",
            "summary": "Heavy traffic volume (37 vehicles). Dynamic green phase timings automatically extended.",
            "severity": "info"
        }

    elif scenario_id == 3:
        # Scenario 3: Ambulance
        latest_detections["north"]["ambulance"] = True
        latest_detections["north"]["confidence"] = 0.94
        latest_detections["north"]["ambulanceBoxes"] = [
            {"x1": 35, "y1": 45, "x2": 65, "y2": 78, "class": "Ambulance", "category": "emergency", "confidence": 0.94}
        ]
        latest_detections["roadSituation"] = {
            "status": "EMERGENCY_VEHICLE",
            "summary": "Emergency vehicle approaching on NORTH approach. Automated green preemption engaged.",
            "severity": "critical"
        }

    elif scenario_id == 4:
        # Scenario 4: Animal Crossing (Dog)
        dog_box = {"x1": 42, "y1": 58, "x2": 58, "y2": 74, "class": "Dog", "category": "animal", "confidence": 0.89}
        latest_detections["east"]["animals"] = 1
        latest_detections["east"]["boxes"].append(dog_box)
        anomaly = {
            "id": f"anom-animal-east-{curr_time}",
            "type": "ANIMAL_ON_ROAD",
            "severity": "WARNING",
            "lane": "east",
            "title": "Animal Detected on Road (Dog)",
            "explanation": "Dog detected crossing inside active road corridor. Caution advised.",
            "confidence": 0.89,
            "box": dog_box,
            "timestamp": curr_time
        }
        latest_detections["east"]["anomalies"] = [anomaly]
        latest_detections["roadSituation"] = {
            "status": "ANIMAL_ON_ROAD",
            "summary": "CAUTION: Animal detected crossing the road on EAST approach. Drivers should proceed with care.",
            "severity": "warning",
            "anomaly": anomaly
        }

    elif scenario_id == 5:
        # Scenario 5: Person Standing (Normal Pedestrian)
        person_box = {"x1": 15, "y1": 40, "x2": 25, "y2": 78, "class": "Person", "category": "pedestrian", "confidence": 0.91}
        latest_detections["north"]["pedestrians"] = 1
        latest_detections["north"]["boxes"].append(person_box)
        latest_detections["roadSituation"] = {
            "status": "PEDESTRIAN_ACTIVITY",
            "summary": "Moderate traffic with 1 pedestrian active on sidewalk. No road anomaly detected.",
            "severity": "normal"
        }

    elif scenario_id == 6:
        # Scenario 6: Person Down (Critical)
        down_box = {"x1": 35, "y1": 62, "x2": 68, "y2": 76, "class": "Person", "category": "pedestrian", "confidence": 0.92}
        latest_detections["north"]["pedestrians"] = 1
        latest_detections["north"]["boxes"].append(down_box)
        anomaly = {
            "id": f"anom-person-down-north-{curr_time}",
            "type": "PERSON_DOWN",
            "severity": "CRITICAL",
            "lane": "north",
            "title": "Possible Person-Down Incident",
            "explanation": "Individual detected lying in roadway remaining stationary across consecutive frames.",
            "confidence": 0.92,
            "box": down_box,
            "timestamp": curr_time
        }
        latest_detections["north"]["anomalies"] = [anomaly]
        latest_detections["roadSituation"] = {
            "status": "PERSON_DOWN",
            "summary": "SAFETY ALERT: Possible person-down incident on NORTH road. Traffic hold safety response initiated.",
            "severity": "critical",
            "anomaly": anomaly
        }

    elif scenario_id == 7:
        # Scenario 7: Two People Talking (Normal Pedestrian Activity)
        p1 = {"x1": 12, "y1": 42, "x2": 22, "y2": 80, "class": "Person", "category": "pedestrian", "confidence": 0.88}
        p2 = {"x1": 24, "y1": 43, "x2": 33, "y2": 79, "class": "Person", "category": "pedestrian", "confidence": 0.85}
        latest_detections["south"]["pedestrians"] = 2
        latest_detections["south"]["boxes"].extend([p1, p2])
        latest_detections["roadSituation"] = {
            "status": "PEDESTRIAN_ACTIVITY",
            "summary": "Moderate traffic with 2 pedestrians standing near corner. Normal movement, no anomaly.",
            "severity": "normal"
        }

    elif scenario_id == 8:
        # Scenario 8: Possible Physical Altercation (Warning)
        p1 = {"x1": 40, "y1": 45, "x2": 52, "y2": 80, "class": "Person", "category": "pedestrian", "confidence": 0.90}
        p2 = {"x1": 47, "y1": 44, "x2": 58, "y2": 81, "class": "Person", "category": "pedestrian", "confidence": 0.87}
        latest_detections["west"]["pedestrians"] = 2
        latest_detections["west"]["boxes"].extend([p1, p2])
        anomaly = {
            "id": f"anom-altercation-west-{curr_time}",
            "type": "POSSIBLE_ALTERCATION",
            "severity": "WARNING",
            "lane": "west",
            "title": "Possible Physical Altercation",
            "explanation": "Multiple individuals showing close physical proximity and rapid interaction dynamics.",
            "confidence": 0.87,
            "boxes": [p1, p2],
            "timestamp": curr_time
        }
        latest_detections["west"]["anomalies"] = [anomaly]
        latest_detections["roadSituation"] = {
            "status": "ALTERCATION",
            "summary": "WARNING: Possible physical altercation observed on WEST approach. Operator monitoring advised.",
            "severity": "warning",
            "anomaly": anomaly
        }

    active_anoms = []
    for l in LANES:
        active_anoms.extend(latest_detections[l].get("anomalies", []))
    latest_detections["anomalies"] = active_anoms
    latest_detections["timestamp"] = int(time.time() * 1000)
    try:
        requests.post(NODE_URL, json=latest_detections, timeout=2)
    except Exception:
        pass

    return {
        "status": "success",
        "scenario": scenario_id,
        "situation": latest_detections["roadSituation"]["summary"]
    }


@app.get("/")
def read_root():
    return {"status": "ok", "detections": latest_detections}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
