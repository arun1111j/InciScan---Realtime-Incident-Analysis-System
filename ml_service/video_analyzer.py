import cv2
import numpy as np
from ultralytics import YOLO
from pathlib import Path
import json
from model_manager import ModelManager

class VideoAnalyzer:
    def __init__(self):
        """Initialize ML models for video analysis using Shared Manager"""
        manager = ModelManager()
        self.yolo_model = manager.get_yolo_model()
        self.violence_model = manager.get_violence_model() if manager.has_violence() else None
        self.has_violence_model = manager.has_violence()
            
        self.weapon_classes = [43, 34]  # knife, bat
        self.frame_skip = 3 # Analyze every 3rd frame for speed
        
    def analyze_video(self, video_path: str, output_path: str) -> dict:
        """
        Analyze video for incidents and return annotated video + report
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError("Could not open video file")
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Setup video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        detections = []
        frame_number = 0
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break
                
            frame_number += 1
            annotated_frame = frame.copy()
            
            # Skip frames for analysis but WRITE them to output video to keep sync
            # OR write only analyzed frames? Better to write all frames for smooth playback,
            # but only annotate the analyzed ones (propagate previous annotation? or just skip annotation on skipped frames?)
            # Let's run analysis only on specific frames
            
            should_analyze = (frame_number % self.frame_skip == 0)
            
            if should_analyze:
                # Run YOLO detection for people (crowd detection)
                results = self.yolo_model(frame, classes=[0], verbose=False)
                person_count = len(results[0].boxes)
                
                # Draw bounding boxes for people
                for box in results[0].boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(annotated_frame, 'Person', (x1, y1-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                # Check for crowds
                if person_count > 10:
                    detections.append({
                        'type': 'Crowd Density',
                        'frame': frame_number,
                        'timestamp': f"{frame_number/fps:.2f}s",
                        'description': f'High crowd density detected: {person_count} people',
                        'confidence': 0.9
                    })
                    cv2.putText(annotated_frame, f'CROWD: {person_count} people', 
                               (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                
                # Check for weapons
                weapon_results = self.yolo_model(frame, classes=self.weapon_classes, verbose=False)
                if len(weapon_results[0].boxes) > 0:
                    for box in weapon_results[0].boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                        cv2.putText(annotated_frame, f'WEAPON ({conf:.2f})', (x1, y1-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                        
                        detections.append({
                            'type': 'Weapon Detected',
                            'frame': frame_number,
                            'timestamp': f"{frame_number/fps:.2f}s",
                            'description': f'Weapon detected with {conf:.2f} confidence',
                            'confidence': conf
                        })
                        cv2.putText(annotated_frame, 'WEAPON ALERT', 
                                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                
                # Check for violence (if model available)
                if self.has_violence_model:
                    violence_results = self.violence_model(frame, verbose=False)
                    for r in violence_results:
                        for box in r.boxes:
                            cls_id = int(box.cls[0])
                            conf = float(box.conf[0])
                            label = self.violence_model.names[cls_id]
                            
                            if label.lower() in ['violence', 'fight'] and conf > 0.6:
                                x1, y1, x2, y2 = map(int, box.xyxy[0])
                                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 0, 0), 3)
                                cv2.putText(annotated_frame, f'VIOLENCE ({conf:.2f})', (x1, y1-10), 
                                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
                                
                                detections.append({
                                    'type': 'Violence',
                                    'frame': frame_number,
                                    'timestamp': f"{frame_number/fps:.2f}s",
                                    'description': f'Violent altercation detected: {label}',
                                    'confidence': conf
                                })
            
            # Write annotated frame (even if skipped analysis, strict sync)
            out.write(annotated_frame)
        
        cap.release()
        out.release()
        
        return {
            'total_frames': total_frames,
            'detections': detections,
            'output_video': output_path
        }
