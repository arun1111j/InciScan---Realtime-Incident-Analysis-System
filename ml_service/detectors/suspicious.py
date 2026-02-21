from ultralytics import YOLO
import cv2
import time
import requests
from .base_detector import BaseDetector
from model_manager import ModelManager

class SuspiciousDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        # Use Shared Model Manager
        self.model = ModelManager().get_yolo_model() 
        self.backend_url = "http://localhost:5000/api/incidents"
        self.track_history = {} # track_id -> {start_time, last_seen_time, alerted}
        self.loitering_threshold = 10 # seconds
        self.cleanup_interval = 60 # seconds
        self.last_cleanup = time.time()
        self.frame_skip = 3 # Process every 3rd frame (needs to be frequent enough for tracking)
        self.location = {"latitude": 40.7128, "longitude": -74.006} # Default

    def set_location(self, lat, lng):
        self.location["latitude"] = lat
        self.location["longitude"] = lng
        
    def cleanup_old_tracks(self):
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            # Remove tracks not seen in last 30 seconds
            stale_ids = [tid for tid, data in self.track_history.items() 
                         if current_time - data["last_seen_time"] > 30]
            
            for tid in stale_ids:
                del self.track_history[tid]
                
            self.last_cleanup = current_time
            # print(f"Cleaned up {len(stale_ids)} stale tracks.")

    def detect(self, frame):
        """
        Analyze a single frame for suspicious activity (loitering).
        Returns: annotated_frame, detections list
        """
        annotated_frame = frame.copy()
        detections = []
        
        # Run YOLOv8 Tracking
        results = self.model.track(frame, classes=[0], persist=True, verbose=False)

        if results and results[0].boxes.id is not None:
            track_ids = results[0].boxes.id.int().cpu().tolist()
            current_time = time.time()

            for i, track_id in enumerate(track_ids):
                # Draw box
                box = results[0].boxes[i]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                if track_id not in self.track_history:
                    self.track_history[track_id] = {
                        "start_time": current_time,
                        "last_seen_time": current_time,
                        "alerted": False
                    }
                else:
                    self.track_history[track_id]["last_seen_time"] = current_time
                    
                duration = current_time - self.track_history[track_id]["start_time"]
                is_suspicious = duration > self.loitering_threshold
                
                color = (0, 0, 255) if is_suspicious else (0, 255, 255)
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated_frame, f'ID:{track_id} ({int(duration)}s)', (x1, y1-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                if is_suspicious and not self.track_history[track_id]["alerted"]:
                    detections.append({
                        "type": "Suspicious Activity",
                        "description": f"Person (ID: {track_id}) loitering for {int(duration)} seconds",
                        "confidence": 0.85,
                        "severity": "medium"
                    })
                    self.send_alert(track_id, duration)
                    self.track_history[track_id]["alerted"] = True
        
        self.cleanup_old_tracks()
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
                if frame_count % self.frame_skip != 0:
                    continue

                # Use detect method
                self.detect(frame)

            cap.release()
        except Exception as e:
            print(f"Error in SuspiciousDetector stream: {e}")
        finally:
            cv2.destroyAllWindows()

    def send_alert(self, track_id, duration):
        payload = {
            "type": "Suspicious Activity",
            "description": f"Person (ID: {track_id}) loitering for {int(duration)} seconds",
            "latitude": self.location["latitude"],
            "longitude": self.location["longitude"],
            "confidence": 0.85,
            "severity": "medium",
            "status": "pending"
        }
        try:
            requests.post(self.backend_url, json=payload)
        except Exception as e:
            print(f"Failed to send alert: {e}")

    def cleanup(self):
        pass

    def cleanup(self):
        pass
