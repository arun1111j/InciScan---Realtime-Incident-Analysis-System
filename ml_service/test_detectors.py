import requests
import time
import random

BACKEND_URL = "http://localhost:5000/api/incidents"

def send_incident(incident_type, description, severity, lat_offset=0.0, long_offset=0.0):
    latitude = 40.7128 + lat_offset
    longitude = -74.0060 + long_offset
    
    payload = {
        "type": incident_type,
        "description": description,
        "latitude": latitude,
        "longitude": longitude,
        "confidence": random.uniform(0.8, 0.99),
        "severity": severity,
        "status": "verified"
    }
    
    try:
        response = requests.post(BACKEND_URL, json=payload)
        if response.status_code == 200:
            print(f"[SUCCESS] Sent {incident_type}: {description} at ({latitude:.4f}, {longitude:.4f})")
        else:
            print(f"[ERROR] Failed to send incident. Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")

def main():
    print("Starting ML Detector Simulation...")
    print("Press Ctrl+C to stop.")
    
    try:
        while True:
            # Simulate Crowd
            send_incident(
                "Crowd Density", 
                "High crowd density detected at Central Plaza", 
                "medium",
                lat_offset=random.uniform(-0.005, 0.005),
                long_offset=random.uniform(-0.005, 0.005)
            )
            time.sleep(5)
            
            # Simulate Suspicious Activity
            if random.random() > 0.5:
                send_incident(
                    "Suspicious Activity", 
                    "Person loitering near restricted area", 
                    "high",
                    lat_offset=random.uniform(-0.005, 0.005),
                    long_offset=random.uniform(-0.005, 0.005)
                )
                time.sleep(3)
                
            # Simulate Violence (Rare)
            if random.random() > 0.8:
                send_incident(
                    "Violence", 
                    "Weapon detected in Sector 4", 
                    "critical",
                    lat_offset=random.uniform(-0.005, 0.005),
                    long_offset=random.uniform(-0.005, 0.005)
                )
                time.sleep(2)
                
            print("Waiting for next cycle...")
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\nSimulation stopped.")

if __name__ == "__main__":
    main()
