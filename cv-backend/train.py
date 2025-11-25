from ultralytics import YOLO

if __name__ == '__main__':
    # 1. Load the Standard Brain (Starting Fresh)
    # We use 'yolov8n.pt' because we want to learn the NEW 7,000 images from scratch.
    # If we used 'best.pt', it might be confused by the sudden change in data size.
    model = YOLO('yolov8n.pt') 

    print("--- STARTING AUGMENTED RUN ---")
    print("Dataset Size: ~6,400 Images")
    print("Expected Runtime: ~8 Hours")
    print("Go back to sleep!")
    
    # 2. The Settings
    # epochs=20: We have 3x data, so 20 laps is huge (equivalent to 60 old laps).
    # imgsz=320: Keeps it fast so your laptop survives.
    # patience=5: If accuracy stops going up, it quits early to save time.
    
    model.train(data='data/data.yaml', epochs=30, imgsz=320, patience=5)
    
    print("TRAINING FINISHED!")