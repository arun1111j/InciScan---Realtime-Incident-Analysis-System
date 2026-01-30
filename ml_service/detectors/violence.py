import cv2
import time
import requests
import numpy as np
from ultralytics import YOLO
from .base_detector import BaseDetector

class ViolenceDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        self.backend_url = "http://localhost:5000/api/incidents"
        
        # NOTE: Ideally use a model trained on "Real Life Violence" dataset
        # If user downloads 'violence.pt', we use it. Otherwise fallback to standard YOLOv8n
        # and checking for aggressive weapons (Knife, Bat, etc.)
        try:
             # Attempt to load specialized model
             # User should put 'violence.pt' in the root or detectors folder
             self.model = YOLO("violence.pt")
             self.specialized_model = True
             print("Loaded Custom Violence Model (violence.pt)")
        except:
             print("Custom 'violence.pt' not found. Falling back to standard YOLOv8n + Weapon Detection.")
             self.model = YOLO("yolov8n.pt") 
             self.specialized_model = False
             
        # COCO Classes: 43: knife, 34: baseball bat, 76: scissors
        self.weapon_classes = [43, 34] 

    def process_stream(self, source):
        try:
            cap_source = 0 if source == "0" else source
            cap = cv2.VideoCapture(cap_source)
            
            while cap.isOpened():
                success, frame = cap.read()
                if not success:
                    break

                # Run Inference
                # If specialized, it likely has 2 classes: 0: Non-Violence, 1: Violence
                # If standard, we check for weapons
                if self.specialized_model:
                    results = self.model(frame, verbose=False)
                    # Assuming 'violence' is class 1 (or by name)
                    for r in results:
                        for box in r.boxes:
                            cls_id = int(box.cls[0])
                            conf = float(box.conf[0])
                            label = self.model.names[cls_id]
                            
                            if label.lower() in ['violence', 'fight'] and conf > 0.6:
                                print(f"FIGHT DETECTED: {label} ({conf:.2f})")
                                self.send_alert("Violent Altercation", f"Model detected {label}")
                else:
                    # Fallback Standard Logic
                    results = self.model(frame, classes=[0] + self.weapon_classes, verbose=False)
                    detected_config = results[0].boxes.cls.cpu().tolist()
                    weapons_found = [cls_id for cls_id in detected_config if cls_id in self.weapon_classes]

                    if weapons_found:
                        print(f"Weapon Detected! Class IDs: {weapons_found}")
                        self.send_alert("Weapon Detected", "High probability of violence: Weapon sighted")

                time.sleep(0.1) 

            cap.release()
        except Exception as e:
            print(f"Error in ViolenceDetector: {e}")
        finally:
            cv2.destroyAllWindows()

    def send_alert(self, type_label, description):
        payload = {
            "type": "Violence",
            "description": description,
            "latitude": 40.7128,
            "longitude": -74.006,
            "confidence": 0.85, # Simplification
            "severity": "critical",
            "status": "verified"
        }
        try:
             # Basic debounce could go here
            requests.post(self.backend_url, json=payload)
        except Exception as e:
            pass # print(f"Failed to send alert: {e}")

    def cleanup(self):
        pass
