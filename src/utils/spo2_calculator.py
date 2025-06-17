import numpy as np
from scipy import signal
import cv2

class SpO2Calculator:
    def __init__(self, buffer_size=100):
        self.buffer_size = buffer_size
        self.red_buffer = []
        self.ir_buffer = []
        self.spo2_buffer = []
        self.is_calibrated = False
        self.calibration_frames = 0
        self.required_calibration_frames = 30
        self.last_spo2 = None
        self.quality_threshold = 0.7
        self.signal_quality = 0.0

    def process_frame(self, frame, face_roi=None):
        """
        Process a single frame to extract SpO2 data
        Args:
            frame: Input frame
            face_roi: Region of interest containing the face (optional)
        """
        try:
            # Convert frame to RGB if it's not already
            if len(frame.shape) == 2:  # If grayscale
                frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2RGB)
            
            # Use face ROI if provided, otherwise use full frame
            if face_roi is not None:
                frame = frame[face_roi[1]:face_roi[1]+face_roi[3], 
                            face_roi[0]:face_roi[0]+face_roi[2]]
            
            # Extract color channels
            red_channel = frame[:, :, 0]  # Red channel
            blue_channel = frame[:, :, 2]  # Blue channel (better IR proxy)
            
            # Calculate mean values for the channels
            red_mean = np.mean(red_channel)
            ir_mean = np.mean(blue_channel)
            
            # Calculate signal quality
            self.signal_quality = self._calculate_signal_quality(red_channel, blue_channel)
            
            # Only process if signal quality is good
            if self.signal_quality >= self.quality_threshold:
                # Add to buffers
                self.red_buffer.append(red_mean)
                self.ir_buffer.append(ir_mean)
                
                # Keep buffer size fixed
                if len(self.red_buffer) > self.buffer_size:
                    self.red_buffer.pop(0)
                    self.ir_buffer.pop(0)
                
                # Calculate SpO2 if we have enough data
                if len(self.red_buffer) >= self.required_calibration_frames:
                    spo2 = self._calculate_spo2()
                    if spo2 is not None:
                        self.spo2_buffer.append(spo2)
                        self.last_spo2 = spo2
                        
                        if len(self.spo2_buffer) > self.buffer_size:
                            self.spo2_buffer.pop(0)
                        
                        return {
                            'spo2': spo2,
                            'quality': self.signal_quality,
                            'is_calibrated': True
                        }
            
            return {
                'spo2': self.last_spo2,
                'quality': self.signal_quality,
                'is_calibrated': len(self.red_buffer) >= self.required_calibration_frames
            }
            
        except Exception as e:
            print(f"Error in SpO2 calculation: {str(e)}")
            return None

    def _calculate_signal_quality(self, red_channel, blue_channel):
        """
        Calculate signal quality based on channel statistics
        """
        try:
            # Calculate standard deviation of both channels
            red_std = np.std(red_channel)
            blue_std = np.std(blue_channel)
            
            # Calculate mean of both channels
            red_mean = np.mean(red_channel)
            blue_mean = np.mean(blue_channel)
            
            # Calculate contrast ratio
            contrast_ratio = min(red_std, blue_std) / max(red_std, blue_std)
            
            # Calculate brightness ratio
            brightness_ratio = min(red_mean, blue_mean) / max(red_mean, blue_mean)
            
            # Combine metrics
            quality = (contrast_ratio * 0.7 + brightness_ratio * 0.3)
            
            return min(1.0, max(0.0, quality))
        except:
            return 0.0

    def _calculate_spo2(self):
        """
        Calculate SpO2 using the ratio of red to IR signals
        """
        try:
            # Convert buffers to numpy arrays
            red_signal = np.array(self.red_buffer)
            ir_signal = np.array(self.ir_buffer)
            
            # Apply bandpass filter to isolate pulse signal
            red_filtered = self._bandpass_filter(red_signal)
            ir_filtered = self._bandpass_filter(ir_signal)
            
            # Calculate AC/DC ratio
            red_ac = np.std(red_filtered)
            red_dc = np.mean(red_signal)
            ir_ac = np.std(ir_filtered)
            ir_dc = np.mean(ir_signal)
            
            # Avoid division by zero
            if red_dc == 0 or ir_dc == 0:
                return None
            
            # Calculate ratio
            ratio = (red_ac / red_dc) / (ir_ac / ir_dc)
            
            # Apply calibration curve
            # This is a simplified version - real calibration requires more complex math
            spo2 = 110 - (25 * ratio)
            
            # Clamp values to valid range
            spo2 = max(70, min(100, spo2))
            
            # Check for sudden changes
            if self.last_spo2 is not None:
                if abs(spo2 - self.last_spo2) > 5:  # If change is too large
                    spo2 = self.last_spo2  # Use previous value
            
            return spo2
            
        except Exception as e:
            print(f"Error in SpO2 calculation: {str(e)}")
            return None

    def _bandpass_filter(self, signal_data, lowcut=0.5, highcut=4.0, fs=30.0):
        """
        Apply bandpass filter to isolate pulse signal
        """
        try:
            nyquist = fs * 0.5
            low = lowcut / nyquist
            high = highcut / nyquist
            
            b, a = signal.butter(4, [low, high], btype='band')
            return signal.filtfilt(b, a, signal_data)
        except:
            return signal_data

    def get_average_spo2(self):
        """
        Get the average SpO2 from the buffer
        """
        if not self.spo2_buffer:
            return None
        return np.mean(self.spo2_buffer)

    def get_spo2_trend(self):
        """
        Get the SpO2 trend (increasing, decreasing, or stable)
        """
        if len(self.spo2_buffer) < 2:
            return "stable"
        
        recent_spo2 = self.spo2_buffer[-10:]  # Last 10 readings
        slope = np.polyfit(range(len(recent_spo2)), recent_spo2, 1)[0]
        
        if slope > 0.5:
            return "increasing"
        elif slope < -0.5:
            return "decreasing"
        return "stable"

    def reset(self):
        """
        Reset all buffers and calibration
        """
        self.red_buffer = []
        self.ir_buffer = []
        self.spo2_buffer = []
        self.is_calibrated = False
        self.calibration_frames = 0
        self.last_spo2 = None
        self.signal_quality = 0.0 