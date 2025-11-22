from ultralytics import YOLO

if __name__ == '__main__':
    # 1. Load the "Nano" model (smallest and fastest)
    print("Loading base model...")
    model = YOLO('yolov8n.pt') 

    # 2. Train the model
    # data: points to the yaml file you just extracted
    # epochs: number of times it studies the data (15 is enough for a demo)
    # imgsz: size of the images
    print("Starting training...")
    model.train(data='data/data.yaml', epochs=15, imgsz=320)
    
    print("TRAINING FINISHED!")
    print("Your new model is saved in: runs/detect/train/weights/best.pt")