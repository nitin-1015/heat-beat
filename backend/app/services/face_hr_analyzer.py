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
        """Initialize the face detector with strict parameters for better accuracy"""
        try:
            import mediapipe as mp
            mp_face_mesh = mp.solutions.face_mesh
            return mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.7,  # Increased from 0.5
                min_tracking_confidence=0.7,   # Increased from 0.5
                static_image_mode=False
            )
        except ImportError:
            logger.error("MediaPipe not available. Falling back to Haar Cascade.")
            return cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')  # More accurate model
    
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
            return None  # Immediately return None when no face is detected
            
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
        """Detect face and return ROI with face landmarks with strict validation"""
        try:
            if hasattr(self.face_detector, 'process'):  # MediaPipe
                # Convert to RGB if needed
                if rgb_frame.shape[2] == 4:  # RGBA to RGB
                    rgb_frame = cv2.cvtColor(rgb_frame, cv2.COLOR_RGBA2RGB)
                elif len(rgb_frame.shape) == 2:  # Grayscale to RGB
                    rgb_frame = cv2.cvtColor(rgb_frame, cv2.COLOR_GRAY2RGB)
                
                # Ensure image is large enough for detection
                h, w = rgb_frame.shape[:2]
                if h < 100 or w < 100:  # Minimum size for reliable detection
                    logger.warning(f"Frame too small for face detection: {w}x{h}")
                    return None
                
                # Process frame
                results = self.face_detector.process(rgb_frame)
                
                # Check if any faces were detected
                if not results.multi_face_landmarks:
                    logger.debug("No faces detected in frame")
                    return None
                    
                # Get the first (and only) face
                landmarks = results.multi_face_landmarks[0]
                
                # Additional validation for face position and size
                face_landmarks = np.array([(lm.x * w, lm.y * h) for lm in landmarks.landmark])
                x_min, y_min = face_landmarks.min(axis=0)
                x_max, y_max = face_landmarks.max(axis=0)
                face_width = x_max - x_min
                face_height = y_max - y_min
                
                # Check face size (should be at least 15% of the frame dimension)
                min_face_ratio = 0.15
                if (face_width < w * min_face_ratio or 
                    face_height < h * min_face_ratio or
                    face_width > w * 0.8 or
                    face_height > h * 0.8):
                    logger.debug(f"Face size out of bounds: {face_width}x{face_height} in {w}x{h}")
                    return None
                    
                # Check face position (should be reasonably centered)
                center_x, center_y = (x_min + x_max) / 2, (y_min + y_max) / 2
                if (abs(center_x - w/2) > w * 0.4 or 
                    abs(center_y - h/2) > h * 0.4):
                    logger.debug(f"Face not centered: ({center_x}, {center_y}) in {w}x{h}")
                    return None
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
        """Estimate heart rate from the collected signals with improved stability.
        
        Returns:
            Estimated heart rate in BPM if valid, None otherwise
        """
        if self.valid_samples < self.sample_rate * 1.5:  # Need at least 1.5 seconds of data
            return None
            
        try:
            # Use green channel (most sensitive to blood volume changes)
            sig = self.g_signal[:self.valid_samples]
            
            # 1. Signal Preprocessing
            # Normalize signal to zero mean and unit variance
            sig = (sig - np.mean(sig)) / (np.std(sig) + 1e-6)
            
            # Robust detrending using moving average
            window_size = int(self.sample_rate * 0.5)  # 0.5 second window
            if window_size % 2 == 0:
                window_size += 1  # Ensure window size is odd
                
            # Apply moving average filter to get trend
            trend = np.convolve(sig, np.ones(window_size)/window_size, mode='same')
            sig_detrended = sig - trend
            
            # 2. Bandpass Filtering
            nyquist = self.sample_rate / 2
            low = 0.7 / nyquist    # ~42 BPM
            high = 4.0 / nyquist   # ~240 BPM
            
            # Use SOS filtering for better numerical stability
            sos = scipy.signal.butter(4, [low, high], btype='band', output='sos')
            filtered = scipy.signal.sosfiltfilt(sos, sig_detrended)
            
            # 3. Time-domain Analysis (Peak Detection)
            # Find peaks with adaptive thresholding
            min_peak_distance = int(self.sample_rate * 0.4)  # Max 150 BPM
            peaks, properties = scipy.signal.find_peaks(
                filtered,
                distance=min_peak_distance,
                prominence=0.1,  # Minimum peak prominence
                width=3,         # Minimum peak width in samples
                rel_height=0.5
            )
            
            # 4. Frequency-domain Analysis (FFT)
            # Calculate power spectrum using Welch's method
            f, Pxx = scipy.signal.welch(
                filtered,
                fs=self.sample_rate,
                nperseg=min(1024, len(filtered)),
                window='hann'
            )
            
            # Find peak in the heart rate frequency range
            hr_band = (f >= (self.min_hr_bpm/60)) & (f <= (self.max_hr_bpm/60))
            if not np.any(hr_band):
                return None
                
            # Find the most prominent peak in the HR band
            f_hr = f[hr_band]
            Pxx_hr = Pxx[hr_band]
            peak_idx = np.argmax(Pxx_hr)
            f_peak = f_hr[peak_idx]
            hr_fft = f_peak * 60  # Convert to BPM
            
            # Calculate signal quality metrics
            signal_power = np.sum(Pxx_hr)
            noise_band = (f >= 0.1) & (f <= (self.sample_rate/2)) & ~hr_band
            noise_power = np.sum(Pxx[noise_band]) if np.any(noise_band) else 0.1
            
            # Calculate signal-to-noise ratio (SNR)
            snr = 10 * np.log10(signal_power / (noise_power + 1e-6))
            
            # 5. Combine time and frequency domain estimates
            hr_estimate = None
            
            if len(peaks) >= 2:  # If we have enough peaks for time-domain analysis
                # Calculate BPM from peak intervals
                intervals = np.diff(peaks) / self.sample_rate
                bpm_values = 60.0 / intervals
                
                # Filter out unrealistic BPM values
                valid_bpms = bpm_values[(bpm_values >= self.min_hr_bpm) & 
                                      (bpm_values <= self.max_hr_bpm)]
                
                if len(valid_bpms) > 0:
                    # Use median for robustness against outliers
                    hr_time_domain = float(np.median(valid_bpms))
                    
                    # Combine time and frequency domain estimates
                    # Weight more towards FFT if SNR is good
                    if snr > 5:  # Good SNR
                        hr_estimate = 0.7 * hr_fft + 0.3 * hr_time_domain
                    else:  # Poor SNR, trust time domain more
                        hr_estimate = 0.4 * hr_fft + 0.6 * hr_time_domain
            else:
                # If not enough peaks, use FFT estimate
                hr_estimate = hr_fft
            
            # Ensure the final estimate is within valid range
            if hr_estimate is not None:
                hr_estimate = max(self.min_hr_bpm, min(self.max_hr_bpm, hr_estimate))
                
                # Calculate confidence based on SNR and peak quality
                snr_confidence = min(1.0, snr / 10.0)  # Normalize SNR to 0-1 range
                peak_confidence = len(peaks) / (len(filtered) / (self.sample_rate * 0.8))  # Expected peaks per second
                peak_confidence = min(1.0, peak_confidence)  # Cap at 1.0
                
                self.hr_confidence = 0.7 * snr_confidence + 0.3 * peak_confidence
                
                # Only return if confidence is high enough
                if self.hr_confidence > 0.35:  # 35% confidence threshold
                    # Smooth with previous estimate if available
                    if self.last_hr is not None:
                        # Use adaptive smoothing based on confidence
                        alpha = 0.3 + (0.5 * self.hr_confidence)  # 0.3-0.8 smoothing factor
                        hr_estimate = (alpha * self.last_hr + (1 - alpha) * hr_estimate)
                    
                    return float(hr_estimate)
            
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
