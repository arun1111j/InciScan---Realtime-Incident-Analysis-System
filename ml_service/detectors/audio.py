import time
import requests
import csv
import io
import pyaudio
import numpy as np
from .base_detector import BaseDetector

try:
    import tensorflow as tf
    import tensorflow_hub as hub
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("Warning: TensorFlow not found. Audio Detection will be disabled.")

class AudioDetector(BaseDetector):
    def __init__(self):
        super().__init__()
        self.backend_url = "http://localhost:5000/api/incidents"
        
        if not TF_AVAILABLE:
            print("AudioDetector: TensorFlow dependencies missing. Please install 'tensorflow-cpu' and 'tensorflow_hub'.")
            return

        # YAMNet Model
        print("Loading YAMNet Model...")
        try:
            self.model = hub.load('https://tfhub.dev/google/yamnet/1')
            self.class_map_path = self.model.class_map_path().numpy().decode('utf-8')
            self.class_names = self.load_class_names(self.class_map_path)
            print("YAMNet Loaded.")
        except Exception as e:
            print(f"Failed to load YAMNet: {e}")
            self.model = None

        # Audio Config
        self.sample_rate = 16000
        self.chunk_size = 16000 * 1  # 1 second chunks (YAMNet native is 0.975s)
        self.format = pyaudio.paInt16
        self.channels = 1
        
        # Target Classes (Indices will be looked up)
        self.target_keywords = ["Gunshot", "Scream", "Explosion", "Glass", "Alarm"]
        self.target_indices = [i for i, name in enumerate(self.class_names) if any(k in name for k in self.target_keywords)]

    def load_class_names(self, csv_path):
        with tf.io.gfile.GFile(csv_path) as csvfile:
            reader = csv.DictReader(csvfile)
            return [row['display_name'] for row in reader]

    def process_stream(self, source):
        if not TF_AVAILABLE or not hasattr(self, 'model') or self.model is None:
            print("Audio detection unavailable due to missing dependencies or model load failure.")
            return

        if source == "0":
            self.listen_to_mic()
        else:
            print("File analysis not supported in this simplified YAMNet implementation yet.")

    def listen_to_mic(self):
        p = pyaudio.PyAudio()
        stream = p.open(format=self.format,
                        channels=self.channels,
                        rate=self.sample_rate,
                        input=True,
                        frames_per_buffer=self.chunk_size)

        print(f"Listening for Sound Events: {self.target_keywords}...")

        try:
            while True:
                data = stream.read(self.chunk_size, exception_on_overflow=False)
                # Convert to numpy array (-1.0 to 1.0)
                waveform = np.frombuffer(data, dtype=np.int16) / 32768.0
                
                # Run Inference
                scores, embeddings, spectrogram = self.model(waveform)
                
                # Get Top Prediction
                mean_scores = np.mean(scores, axis=0)
                top_class_index = np.argmax(mean_scores)
                top_score = mean_scores[top_class_index]
                label = self.class_names[top_class_index]

                # Check if it's a target class
                if top_score > 0.3: # Threshold
                    # print(f"Detected: {label} ({top_score:.2f})")
                     if any(k in label for k in self.target_keywords):
                        print(f"CRITICAL SOUND DETECTED: {label} ({top_score:.2f})")
                        self.send_alert(label, top_score)
                
                # Small sleep if needed, though read() blocks
                
        except Exception as e:
            print(f"Audio processing error: {e}")
        finally:
            stream.stop_stream()
            stream.close()
            p.terminate()

    def send_alert(self, label, confidence):
        payload = {
            "type": "Dangerous Sound",
            "description": f"Detected sound: {label}",
            "latitude": 40.7128,
            "longitude": -74.006,
            "confidence": float(confidence),
            "severity": "critical",
            "status": "verified"
        }
        try:
            requests.post(self.backend_url, json=payload)
        except Exception as e:
            pass # print(f"Failed to send alert: {e}")

    def cleanup(self):
        pass
