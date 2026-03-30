import cv2
import time
import requests
from .base_detector import BaseDetector
from model_manager import ModelManager

class CrowdDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        # Use Shared Model Manager
        self.model = ModelManager().get_yolo_model()
        self.backend_url = "http://127.0.0.1:5000/api/incidents" # Node.js Backend
        self.frame_skip = 5 # Process every 5th frame
        self.location = {"latitude": 40.7128, "longitude": -74.006} # Default

    def set_location(self, lat, lng):
        self.location["latitude"] = lat
        self.location["longitude"] = lng

    def detect(self, frame):
        """
        Analyze a single frame for crowds.
        Returns: annotated_frame, detections list
        """
        annotated_frame = frame.copy()
        detections = []
        
        # Add Detector Identity Overlay
        cv2.putText(annotated_frame, "CROWD DETECTOR ACTIVE", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Run YOLOv8 inference on the frame
        results = self.model(frame, classes=[0], conf=0.25, verbose=False) 
        
        # print(f"[CrowdDetector] Frame shape: {frame.shape}, Detections: {len(results[0].boxes)}")

        for r in results:
            # Count people
            person_count = len(r.boxes)
            
            # Draw bounding boxes
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(annotated_frame, 'Person', (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            # Simple Logic: If > 10 people -> Crowd Incident
            if person_count > 10:
                print(f"High Density Detected: {person_count} people")
                label = f"CROWD: {person_count} people"
                cv2.putText(annotated_frame, label, (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                
                detections.append({
                    "type": "Crowd Density",
                    "description": f"High crowd density detected: {person_count} people",
                    "confidence": 0.9,
                    "severity": "high" if person_count > 20 else "medium"
                })
                # Send alert (with debounce logic ideally, but for now just send)
                self.send_alert(person_count)
                
        return annotated_frame, detections

    def process_stream(self, source):
        # Handle webcam (0) or video file/url
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
                
                # Frame Skipping Logic
                if frame_count % self.frame_skip != 0:
                    continue

                # Use the new detect method
                _, _ = self.detect(frame)
            cap.release()
        except Exception as e:
            print(f"Error in CrowdDetector: {e}")
        finally:
            cv2.destroyAllWindows()

    def send_alert(self, count):
        payload = {
            "type": "Crowd Density",
            "description": f"High crowd density detected: {count} people",
            "latitude": self.location["latitude"],
            "longitude": self.location["longitude"],
            "confidence": 0.9,
            "severity": "high" if count > 20 else "medium",
            "status": "verified"
        }
        try:
            requests.post(self.backend_url, json=payload)
        except Exception as e:
            print(f"Failed to send alert: {e}")

    def cleanup(self):
        pass
