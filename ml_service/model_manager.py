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
            
        print("Loading Shared YOLO Models...")
        # Standard Model
        self.yolo_model = YOLO("yolov8n.pt")
        
        # Specialized Violence Model (Optional)
        try:
            self.violence_model = YOLO("violence.pt")
            self.has_violence_model = True
            print("Loaded Custom Violence Model (violence.pt)")
        except:
            self.violence_model = None
            self.has_violence_model = False
            print("Custom 'violence.pt' not found. Will use fallback logic.")
            
        self._initialized = True
    
    def get_yolo_model(self):
        return self.yolo_model
        
    def get_violence_model(self):
        return self.violence_model
        
    def has_violence(self):
        return self.has_violence_model
