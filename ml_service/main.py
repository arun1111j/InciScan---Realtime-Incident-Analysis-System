from fastapi import FastAPI, BackgroundTasks, File, UploadFile
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import cv2
import numpy as np
import threading
import time
import shutil
from pathlib import Path
import base64
import io

# Import Detectors
from detectors.crowd import CrowdDetector
from detectors.violence import ViolenceDetector
from detectors.suspicious import SuspiciousDetector
from detectors.audio import AudioDetector
from video_analyzer import VideoAnalyzer
import os

app = FastAPI()

# CORS config to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Video Analyzer
video_analyzer = VideoAnalyzer()

class MonitorDetector:
    def __init__(self, visual_detectors):
        self.detectors = visual_detectors

    def detect(self, frame):
        all_detections = []
        annotated_frame = frame.copy()
        for name, detector in self.detectors.items():
            try:
                annotated_frame, dets = detector.detect(annotated_frame)
                all_detections.extend(dets)
            except Exception as e:
                print(f"Error in {name} detector inside Monitor: {e}")
        return annotated_frame, all_detections

# Lazy Detector Registry
# Detectors will be initialized only when requested
_detectors_cache = {}
_detectors_lock = threading.Lock()

def get_detector(detector_type: str):
    """Lazy-loads and returns a specific detector."""
    detector_type = detector_type.lower()
    
    with _detectors_lock:
        if detector_type in _detectors_cache:
            return _detectors_cache[detector_type]
        
        print(f"🔍 Initializing {detector_type} detector...")
        detector = None
        
        try:
            if detector_type == "crowd":
                detector = CrowdDetector()
            elif detector_type == "violence":
                detector = ViolenceDetector()
            elif detector_type == "suspicious":
                detector = SuspiciousDetector()
            elif detector_type == "audio":
                # Check if disabled by env var
                if os.getenv("DISABLE_AUDIO_DETECTION", "false").lower() == "true":
                    print("⏭️  Audio Detector DISABLED (Lean Mode)")
                    return None
                detector = AudioDetector()
            elif detector_type == "monitor":
                # Monitor needs individual visual detectors
                vis_detectors = {
                    "crowd": get_detector("crowd"),
                    "violence": get_detector("violence"),
                    "suspicious": get_detector("suspicious")
                }
                detector = MonitorDetector({k: v for k, v in vis_detectors.items() if v is not None})
            
            if detector:
                print(f"✅ {detector_type.capitalize()} detector loaded successfully")
                _detectors_cache[detector_type] = detector
            else:
                print(f"⚠️ {detector_type} detector returned None")
                
        except Exception as e:
            print(f"❌ Failed to load {detector_type} detector: {e}")
            
        return detector

# Setup directories for video processing
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# Mount static files for serving processed videos
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# Global state for streaming
class StreamState:
    def __init__(self):
        self.active_detector = None
        self.source = None
        self.is_running = False
        self.session_detections = []
        self.snapshot_url = None
        self.lock = threading.Lock()

stream_state = StreamState()

