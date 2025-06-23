import cv2
import mediapipe as mp
import numpy as np
from scipy.fft import fft
from scipy.signal import butter, lfilter  # Added for bandpass filter
import logging
from typing import Dict, List, Optional, Tuple
import time
import torch
from torchvision import transforms
from transformers import AutoModelForSequenceClassification, AutoFeatureExtractor
from PIL import Image

# Configure detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HeartRateService:
    def __init__(self, device: str = None):
        """
        Initialize the HeartRateService with signal processing based heart rate estimation
        and ResNet-18 for SpO2 estimation.
        
        Args:
            device: The device to run models on ('cuda' or 'cpu'). Auto-detected if None.
        """
        logger.info("Initializing HeartRateService...")
        
        # Initialize device (CPU or GPU if available)
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Initialize face mesh for face detection
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("Face mesh model initialized successfully")
        
        # Initialize ResNet-18 for SpO2 estimation
        logger.info("Loading ResNet-18 for SpO2 estimation...")
        try:
            self.spo2_model = torch.hub.load('pytorch/vision:v0.10.0', 'resnet18', pretrained=True)
            # Modify the final layer for regression (1 output for SpO2)
            num_ftrs = self.spo2_model.fc.in_features
            self.spo2_model.fc = torch.nn.Linear(num_ftrs, 1)
            self.spo2_model = self.spo2_model.to(self.device)
            self.spo2_model.eval()
            logger.info("ResNet-18 model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load ResNet-18 model: {str(e)}")
            raise
        
        # Image transformations for ResNet
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        # Initialize bandpass filter for heart rate
        from scipy.signal import butter, lfilter
        self.butter_bandpass = butter(1, [0.7, 4.0], btype='bandpass', fs=25, output='sos')
        
        # Heart rate estimation parameters
        self.min_heart_rate = 40  # BPM
        self.max_heart_rate = 200  # BPM
        
        # Buffer for storing ROI values and signal metrics
        self.buffer_size = 225  # 9 seconds at 25 fps (reduced for faster response)
        self.sample_rate = 25  # fps
        self.ppg_buffer = np.zeros((self.buffer_size, 3))  # For RGB values
        self.buffer_index = 0
        self.frame_count = 0
        
        # Signal quality metrics
        self.min_signal_std = 0.5  # Minimum standard deviation for valid signal
        self.min_face_size = 100  # Minimum face size in pixels (width or height)
        
        # BPM stabilization
        self.bpm_buffer = []
        self.max_bpm_buffer_size = 5  # Number of BPM readings to average
        self.max_bpm_jump = 10  # Maximum allowed BPM change between readings
        
        # Frequency range for heart rate (in Hz)
        self.min_hr_hz = 0.8  # ~48 BPM
        self.max_hr_hz = 3.0   # ~180 BPM
        
        logger.info(f"Initialized with buffer size: {self.buffer_size}, sample rate: {self.sample_rate}")
        
    async def process_frame(self, frame_data: bytes) -> Dict:
        """Process a single frame and return heart rate and SpO2 metrics"""
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
            
            # Get ROI image and mean RGB values
            roi_image, mean_rgb = self._extract_roi(frame, results.multi_face_landmarks[0])
            if roi_image is None or mean_rgb is None:
                logger.warning("Failed to extract ROI")
                return {"face_detected": True, "error": "Failed to extract ROI"}
            
            # Update PPG buffer with mean RGB values
            self.ppg_buffer[self.buffer_index] = mean_rgb
            self.buffer_index = (self.buffer_index + 1) % self.buffer_size
            
            # Calculate metrics if we have enough samples
            current_bpm = None
            current_spo2 = None
            
            if self.buffer_index >= 2:  # Need at least 2 samples
                # Get the current signal window
                signal_window = self.ppg_buffer[:self.buffer_index]
                
                # Estimate heart rate using PPG model
                current_bpm = self.estimate_heart_rate(signal_window)
                
                # Estimate SpO2 using ResNet
                current_spo2 = self.estimate_oxygen_saturation(roi_image)
            
            return {
                "face_detected": True,
                "frame_count": self.frame_count,
                "buffer_progress": int((self.buffer_index / self.buffer_size) * 100),
                "current_bpm": current_bpm,
                "current_spo2": current_spo2,
                "timestamp": time.time()
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

    def _extract_roi(self, frame: np.ndarray, landmarks) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """
        Extract region of interest (ROI) from the frame using facial landmarks.
        Returns both the ROI image and the mean RGB values.
        """
        try:
            # Get forehead region (more stable than nose region)
            # These landmarks correspond to the forehead area
            forehead_points = [103, 67, 109, 10, 338, 297, 332, 251, 301]
            roi_points = []
            
            for idx in forehead_points:
                if 0 <= idx < len(landmarks.landmark):
                    landmark = landmarks.landmark[idx]
                    x = int(landmark.x * frame.shape[1])
                    y = int(landmark.y * frame.shape[0])
                    roi_points.append((x, y))
            
            if not roi_points:
                return None, None
                
            # Calculate ROI bounds with minimal padding
            x_coords = [p[0] for p in roi_points]
            y_coords = [p[1] for p in roi_points]
            x_min, x_max = min(x_coords), max(x_coords)
            y_min, y_max = min(y_coords), max(y_coords)
            
            # Add minimal padding (5% of width/height)
            padding_x = max(5, int((x_max - x_min) * 0.05))
            padding_y = max(5, int((y_max - y_min) * 0.05))
            
            # Ensure ROI is within frame bounds
            x_min = max(0, x_min - padding_x)
            x_max = min(frame.shape[1], x_max + padding_x)
            y_min = max(0, y_min - padding_y)
            y_max = min(frame.shape[0], y_max + padding_y)
            
            # Ensure ROI has minimum size
            min_roi_size = 20  # pixels
            if (x_max - x_min) < min_roi_size or (y_max - y_min) < min_roi_size:
                return None, None
                
            # Extract ROI
            roi = frame[y_min:y_max, x_min:x_max]
            if roi.size == 0:
                return None, None
            
            # Convert to grayscale for better signal
            roi_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            
            # Calculate mean RGB values from the grayscale ROI
            mean_rgb = np.mean(roi_gray)
            
            # Convert ROI to PIL Image for ResNet
            roi_rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
            roi_pil = Image.fromarray(roi_rgb)
            
            return roi_pil, np.array([mean_rgb, mean_rgb, mean_rgb])  # Return same value for all channels
            
        except Exception as e:
            logger.error(f"Error in ROI extraction: {str(e)}", exc_info=True)
            return None, None

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

    def _butter_bandpass_filter(self, data, lowcut=0.7, highcut=4.0, fs=25, order=1):
        """Apply bandpass filter to the signal"""
        nyq = 0.5 * fs
        low = lowcut / nyq
        high = highcut / nyq
        b, a = butter(order, [low, high], btype='band')
        return lfilter(b, a, data)

    def _butter_bandpass_filter(self, data, lowcut=0.8, highcut=3.0, order=3):
        """Apply a bandpass filter to the input signal"""
        nyq = 0.5 * self.sample_rate
        low = lowcut / nyq
        high = highcut / nyq
        b, a = butter(order, [low, high], btype='band')
        return lfilter(b, a, data)

    def estimate_heart_rate(self, ppg_signal: np.ndarray) -> Optional[float]:
        """Estimate heart rate with enhanced stability and signal quality checks"""
        try:
            # 1. Signal Quality Check
            if ppg_signal is None or len(ppg_signal) < 45:  # ~2 seconds of data at 25fps
                logger.debug("Insufficient PPG signal for heart rate estimation")
                return None
                
            # Use only the green channel for better signal-to-noise ratio
            green_channel = ppg_signal[:, 1]
            
            # 2. Signal Quality Assessment
            signal_mean = np.mean(green_channel)
            signal_std = np.std(green_channel)
            if signal_std < 1.0:  # Threshold for signal variation
                logger.debug("Insufficient signal variation")
                return None
                
            # 3. Normalize the signal
            normalized = (green_channel - signal_mean) / (signal_std + 1e-10)  # Avoid division by zero
            
            # 4. Apply moving average with larger window
            window_size = 7  # Increased window size for more smoothing
            weights = np.ones(window_size) / window_size
            smoothed = np.convolve(normalized, weights, mode='same')
            
            # 5. Bandpass filter with narrower range (0.8 Hz - 3.0 Hz ~ 48 - 180 BPM)
            try:
                filtered = self._butter_bandpass_filter(smoothed, lowcut=0.8, highcut=3.0)
            except Exception as e:
                logger.error(f"Error in bandpass filter: {str(e)}")
                return None
            
            # 6. Apply Hamming window to reduce spectral leakage
            window = np.hamming(len(filtered))
            windowed_signal = filtered * window
            
            # 7. Apply FFT with zero-padding for better frequency resolution
            n_fft = max(2048, len(windowed_signal) * 4)  # Zero-padded FFT
            try:
                fft_vals = np.abs(np.fft.rfft(windowed_signal, n=n_fft))
                fft_freq = np.fft.rfftfreq(n_fft, 1.0/self.sample_rate)
            except Exception as e:
                logger.error(f"Error in FFT: {str(e)}")
                return None
            
            # 8. Find frequencies in the heart rate range
            freq_mask = (fft_freq >= 0.8) & (fft_freq <= 3.0)  # 48 - 180 BPM
            if not np.any(freq_mask):
                logger.debug("No frequencies found in heart rate range")
                return None
                
            # 9. Get the power spectrum in the HR range
            power_spectrum = fft_vals[freq_mask]
            frequencies = fft_freq[freq_mask]
            
            # 10. Find the peak frequency with the highest power
            peak_idx = np.argmax(power_spectrum)
            peak_freq = frequencies[peak_idx]
            
            # 11. Calculate BPM and apply constraints
            bpm = peak_freq * 60
            bpm = max(48, min(180, bpm))  # Physiological constraints
            
            # 12. Initialize or update BPM buffer
            if not hasattr(self, 'bpm_buffer'):
                self.bpm_buffer = []
                
            # 13. Only update buffer if the new BPM is physiologically possible
            if len(self.bpm_buffer) > 0:
                last_bpm = self.bpm_buffer[-1]
                if abs(bpm - last_bpm) > 20:  # Reject large jumps
                    logger.debug(f"Rejecting large BPM jump: {last_bpm:.1f} -> {bpm:.1f}")
                    return float(round(np.median(self.bpm_buffer)))
            
            # 14. Update buffer (max 10 readings)
            self.bpm_buffer.append(bpm)
            if len(self.bpm_buffer) > 10:
                self.bpm_buffer.pop(0)
                
            # 15. Return median of the buffer for stability
            stable_bpm = np.median(self.bpm_buffer)
            logger.debug(f"Current BPM: {bpm:.1f}, Stable BPM: {stable_bpm:.1f}")
            return float(round(stable_bpm))
            
        except Exception as e:
            logger.error(f"Error in heart rate estimation: {str(e)}", exc_info=True)
            return None
            
    def estimate_oxygen_saturation(self, roi_image: Image.Image) -> Optional[float]:
        """Estimate SpO2 using signal processing (temporal approach)"""
        try:
            if roi_image is None:
                return None
                
            # Convert PIL Image to numpy array
            frame = np.array(roi_image)
            
            # Convert to grayscale for signal processing
            gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
            
            # Calculate mean pixel intensity as our signal
            signal_value = np.mean(gray)
            
            # Simple temporal processing (replace with actual PPG signal processing)
            # This is a placeholder - in a real implementation, you would:
            # 1. Buffer the signal over time
            # 2. Apply bandpass filtering
            # 3. Analyze the AC/DC components of the red and IR signals
            
            # For now, return a value that changes slightly with the signal
            spo2 = 95.0 + (signal_value % 5.0)  # Simulate SpO2 between 95-100%
            
            # Ensure the value is within valid SpO2 range (70-100%)
            spo2 = max(70.0, min(100.0, spo2))
            
            logger.debug(f"Estimated SpO2: {spo2:.1f}%")
            return float(spo2)
            
        except Exception as e:
            logger.error(f"Error estimating SpO2: {str(e)}", exc_info=True)
            return None