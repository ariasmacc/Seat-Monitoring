import cv2
from ultralytics import YOLO
import pandas as pd
import time
import os
from datetime import datetime

# --- LOAD THE NEW SUPER BRAIN ---
# We are pointing directly to 'train5' based on your screenshot
try:
    model = YOLO('runs/detect/train5/weights/best.pt') 
    print("✅ Loaded Train5 Super Model")
except:
    print("❌ Could not find train5. Check your folder!")
    exit()

cap = cv2.VideoCapture(0) # Change to 1 for DroidCam if needed

# CSV Setup
csv_file = 'seat_analytics.csv'
history_file = 'seat_history.csv'
if not os.path.exists(history_file):
    pd.DataFrame(columns=['Timestamp', 'Event', 'Duration']).to_csv(history_file, index=False)

print("--- NEW MODEL TESTING (NO SAFETY NET) ---")

# State Variables
seat_state = "EMPTY"
last_human_time = 0
occupancy_start = 0

while True:
    ret, frame = cap.read()
    if not ret: break

    # 1. Run AI (Single Model)
    # conf=0.40: Strict enough to ignore random shadows
    # iou=0.50: Prevents box merging
    results = model(frame, imgsz=640, conf=0.40, iou=0.50)
    
    human_detected = False

    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            cls = int(box.cls[0])
            current_class = model.names[cls]
            
            # Check if model sees "Occupied" (Class 1)
            # Logic: If it's not "empty", it must be occupied
            if "empty" not in current_class.lower():
                human_detected = True
                color = (0, 0, 255) # Red for box
                label_visual = "Occupied"
            else:
                color = (0, 255, 0) # Green for box
                label_visual = "Empty"

            # Draw raw detection box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label_visual, (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    # 2. Time Logic (3 Seconds Rule) to stop flickering
    current_time = time.time()
    if human_detected:
        if last_human_time == 0:
            last_human_time = current_time
        elif (current_time - last_human_time) > 3.0 and seat_state == "EMPTY":
            seat_state = "OCCUPIED"
            occupancy_start = current_time
            # Log it
            new_row = pd.DataFrame([{'Timestamp': datetime.now().strftime('%H:%M:%S'), 'Event': 'SAT_DOWN', 'Duration': 0}])
            new_row.to_csv(history_file, mode='a', header=False, index=False)
    else:
        last_human_time = 0
        if seat_state == "OCCUPIED":
            duration = int(current_time - occupancy_start)
            seat_state = "EMPTY"
            # Log it
            new_row = pd.DataFrame([{'Timestamp': datetime.now().strftime('%H:%M:%S'), 'Event': 'LEFT', 'Duration': duration}])
            new_row.to_csv(history_file, mode='a', header=False, index=False)

    # 3. Status Banner
    color = (0, 0, 255) if seat_state == "OCCUPIED" else (0, 255, 0)
    cv2.putText(frame, f"STATUS: {seat_state}", (20, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    
    # Save for Frontend
    if int(current_time) % 1 == 0:
        try:
            pd.DataFrame([{'Timestamp': datetime.now().strftime("%H:%M:%S"), 'Seat_ID': 'Seat 1', 'Status': seat_state}]).to_csv(csv_file, mode='w', index=False)
        except: pass

    cv2.imshow('New Model Test', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'): break

cap.release()
cv2.destroyAllWindows()