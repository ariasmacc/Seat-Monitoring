import cv2
import json
import time
import os
import threading
import csv
from datetime import datetime
from flask import Flask, Response, request, jsonify, send_file
from flask_cors import CORS

# --- SETTINGS ---
CAMERA_SOURCE = "https://192.168.1.13:8080/video"
CONFIG_FILE = 'seat_config.json'
REPORT_FILE = 'seat_analytics.csv'
THRESHOLD = 2000

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE_PATH = os.path.join(BASE_DIR, CONFIG_FILE)
REPORT_FILE_PATH = os.path.join(BASE_DIR, REPORT_FILE)

app = Flask(__name__)
CORS(app)

# Global runtime states
seat_states = []      # old system state (still used in detection)
rois = []             # seat configurations
background_frame = None
output_frame = None
lock = threading.Lock()

# --------- CSV LOGGING --------
def init_csv():
    if not os.path.exists(REPORT_FILE_PATH):
        try:
            with open(REPORT_FILE_PATH, mode='w', newline='') as file:
                writer = csv.writer(file)
                writer.writerow(['Date', 'Time', 'Seat ID', 'Status', 'Duration (Minutes)'])
            print("Created new analytics CSV.")
        except Exception as e:
            print("CSV creation error:", e)

def log_to_csv(seat_id, status, duration):
    try:
        now = datetime.now()
        with open(REPORT_FILE_PATH, mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([
                now.strftime("%Y-%m-%d"),
                now.strftime("%H:%M:%S"),
                f"Seat {seat_id}",
                status,
                f"{duration:.2f}"
            ])
    except Exception as e:
        print("CSV Log Error:", e)


# -------- CONFIG LOADING ----------
def load_config():
    global rois
    try:
        if os.path.exists(CONFIG_FILE_PATH):
            with open(CONFIG_FILE_PATH, "r") as f:
                rois = json.load(f)
            print(f"Loaded {len(rois)} seats from config.")
            initialize_states()
            load_seat_history()   # NEW
            return True
        return False
    except Exception as e:
        print("Config load error:", e)
        return False


# -------- STATE INITIALIZATION ----------
def initialize_states():
    global seat_states
    seat_states = []
    now = time.time()

    for i in range(len(rois)):
        seat_states.append({
            "id": i + 1,
            "status": "Available",
            "last_change_time": now
        })

# -------- NEW: Load History for Analytics ------
def load_seat_history():
    """
    Adds missing fields:
    - availableMinutes
    - occupiedMinutes
    - occupancyHistory
    - lastStatusChange
    into seat_config.json seats
    """
    for seat in rois:
        seat.setdefault("availableMinutes", 0)
        seat.setdefault("occupiedMinutes", 0)
        seat.setdefault("lastStatusChange", datetime.now().isoformat())
        seat.setdefault("occupancyHistory", [])
# ------------------------------
# Flask routes & video streaming
# ------------------------------

@app.route('/save_seats', methods=['POST'])
def save_seats():
    """
    Save the seat configuration posted from CalibrationPanel.
    Ensure each seat has the analytics fields we expect.
    """
    global rois
    try:
        data = request.json or []
        # Normalize / ensure expected fields
        for seat in data:
            seat.setdefault("id", seat.get("id", f"seat-{int(time.time()*1000)}"))
            seat.setdefault("availableMinutes", seat.get("availableMinutes", 0))
            seat.setdefault("occupiedMinutes", seat.get("occupiedMinutes", 0))
            seat.setdefault("lastStatusChange", seat.get("lastStatusChange", datetime.utcnow().isoformat() + "Z"))
            seat.setdefault("occupancyHistory", seat.get("occupancyHistory", []))
            # keep status lowercase to match frontend expectation
            seat["status"] = seat.get("status", "available").lower()

        # Save file
        with open(CONFIG_FILE_PATH, 'w') as f:
            json.dump(data, f, indent=2)

        rois = data
        initialize_states()
        return jsonify({"message": "Saved"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/seats')
def api_seats():
    """
    Returns seat configuration (rois) enriched for frontend:
    - ensure date strings
    - occupancyHistory as-is
    """
    try:
        # Defensive copy so we don't accidentally mutate rois
        out = []
        for seat in rois:
            s = seat.copy()
            # Ensure lastStatusChange is a string
            if isinstance(s.get("lastStatusChange"), (int, float)):
                # convert unix -> ISO
                s["lastStatusChange"] = datetime.utcfromtimestamp(s["lastStatusChange"]).isoformat() + "Z"
            s["status"] = s.get("status", "available").lower()
            s.setdefault("occupancyHistory", [])
            out.append(s)
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/status')
def get_status():
    """Return the internal runtime seat_states (debugging)."""
    try:
        return jsonify(seat_states), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/download_report')
def download_report():
    """Download analytics CSV (creates if missing)."""
    try:
        if not os.path.exists(REPORT_FILE_PATH):
            init_csv()
        return send_file(REPORT_FILE_PATH, as_attachment=True, download_name="Seat_Report.csv")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# small helper to allow front-end to capture background programmatically
@app.route('/capture_background', methods=['POST'])
def capture_background_route():
    global background_frame, latest_gray
    try:
        if latest_gray is None:
            return jsonify({"error": "No frame available yet"}), 400
        background_frame = latest_gray.copy()
        # reset seat_states times and statuses
        now = time.time()
        for s in seat_states:
            s['status'] = "Available"
            s['last_change_time'] = now
        # also update rois lastStatusChange and status
        for seat in rois:
            seat['status'] = 'available'
            seat['lastStatusChange'] = datetime.utcnow().isoformat() + "Z"
            # Optionally append a reset event to occupancyHistory
            seat.setdefault('occupancyHistory', []).append({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "status": "reset_background"
            })
        # save config
        with open(CONFIG_FILE_PATH, 'w') as f:
            json.dump(rois, f, indent=2)
        # log reset in CSV
        log_to_csv("ALL", "RESET (Background Captured)", 0)
        return jsonify({"message": "Background captured"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------------------
# Video stream generator
# ------------------------------
latest_gray = None  # store last gray frame for capture_background

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


def generate_frames():
    """
    Yields MJPEG frames using the global output_frame.
    The camera loop writes output_frame under lock.
    """
    global output_frame, lock
    while True:
        with lock:
            if output_frame is None:
                # small sleep so we don't spin-wait too fast
                time.sleep(0.03)
                continue
            (flag, encodedImage) = cv2.imencode(".jpg", output_frame)
            if not flag:
                time.sleep(0.03)
                continue
            frame_bytes = bytearray(encodedImage)
        # multipart frame
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        # throttle
        time.sleep(0.03)
# ----------------------------------------------
# DETECTION LOOP (WITH ADDED ANALYTICS LOGGING)
# ----------------------------------------------

def detection_loop():
    global background_frame, output_frame, seat_states, rois, latest_gray
    
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    time.sleep(2)

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(1)
            cap.release()
            cap = cv2.VideoCapture(CAMERA_SOURCE)
            continue

        display_frame = frame.copy()
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        latest_gray = gray  # store last gray frame for background capture

        if background_frame is None:
            cv2.putText(display_frame, "PRESS 'b' TO CALIBRATE", (10, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        else:
            frame_delta = cv2.absdiff(background_frame, gray)
            thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
            thresh = cv2.dilate(thresh, None, iterations=2)

            for i, seat_conf in enumerate(rois):
                if i >= len(seat_states):
                    break

                h, w, _ = frame.shape
                x = int((seat_conf['x'] / 100) * w)
                y = int((seat_conf['y'] / 100) * h)
                bw = int((seat_conf['w'] / 100) * w)
                bh = int((seat_conf['h'] / 100) * h)

                seat_crop = thresh[y:y+bh, x:x+bw]
                non_zero = cv2.countNonZero(seat_crop)

                status = "available"
                color = (0, 255, 0)
                if non_zero > THRESHOLD:
                    status = "occupied"
                    color = (0, 0, 255)

                # CURRENT TIME
                current_time = time.time()
                elapsed_minutes = (current_time - seat_states[i]['last_change_time']) / 60

                # -----------------------------
                # STATUS CHANGE DETECTED
                # -----------------------------
                if seat_states[i]['status'].lower() != status:

                    # LOG TO CSV (existing feature)
                    log_to_csv(seat_states[i]['id'], seat_states[i]['status'], elapsed_minutes)

                    # -------------------------------------------
                    # ADD: Append to occupancyHistory (NEW)
                    # -------------------------------------------
                    ts = datetime.utcnow().isoformat() + "Z"
                    rois[i].setdefault("occupancyHistory", [])
                    rois[i]["occupancyHistory"].append({
                        "timestamp": ts,
                        "status": status
                    })

                    # -------------------------------------------
                    # ADD: Update available/occupied minutes
                    # -------------------------------------------
                    if seat_states[i]['status'].lower() == "available":
                        rois[i]["availableMinutes"] = rois[i].get("availableMinutes", 0) + elapsed_minutes
                    else:
                        rois[i]["occupiedMinutes"] = rois[i].get("occupiedMinutes", 0) + elapsed_minutes

                    # -------------------------------------------
                    # UPDATE seat_states
                    # -------------------------------------------
                    seat_states[i]['status'] = status
                    seat_states[i]['last_change_time'] = current_time

                    # -------------------------------------------
                    # ALSO UPDATE rois[] FOR FRONTEND
                    # -------------------------------------------
                    rois[i]["status"] = status
                    rois[i]["lastStatusChange"] = ts

                    # SAVE CHANGES TO FILE
                    with open(CONFIG_FILE_PATH, "w") as f:
                        json.dump(rois, f, indent=2)

                # DRAW BOX
                cv2.rectangle(display_frame, (x, y), (x+bw, y+bh), color, 2)
                cv2.putText(display_frame, f"S{i+1}", (x, y-5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        # UPDATE OUTPUT FRAME FOR FLASK STREAM
        with lock:
            output_frame = display_frame.copy()

        # LOCAL DEBUG WINDOW (OPTIONAL)
        cv2.imshow("Local Debug", display_frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('b'):
            background_frame = gray.copy()
            print("Background captured!")

            now = time.time()
            for s in seat_states:
                s['status'] = "Available"
                s['last_change_time'] = now

            log_to_csv("ALL", "RESET (Background Captured)", 0)

    cap.release()
    cv2.destroyAllWindows()
    os._exit(0)


# ------------------------------
# MAIN ENTRY POINT
# ------------------------------
if __name__ == '__main__':
    init_csv()
    load_config()
    t = threading.Thread(target=detection_loop)
    t.daemon = True
    t.start()
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
