import cv2
import numpy as np
import scipy.signal
from typing import List, Tuple, Optional
import logging
from dataclasses import dataclass
from enum import Enum
import time

logger = logging.getLogger(__name__)

class FaceRegion(Enum):
    FOREHEAD = "forehead"
    CHEEKS = "cheeks"
    NOSE = "nose"
    ALL = "all"

@dataclass
class FaceROI:
    region: np.ndarray
    mean_color: np.ndarray
    region_type: FaceRegion

class FaceHRAnalyzer:
    def __init__(self, sample_rate: float = 30.0, buffer_size: int = 150):
        """
        Initialize the Face Heart Rate Analyzer.
        
        Args:
            sample_rate: Camera frame rate (FPS)
            buffer_size: Size of the buffer to store signal history
        """
        self.sample_rate = sample_rate
        self.buffer_size = buffer_size
        self.face_detector = self._init_face_detector()
        
        # Signal buffers
        self.r_signal = np.zeros(buffer_size)
        self.g_signal = np.zeros(buffer_size)
        self.b_signal = np.zeros(buffer_size)
        self.timestamps = np.zeros(buffer_size)
        self.signal_buffer = []
        self.valid_samples = 0
        self.buffer_index = 0
        
        # Face tracking
        self.last_face_roi = None
        self.last_face_landmarks = None
        self.face_lost_count = 0
        
        # Heart rate estimation
        self.min_hr_bpm = 40
        self.max_hr_bpm = 180
        self.last_hr = None
        self.last_hr_time = 0
        self.hr_confidence = 0.0
        
        logger.info(f"Initialized FaceHRAnalyzer with sample_rate={sample_rate}, buffer_size={buffer_size}")
    
    def _init_face_detector(self):
        """Initialize the face detector and landmark predictor"""
        try:
            import mediapipe as mp
            mp_face_mesh = mp.solutions.face_mesh
            return mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
        except ImportError:
            logger.error("MediaPipe not available. Falling back to Haar Cascade.")
            return cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    def process_frame(self, frame: np.ndarray) -> Optional[float]:
        """
        Process a single frame to estimate heart rate.
        
        Args:
            frame: Input BGR frame
            
        Returns:
            Estimated heart rate in BPM if available, None otherwise
        """
        if frame is None or frame.size == 0:
            return None
            
        # Convert to RGB for face detection
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Detect face and landmarks
        face_roi = self._detect_face_roi(rgb_frame)
        if face_roi is None:
            self.face_lost_count += 1
            if self.face_lost_count > 10:  # Reset if face is lost for too long
                self._reset_buffers()
            return self.last_hr
            
        self.face_lost_count = 0
        
        # Extract color signals from face ROI
        self._update_signal_buffer(face_roi)
        
        # Only process if we have enough samples
        if self.valid_samples < self.sample_rate * 1.5:  # Need at least 1.5 seconds of data
            return None
            
        # Estimate heart rate every second
        current_time = time.time()
        if current_time - self.last_hr_time < 1.0:
            return self.last_hr
            
        self.last_hr_time = current_time
        
        # Process signals and estimate HR
        hr_estimate = self._estimate_heart_rate()
        
        if hr_estimate is not None:
            self.last_hr = hr_estimate
            
        return self.last_hr
    
    def _detect_face_roi(self, rgb_frame: np.ndarray) -> Optional[FaceROI]:
        """Detect face and return ROI with face landmarks"""
        try:
            if hasattr(self.face_detector, 'process'):  # MediaPipe
                results = self.face_detector.process(rgb_frame)
                if not results.multi_face_landmarks:
                    return None
                    
                landmarks = results.multi_face_landmarks[0]
                self.last_face_landmarks = landmarks
                
                # Get forehead region (more stable for rPPG)
                h, w, _ = rgb_frame.shape
                forehead_points = [103, 67, 109, 10, 338, 297, 332, 251, 301]
                points = []
                
                for idx in forehead_points:
                    if 0 <= idx < len(landmarks.landmark):
                        lm = landmarks.landmark[idx]
                        x, y = int(lm.x * w), int(lm.y * h)
                        points.append([x, y])
                
                if len(points) < 3:
                    return None
                    
                # Create mask for forehead region
                mask = np.zeros((h, w), dtype=np.uint8)
                cv2.fillPoly(mask, [np.array(points, dtype=np.int32)], 255)
                
                # Extract ROI
                roi = cv2.bitwise_and(rgb_frame, rgb_frame, mask=mask)
                mean_color = cv2.mean(roi, mask=mask)[:3]  # Get mean RGB
                
                return FaceROI(roi, mean_color, FaceRegion.FOREHEAD)
                
            else:  # Fallback to Haar Cascade
                gray = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2GRAY)
                faces = self.face_detector.detectMultiScale(gray, 1.1, 4)
                if len(faces) == 0:
                    return None
                    
                x, y, w, h = faces[0]
                # Use upper half of the face (forehead region)
                roi = rgb_frame[y:y+h//2, x:x+w]
                mean_color = np.mean(roi, axis=(0, 1))
                
                return FaceROI(roi, mean_color, FaceRegion.FOREHEAD)
                
        except Exception as e:
            logger.error(f"Error in face detection: {str(e)}", exc_info=True)
            return None
    
    def _update_signal_buffer(self, face_roi: FaceROI):
        """Update signal buffers with new face ROI data"""
        if face_roi is None or not hasattr(face_roi, 'mean_color') or len(face_roi.mean_color) == 0:
            return
            
        # Update circular buffer
        self.r_signal[self.buffer_index] = face_roi.mean_color[0]
        self.g_signal[self.buffer_index] = face_roi.mean_color[1]
        self.b_signal[self.buffer_index] = face_roi.mean_color[2]
        self.timestamps[self.buffer_index] = time.time()
        
        self.buffer_index = (self.buffer_index + 1) % self.buffer_size
        self.valid_samples = min(self.valid_samples + 1, self.buffer_size)
    
    def _estimate_heart_rate(self) -> Optional[float]:
        """Estimate heart rate from the collected signals"""
        if self.valid_samples < self.sample_rate:  # Need at least 1 second of data
            return None
            
        try:
            # Use green channel (most sensitive to blood volume changes)
            sig = self.g_signal[:self.valid_samples]
            
            # Remove DC component and detrend
            sig = sig - np.mean(sig)
            sig = sig - np.polyval(np.polyfit(range(len(sig)), sig, 2), range(len(sig)))
            
            # Bandpass filter (0.7 Hz to 4 Hz = 42 to 240 BPM)
            nyquist = self.sample_rate / 2
            low = 0.7 / nyquist
            high = 4.0 / nyquist
            b, a = scipy.signal.butter(4, [low, high], btype='band')
            filtered = scipy.signal.filtfilt(b, a, sig)
            
            # Find peaks in the time domain
            peaks, _ = scipy.signal.find_peaks(filtered, distance=self.sample_rate * 0.6)  # Min 0.6s between beats
            
            if len(peaks) < 2:  # Need at least 2 peaks
                return None
                
            # Calculate BPM from peak intervals
            intervals = np.diff(peaks) / self.sample_rate  # Time between peaks in seconds
            bpm_values = 60.0 / intervals  # Convert to BPM
            
            # Filter out unrealistic BPM values
            valid_bpms = bpm_values[(bpm_values >= self.min_hr_bpm) & (bpm_values <= self.max_hr_bpm)]
            
            if len(valid_bpms) == 0:
                return None
                
            # Use median for robustness against outliers
            hr_estimate = float(np.median(valid_bpms))
            
            # Calculate confidence based on signal quality
            f, Pxx = scipy.signal.welch(filtered, self.sample_rate, nperseg=1024)
            hr_band = (f >= (self.min_hr_bpm/60)) & (f <= (self.max_hr_bpm/60))
            if len(Pxx) > 0:  # Ensure we have power spectrum data
                signal_power = np.sum(Pxx[hr_band])
                noise_band = ~hr_band & (f < (self.sample_rate/2))  # Only consider frequencies up to Nyquist
                noise_power = np.sum(Pxx[noise_band]) if np.any(noise_band) else 0.1  # Avoid division by zero
            else:
                signal_power = 0
                noise_power = 1
            
            self.hr_confidence = signal_power / (signal_power + noise_power + 1e-6)
            
            # Only return if confidence is high enough
            if self.hr_confidence > 0.3:  # 30% confidence threshold
                return hr_estimate
            
        except Exception as e:
            logger.error(f"Error in HR estimation: {str(e)}", exc_info=True)
            
        return None
    
    def _reset_buffers(self):
        """Reset all signal buffers"""
        self.r_signal.fill(0)
        self.g_signal.fill(0)
        self.b_signal.fill(0)
        self.timestamps.fill(0)
        self.valid_samples = 0
        self.buffer_index = 0
        self.hr_confidence = 0.0
        self.last_hr = None
        self.last_face_roi = None
        self.last_face_landmarks = None
