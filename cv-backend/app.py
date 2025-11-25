import gradio as gr
import cv2
import numpy as np
from ultralytics import YOLO
import pandas as pd
import time
import os
from datetime import datetime

# --- LOAD THE NEW BRAIN ---
model = YOLO('best.pt')

# --- MEMORY SYSTEM ---
state = {
    "status": "EMPTY",
    "start_time": time.time(),
    "history_file": "seat_history.csv"
}

# Create CSV if it doesn't exist
if not os.path.exists(state["history_file"]):
    pd.DataFrame(columns=['Timestamp', 'Event', 'Duration']).to_csv(state["history_file"], index=False)

def log_event(event, duration):
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        if duration > 60:
            dur_str = f"{int(duration // 60)}m {int(duration % 60)}s"
        else:
            dur_str = f"{int(duration)}s"
        new_row = pd.DataFrame([{'Timestamp': timestamp, 'Event': event, 'Duration': dur_str}])
        new_row.to_csv(state["history_file"], mode='a', header=False, index=False)
    except:
        pass

def predict(frame):
    if frame is None:
        return None, state["history_file"]
        
    try:
        # 1. Resize for Cloud Speed (320p)
        h, w, _ = frame.shape
        if w > 320:
            scale = 320 / w
            new_w, new_h = 320, int(h * scale)
            frame = cv2.resize(frame, (new_w, new_h))
        
        # Update dimensions
        h, w, _ = frame.shape
        total_area = h * w

        # 2. Run AI
        # conf=0.35: Stricter to avoid ghosts
        results = model(frame, conf=0.35, iou=0.50)
        
        human_detected_now = False
        
        # 3. Draw Boxes & Check Status
        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # Filter Giant Boxes (Wall Glitch)
                box_area = (x2 - x1) * (y2 - y1)
                if box_area > (total_area * 0.70):
                    continue

                # Check Class
                cls = int(box.cls[0])
                class_name = model.names[cls]
                
                # Color Logic
                if "empty" not in class_name.lower():
                    human_detected_now = True
                    color = (0, 0, 255) # Red
                    box_label = "OCCUPIED"
                else:
                    color = (0, 255, 0) # Green
                    box_label = "EMPTY"

                # Draw Box
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                
                # Add Time to the Box Label
                # Calculate live duration for this specific status
                live_duration = int(time.time() - state["start_time"])
                label_text = f"{box_label} {live_duration}s"
                
                cv2.putText(frame, label_text, (x1, y1 - 5), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # --- 4. UPDATE GLOBAL STATUS ---
        current_time = time.time()
        
        # Simple Logic: If we see a human, it's Occupied. If not, it's Empty.
        new_status = "OCCUPIED" if human_detected_now else "EMPTY"
        
        # If status CHANGED, reset timer and log it
        if new_status != state["status"]:
            # Log the OLD status duration
            duration = current_time - state["start_time"]
            log_event(state["status"], duration)
            
            # Reset for NEW status
            state["status"] = new_status
            state["start_time"] = current_time
            
        # --- 5. DRAW TOP BANNER ---
        color_bg = (0, 0, 255) if state["status"] == "OCCUPIED" else (0, 255, 0)
        cv2.rectangle(frame, (0, 0), (w, 40), color_bg, -1)
        
        banner_duration = int(current_time - state["start_time"])
        status_text = f"STATUS: {state['status']} ({banner_duration}s)"
        
        cv2.putText(frame, status_text, (10, 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                            
        return frame, state["history_file"]
        
    except Exception as e:
        print(e)
        return frame, state["history_file"]

# --- LAUNCH ---
demo = gr.Interface(
    fn=predict,
    inputs=gr.Image(sources=["webcam"], streaming=True, type="numpy"),
    outputs=[
        gr.Image(label="Live Monitor"), 
        gr.File(label="Download History Log")
    ],
    live=True,
    title="Seat Monitoring System (Final)",
    description="Real-time Detection with Duration Timer."
)

if __name__ == "__main__":
    demo.queue().launch()