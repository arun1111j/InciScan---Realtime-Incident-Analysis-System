import cv2
import time
import requests
import numpy as np
from .base_detector import BaseDetector
from model_manager import ModelManager

class ViolenceDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        self.backend_url = "http://127.0.0.1:5000/api/incidents"
        
        # Use Shared Model Manager
        manager = ModelManager()
        self.model = manager.get_yolo_model()
        self.specialized_model = manager.has_violence()
        
        if self.specialized_model:
            self.violence_model = manager.get_violence_model()
            print("ViolenceDetector: Using specialized violence model.")
        else:
            print("ViolenceDetector: Using standard YOLOv8n + Weapon Detection fallback.")
             
        # COCO Classes: 43: knife, 34: baseball bat, 76: scissors
        self.weapon_classes = [43, 34] 
        self.frame_skip = 3 # Process every 3rd frame
        self.location = {"latitude": 40.7128, "longitude": -74.006} # Default

    def set_location(self, lat, lng):
        self.location["latitude"] = lat
        self.location["longitude"] = lng

    def detect(self, frame):
        """
        Analyze a single frame for violence/weapons.
        Returns: annotated_frame, detections list
        """
        annotated_frame = frame.copy()
        detections = []
        
        # Add Detector Identity Overlay
        cv2.putText(annotated_frame, "VIOLENCE DETECTOR ACTIVE", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # Run Inference
        if self.specialized_model:
            results = self.violence_model(frame, conf=0.25, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    label = self.violence_model.names[cls_id]
                    
                    if label.lower() in ['violence', 'fight'] and conf > 0.6:
                        print(f"FIGHT DETECTED: {label} ({conf:.2f})")
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 0), 3)
                        cv2.putText(annotated_frame, f'VIOLENCE ({conf:.2f})', (x1, y1-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
                        
                        detections.append({
                            "type": "Violence",
                            "description": f"Violent altercation detected: {label}",
                            "confidence": conf,
                            "severity": "critical"
                        })
                        self.send_alert("Violent Altercation", f"Model detected {label}")
        else:
            # Fallback Standard Logic (Weapon Detection)
            results = self.model(frame, classes=[0] + self.weapon_classes, verbose=False)
            
            if len(results) > 0:
                for box in results[0].boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    
                    if cls_id in self.weapon_classes:
                        print(f"Weapon Detected! Class ID: {cls_id}")
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                        cv2.putText(annotated_frame, f'WEAPON ({conf:.2f})', (x1, y1-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                        
                        detections.append({
                            "type": "Weapon Detected",
                            "description": "High probability of violence: Weapon sighted",
                            "confidence": conf,
                            "severity": "critical"
                        })
                        self.send_alert("Weapon Detected", "High probability of violence: Weapon sighted")
        
        return annotated_frame, detections

    def process_stream(self, source):
        try:
            cap_source = 0 if source == "0" else source
            cap = cv2.VideoCapture(cap_source)
            if not cap.isOpened():
                print(f"Error: Could not open video source {source}")
                return

            frame_count = 0
            
            while cap.isOpened():
                success, frame = cap.read()
                if not success:
                    break
                
                frame_count += 1
                
                # Frame Skipping
                if frame_count % self.frame_skip != 0:
                    continue

                # Use detect method
                _, _ = self.detect(frame)
                # time.sleep(0.1) # Removed sleep, using frame skipping

            cap.release()
        except Exception as e:
            print(f"Error in ViolenceDetector: {e}")
        finally:
            cv2.destroyAllWindows()

    def send_alert(self, type_label, description):
        payload = {
            "type": "Violence",
            "description": description,
            "latitude": self.location["latitude"],
            "longitude": self.location["longitude"],
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
