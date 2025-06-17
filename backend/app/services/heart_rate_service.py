import cv2
import mediapipe as mp
import numpy as np
from scipy.fft import fft
import logging
from typing import Dict, List, Optional
import time

# Configure detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HeartRateService:
    def __init__(self):
        logger.info("Initializing HeartRateService...")
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("Face mesh model initialized successfully")
        
        # Buffer for storing ROI values
        self.buffer_size = 450  # 18 seconds at 25 fps
        self.sample_rate = 25  # fps
        self.green_buffer = np.zeros(self.buffer_size)
        self.red_buffer = np.zeros(self.buffer_size)
        self.buffer_index = 0
        self.frame_count = 0
        self.total_bpm = 0
        self.bpm_count = 0
        
        logger.info(f"Initialized with buffer size: {self.buffer_size}, sample rate: {self.sample_rate}")
        
    async def process_frame(self, frame_data: bytes) -> Dict:
        """Process a single frame and return heart rate metrics"""
        try:
            # Decode frame
            nparr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                logger.error("Failed to decode frame")
                return {"error": "Failed to decode frame"}
            
            self.frame_count += 1
            logger.info(f"Processing frame {self.frame_count}")
            
            # Convert to RGB for MediaPipe
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Detect face landmarks
            results = self.face_mesh.process(frame_rgb)
            if not results.multi_face_landmarks:
                logger.warning("No face detected in frame")
                return {"face_detected": False, "error": "No face detected"}
            
            # Get ROI values
            roi_values = self._extract_roi_values(frame, results.multi_face_landmarks[0])
            if not roi_values:
                logger.warning("Failed to extract ROI values")
                return {"face_detected": True, "error": "Failed to extract ROI values"}
            
            # Update buffers
            self.green_buffer[self.buffer_index] = roi_values['green']
            self.red_buffer[self.buffer_index] = roi_values['red']
            self.buffer_index = (self.buffer_index + 1) % self.buffer_size
            
            # Calculate BPM for this frame
            if self.buffer_index >= 2:  # Need at least 2 samples for FFT
                bpm = self._calculate_bpm_for_frame()
                if bpm is not None:
                    self.total_bpm += bpm
                    self.bpm_count += 1
            
            # Calculate average BPM if we have enough samples
            avg_bpm = None
            if self.bpm_count > 0:
                avg_bpm = self.total_bpm / self.bpm_count
            
            return {
                "face_detected": True,
                "frame_count": self.frame_count,
                "buffer_progress": int((self.buffer_index / self.buffer_size) * 100),
                "average_bpm": float(avg_bpm) if avg_bpm is not None else None,
                "bpm_count": self.bpm_count
            }
            
        except Exception as e:
            logger.error(f"Error processing frame: {str(e)}", exc_info=True)
            return {"face_detected": False, "error": str(e)}

    def _calculate_bpm_for_frame(self) -> Optional[float]:
        """Calculate BPM for the current frame using a sliding window approach"""
        try:
            # Get the current signal segment using a sliding window
            window_size = min(self.buffer_index, self.buffer_size)
            green_signal = self.green_buffer[:window_size]
            red_signal = self.red_buffer[:window_size]
            
            # Apply FFT to get frequency components
            fft_green = np.fft.fft(green_signal)
            fft_red = np.fft.fft(red_signal)
            
            # Get frequency bins
            freqs = np.fft.fftfreq(len(green_signal), 1/self.sample_rate)
            
            # Find dominant frequency in the expected heart rate range (40-200 BPM)
            mask = (freqs > 40/60) & (freqs < 200/60)
            dominant_freq_green = freqs[mask][np.argmax(np.abs(fft_green[mask]))]
            dominant_freq_red = freqs[mask][np.argmax(np.abs(fft_red[mask]))]
            
            # Convert to BPM
            bpm_green = abs(dominant_freq_green * 60)
            bpm_red = abs(dominant_freq_red * 60)
            
            # Use the more stable signal
            bpm = bpm_green if np.std(green_signal) < np.std(red_signal) else bpm_red
            
            # Apply physiological validation
            if 40 <= bpm <= 200:
                return float(bpm)
            return None
            
        except Exception as e:
            logger.error(f"Error calculating BPM: {str(e)}", exc_info=True)
            return None

    def _extract_roi_values(self, frame: np.ndarray, landmarks) -> Optional[Dict[str, float]]:
        try:
            # Get ROI coordinates
            roi_points = []
            for idx in [33, 133, 362, 263]:  # Key points around the nose
                landmark = landmarks.landmark[idx]
                x, y = int(landmark.x * frame.shape[1]), int(landmark.y * frame.shape[0])
                roi_points.append((x, y))
            
            # Calculate ROI bounds
            x_coords = [p[0] for p in roi_points]
            y_coords = [p[1] for p in roi_points]
            x_min, x_max = min(x_coords), max(x_coords)
            y_min, y_max = min(y_coords), max(y_coords)
            
            # Add padding to ROI
            padding = 10
            x_min = max(0, x_min - padding)
            x_max = min(frame.shape[1], x_max + padding)
            y_min = max(0, y_min - padding)
            y_max = min(frame.shape[0], y_max + padding)
            
            # Extract ROI
            roi = frame[y_min:y_max, x_min:x_max]
            if roi.size == 0:
                logger.warning("Empty ROI extracted")
                return None
            
            # Calculate average values
            avg_green = np.mean(roi[:, :, 1])
            avg_red = np.mean(roi[:, :, 0])
            
            return {"green": avg_green, "red": avg_red}
            
        except Exception as e:
            logger.error(f"Error extracting ROI values: {str(e)}", exc_info=True)
            return None

    def calculate_bpm(self, signal: List[float]) -> Optional[float]:
        """Calculate BPM from signal using FFT"""
        try:
            if len(signal) < self.buffer_size:
                logger.warning(f"Not enough samples for BPM calculation. Need {self.buffer_size}, got {len(signal)}")
                return None
            
            logger.info("Applying FFT to signal...")
            # Apply FFT
            fft_result = fft(signal)
            freqs = np.fft.fftfreq(len(signal), 1/self.sample_rate)
            
            # Find dominant frequency in BPM range
            mask = (freqs >= 40/60) & (freqs <= 200/60)
            power = np.abs(fft_result[mask])
            freqs = freqs[mask]
            
            if len(power) == 0:
                logger.warning("No frequencies found in BPM range")
                return None
            
            peak_idx = np.argmax(power)
            bpm = freqs[peak_idx] * 60
            
            logger.info(f"BPM calculation complete: {bpm:.2f} BPM")
            return float(bpm)
        except Exception as e:
            logger.error(f"Error calculating BPM: {str(e)}", exc_info=True)
            return None

    def calculate_breathing_rate(self, signal: List[float]) -> Optional[float]:
        """Calculate breathing rate from signal"""
        try:
            if len(signal) < self.buffer_size:
                return None
            
            MIN_BREATHS = 8  # 8 breaths per minute
            MAX_BREATHS = 30  # 30 breaths per minute
            
            fft_result = fft(signal)
            freqs = np.fft.fftfreq(len(signal), 1/self.sample_rate)
            
            mask = (freqs >= MIN_BREATHS/60) & (freqs <= MAX_BREATHS/60)
            power = np.abs(fft_result[mask])
            freqs = freqs[mask]
            
            if len(power) == 0:
                return None
            
            peak_idx = np.argmax(power)
            breathing_rate = freqs[peak_idx] * 60
            
            return float(breathing_rate)
        except Exception as e:
            logger.error(f"Error calculating breathing rate: {str(e)}")
            return None

    def estimate_oxygen_saturation(self, red_signal: List[float], green_signal: List[float]) -> Optional[float]:
        """Estimate SpO2 using red and green signals"""
        try:
            if len(red_signal) < self.buffer_size or len(green_signal) < self.buffer_size:
                return None
            
            red_ac = np.std(red_signal)
            green_ac = np.std(green_signal)
            
            # Simplified ratio calculation
            ratio = (red_ac / np.mean(red_signal)) / (green_ac / np.mean(green_signal))
            
            # Approximate SpO2 calculation (this is a simplified model)
            spo2 = 110 - 25 * ratio
            
            return float(max(0, min(100, spo2)))
        except Exception as e:
            logger.error(f"Error estimating SpO2: {str(e)}")
            return None 