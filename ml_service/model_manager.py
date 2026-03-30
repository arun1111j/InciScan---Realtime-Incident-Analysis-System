from ultralytics import YOLO
import threading

class ModelManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ModelManager, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.yolo_model = None
        self.violence_model = None
        self.has_violence_model = False
        self.load_lock = threading.Lock()
        self._initialized = True
    
    def get_yolo_model(self):
        if self.yolo_model is None:
            with self.load_lock:
                if self.yolo_model is None:
                    print("🧠 Loading Shared YOLO Model (yolov8n.pt)...")
                    try:
                        self.yolo_model = YOLO("yolov8n.pt")
                        print("✅ Shared YOLO Model Loaded")
                    except Exception as e:
                        print(f"❌ Failed to load YOLO model: {e}")
        return self.yolo_model
        
    def get_violence_model(self):
        if self.violence_model is None:
            with self.load_lock:
                if self.violence_model is None:
                    print("🧠 Loading Custom Violence Model (violence.pt)...")
                    try:
                        self.violence_model = YOLO("violence.pt")
                        self.has_violence_model = True
                        print("✅ Custom Violence Model Loaded")
                    except Exception as e:
                        self.has_violence_model = False
                        print(f"⚠️ Custom 'violence.pt' not found or failed to load: {e}")
        return self.violence_model
        
    def has_violence(self):
        return self.has_violence_model
