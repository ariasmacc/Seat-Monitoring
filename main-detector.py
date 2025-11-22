import cv2
from ultralytics import YOLO
import pandas as pd
import time
import os

# --- LOAD BRAINS ---
# We use the 'try' block to automatically find your best file
try:
    model_custom = YOLO('runs/detect/train3/weights/best.pt') # Your Chair Detector
except:
    model_custom = YOLO('runs/detect/train/weights/best.pt')

model_human = YOLO('yolov8n.pt') # The "Human Validator"

cap = cv2.VideoCapture(0)

print("--- FINAL PRESENTATION MODE ---")

while True:
    ret, frame = cap.read()
    if not ret: break

    # --- THE TUNING FIXES ---
    # conf=0.45: High enough to ignore the bag on the wall
    # iou=0.25: Low enough to merge the two boxes on your body into one
    results_custom = model_custom(frame, imgsz=640, conf=0.35, iou=0.25, stream=True)
    
    for r in results_custom:
        boxes = r.boxes
        for box in boxes:
            # 1. Get the Box from Custom Model
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # 2. Crop the image to look inside the box
            h, w, _ = frame.shape
            y1_c, y2_c = max(0, y1), min(h, y2)
            x1_c, x2_c = max(0, x1), min(w, x2)
            chair_crop = frame[y1_c:y2_c, x1_c:x2_c]

            # 3. Ask the Standard Brain: "Is there a person in this crop?"
            has_human = False
            if chair_crop.size > 0:
                # Scan for Class 0 (Person) with 40% confidence
                human_results = model_human(chair_crop, verbose=False, conf=0.40)
                for h_r in human_results:
                    for h_box in h_r.boxes:
                        if int(h_box.cls[0]) == 0: 
                            has_human = True
                            break
            
            # 4. Final Decision
            if has_human:
                color = (0, 0, 255) # Red
                status = "OCCUPIED"
            else:
                color = (0, 255, 0) # Green
                status = "EMPTY"

            # Draw clean box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, status, (x1, y1 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    cv2.imshow('Seat Detection System', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()