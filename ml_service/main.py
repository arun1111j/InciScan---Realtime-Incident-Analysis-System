from fastapi import FastAPI, BackgroundTasks, File, UploadFile
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import cv2
import threading
import time
import shutil
from pathlib import Path

# Import Detectors
from detectors.crowd import CrowdDetector
from detectors.violence import ViolenceDetector
from detectors.suspicious import SuspiciousDetector
from detectors.audio import AudioDetector
from video_analyzer import VideoAnalyzer

app = FastAPI()

# CORS config to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Detectors
detectors = {
    "crowd": CrowdDetector(),
    "violence": ViolenceDetector(),
    "suspicious": SuspiciousDetector(),
    "audio": AudioDetector()
}

# Initialize Video Analyzer
video_analyzer = VideoAnalyzer()

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
            annotated_frame, detections = stream_state.active_detector.detect(frame)
            if len(detections) > 0:
                print(f"[ML Debug] Detections found: {len(detections)}")
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
        stream_state.active_detector = detectors.get(type.lower())
        stream_state.is_running = True
    print(f"[ML Service] Feed Started. Type: {type}, Detector: {stream_state.active_detector}")
    return {"status": "Feed Started", "source": source, "type": type}

@app.post("/stop_feed")
def stop_feed():
    """Stops the video feed generation."""
    with stream_state.lock:
        stream_state.is_running = False
    return {"status": "Feed Stopped"}

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
