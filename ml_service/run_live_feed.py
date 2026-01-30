import sys
import time
from detectors.crowd import CrowdDetector
from detectors.violence import ViolenceDetector
from detectors.suspicious import SuspiciousDetector

def print_menu():
    print("\n--- InciScan Live Feed ---")
    print("1. Crowd Detection")
    print("2. Violence Detection")
    print("3. Suspicious Activity Detection")
    print("0. Exit")

def main():
    print("Welcome to InciScan Live Feed Connect.")
    print("You can connect to:")
    print("1. Phone Camera (enter URL like http://192.168.1.5:8080/video)")
    print("2. Stored Video File (enter full path like C:/videos/test.mp4)")
    print("3. Laptop Webcam (enter '0')")
    
    url = input("\nEnter Source (URL, File Path, or '0'): ").strip()
    
    if not url:
        print("Invalid URL. Exiting.")
        return

    while True:
        print_menu()
        choice = input("Select Detector to run: ")
        
        detector = None
        
        if choice == '1':
            detector = CrowdDetector()
            print(f"\nStarting Crowd Detection on {url}...")
        elif choice == '2':
            detector = ViolenceDetector()
            print(f"\nStarting Violence Detection on {url}...")
        elif choice == '3':
            detector = SuspiciousDetector()
            print(f"\nStarting Suspicious Activity Detection on {url}...")
        elif choice == '0':
            print("Exiting...")
            break
        else:
            print("Invalid choice.")
            continue
            
        if detector:
            try:
                print("Press Ctrl+C to stop detection and return to menu.")
                detector.process_stream(url)
            except KeyboardInterrupt:
                print("\nStopping detector...")
            except Exception as e:
                print(f"Error: {e}")
            finally:
                # Cleanup if needed
                pass

if __name__ == "__main__":
    main()