def generate_frames():
    """Generator that yields MJPEG frames from the active detector."""
    # Use standard VideoCapture
    # Wait until running
    while not stream_state.is_running:
        time.sleep(0.1)

    cap = cv2.VideoCapture(0 if stream_state.source == "0" else stream_state.source)
    
    if not cap.isOpened():
        print("Error: Could not open video source.")
        return

    while stream_state.is_running:
        success, frame = cap.read()
        if not success:
            break
            
        # Run active detector logic
        annotated_frame = frame
        if stream_state.active_detector:
            try:
                annotated_frame, detections = stream_state.active_detector.detect(frame)
            except Exception as e:
                print(f"Error during detection frame processing: {e}")
                detections = []
                
            if len(detections) > 0:
                print(f"[ML Debug] Detections found: {len(detections)}")
                current_time = time.strftime("%Y-%m-%d %H:%M:%S")
                
                # Save snapshot for the first or latest detection in this session
                try:
                    snapshot_filename = "session_snapshot.jpg"
                    snapshot_path = OUTPUT_DIR / snapshot_filename
                    # Resize to reduce PDF processing load
                    resized_frame = cv2.resize(annotated_frame, (640, 480))
                    cv2.imwrite(str(snapshot_path), resized_frame)
                except Exception as e:
                    print(f"Failed to save snapshot: {e}")

                with stream_state.lock:
                    stream_state.snapshot_url = f"http://localhost:8000/outputs/{snapshot_filename}?t={int(time.time())}"
                    for d in detections:
                        d['timestamp'] = current_time
                    stream_state.session_detections.extend(detections)
        else:
            # Fallback drawing to show pipeline is alive
            cv2.putText(annotated_frame, "NO ACTIVE DETECTOR", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
               
    cap.release()
    print("Camera released.")

@app.get("/")
def read_root():
    return {"status": "ML Service Running"}

@app.post("/start_feed")
def start_feed(source: str = "0", type: str = "crowd"):
    """Starts the video feed generation."""
    with stream_state.lock:
        stream_state.source = source
        stream_state.active_detector = get_detector(type)
        stream_state.is_running = True
        stream_state.session_detections = []  # Clear previous session
        stream_state.snapshot_url = None
    print(f"[ML Service] Feed Started. Type: {type}")
    return {"status": "Feed Started", "source": source, "type": type}

@app.post("/stop_feed")
def stop_feed():
    """Stops the video feed generation."""
    with stream_state.lock:
        stream_state.is_running = False
    return {"status": "Feed Stopped"}

@app.get("/session_report")
def session_report():
    """Returns the detections collected during the current/last live feed session."""
    with stream_state.lock:
        # Return a copy to avoid mutation issues during serialization
        return {
            "detections": list(stream_state.session_detections),
            "snapshot_url": stream_state.snapshot_url
        }

@app.post("/analyze_frame")
async def analyze_frame(image: UploadFile = File(...)):
    """
    Analyze a single frame from the user's webcam.
    Returns the annotated frame (base64) and detection list.
    """
    try:
        # Read image
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"error": "Invalid image data"}

        # Run active detector logic
        annotated_frame = frame.copy()
        detections = []
        
        # Ensure we have a detector for analyze_frame (default to monitor or crowd if none active)
        if not stream_state.active_detector:
            stream_state.active_detector = get_detector("monitor")
        
        if stream_state.active_detector:
            try:
                annotated_frame, detections = stream_state.active_detector.detect(frame)
                
                # Update session detections for reporting
                if len(detections) > 0:
                    current_time = time.strftime("%Y-%m-%d %H:%M:%S")
                    with stream_state.lock:
                        for d in detections:
                            d['timestamp'] = current_time
                        stream_state.session_detections.extend(detections)
            except Exception as e:
                print(f"Error during single frame detection: {e}")

        # Encode annotated frame to Base64
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        base64_image = base64.b64encode(buffer).decode('utf-8')

        return {
            "success": True,
            "detections": detections,
            "annotated_image": f"data:image/jpeg;base64,{base64_image}"
        }
    except Exception as e:
        print(f"Analyze frame error: {e}")
        return {"error": str(e), "detections": []}

@app.get("/video_feed")
def video_feed():
    """
    Returns the MJPEG stream.
    Url: http://localhost:8000/video_feed
    """
    if not stream_state.is_running:
         # If not running, maybe return a static image or 404? 
         # For now, let's just return 404 or a placeholder if possible, 
         # but normally browser handles broken image.
         # Let's try to auto-start if valid source exists, or just return.
         pass

    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/analyze_video")
async def analyze_video(video: UploadFile = File(...)):
    """
    Analyze an uploaded video file for incidents.
    Returns a JSON report and path to annotated video.
    """
    try:
        # Save uploaded file
        input_path = UPLOAD_DIR / video.filename
        output_filename = f"analyzed_{video.filename}"
        output_path = OUTPUT_DIR / output_filename
        
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        # Analyze video
        result = video_analyzer.analyze_video(str(input_path), str(output_path))
        
        # Add output video URL
        result['output_video'] = f"/outputs/{output_filename}"
        result['download_url'] = f"/download/{output_filename}"
        
        return result
    except Exception as e:
        return {"error": str(e), "detections": [], "total_frames": 0}

@app.get("/download/{filename}")
async def download_video(filename: str):
    """
    Download a processed video file with proper headers.
    Sets Content-Disposition to force download in browsers.
    """
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        return {"error": "File not found"}
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='video/mp4',
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
