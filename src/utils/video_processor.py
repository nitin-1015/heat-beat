import cv2
import numpy as np
from .spo2_calculator import SpO2Calculator

class VideoProcessor:
    def __init__(self):
        self.spo2_calculator = SpO2Calculator()
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.frame_count = 0
        self.face_roi = None
        self.is_processing = False
        self.last_metrics = {
            'bpm': None,
            'spo2': None,
            'face_detected': False,
            'quality': 0.0
        }

    def process_frame(self, frame):
        """
        Process a single frame for both BPM and SpO2
        """
        try:
            # Convert frame to grayscale for face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Detect face
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(100, 100)
            )
            
            # Update face ROI if detected
            if len(faces) > 0:
                x, y, w, h = faces[0]
                self.face_roi = (x, y, w, h)
                self.last_metrics['face_detected'] = True
            else:
                self.face_roi = None
                self.last_metrics['face_detected'] = False
                return self.last_metrics

            # Process frame for SpO2
            spo2_result = self.spo2_calculator.process_frame(frame, self.face_roi)
            
            if spo2_result:
                self.last_metrics.update({
                    'spo2': spo2_result['spo2'],
                    'quality': spo2_result['quality']
                })

            # Draw debug information on frame
            self._draw_debug_info(frame)
            
            self.frame_count += 1
            return self.last_metrics

        except Exception as e:
            print(f"Error in video processing: {str(e)}")
            return self.last_metrics

    def _draw_debug_info(self, frame):
        """
        Draw debug information on the frame
        """
        if self.face_roi:
            x, y, w, h = self.face_roi
            # Draw face rectangle
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Draw SpO2 info
            if self.last_metrics['spo2'] is not None:
                spo2_text = f"SpO2: {self.last_metrics['spo2']:.1f}%"
                quality_text = f"Quality: {self.last_metrics['quality']:.2f}"
                
                cv2.putText(frame, spo2_text, (x, y-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(frame, quality_text, (x, y-40), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    def reset(self):
        """
        Reset all processing state
        """
        self.spo2_calculator.reset()
        self.frame_count = 0
        self.face_roi = None
        self.last_metrics = {
            'bpm': None,
            'spo2': None,
            'face_detected': False,
            'quality': 0.0
        }

    def get_metrics(self):
        """
        Get current metrics
        """
        return self.last_metrics 