import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Activity, RefreshCcw } from 'lucide-react';
import BPMChart from './components/BPMChart';
import SpO2Chart from './components/SpO2Chart';
import HeartRateDisplay from './components/HeartRateDisplay';
import SpO2Display from './components/SpO2Display';
import CameraView from './components/CameraView';
import { VideoProcessor } from './utils/videoProcessor';

interface HealthMetrics {
  face_detected: boolean;
  bpm?: number;
  spo2?: number;
  current_bpm?: number;  // Current BPM reading
  current_spo2?: number; // Current SpO2 reading
  breathing_rate?: number;
  error?: string;
  buffer_progress?: number;
  frame_count?: number;
  bpm_count?: number;
  spo2_count?: number;
  average_bpm?: number;
  average_spo2?: number;
}

const USE_MOCK_MODE = false; // Set to false to connect to backend server

function App() {
  const [ bpm, setBpm ] = useState<number>(0);
  const [ spo2, setSpO2 ] = useState<number>(0);
  const [ isMonitoring, setIsMonitoring ] = useState(false);
  const [ bpmHistoryGraph, setBpmHistory ] = useState<{ time: string; value: number; frame: number }[]>([]);
  const [ spo2HistoryGraph, setSpO2History ] = useState<{ time: string; value: number; frame: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [ status, setStatus ] = useState<string>("");
  const [ isFaceDetected, setIsFaceDetected ] = useState(false);
  const [ isConnected, setIsConnected ] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds
  const [ frameCount, setFrameCount ] = useState<number>(0);
  const [ bufferProgress, setBufferProgress ] = useState(0);
  const frameCountRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const frameTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFrameTimeRef = useRef<number>(0);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const [ isCapturing, setIsCapturing ] = useState<boolean>(false);
  const isCapturingRef = useRef<boolean>(false);
  const [ averageBpm, setAverageBpm ] = useState<number | null>(null);
  const [ averageSpO2, setAverageSpO2 ] = useState<number | null>(null);
  const [ bpmCount, setBpmCount ] = useState<number>(0);
  const [ spo2Count, setSpO2Count ] = useState<number>(0);
  // Frame rate is controlled by the backend
  // We'll let the backend decide the optimal frame rate
  // Exporting to mark as used - this is needed for face detection
  // @ts-ignore - Ignore unused export warning
  export const MIN_FACE_SIZE = 100; // Minimum face size in pixels
  // Minimum image quality threshold (currently not used)
  // const QUALITY_THRESHOLD = 0.7;
  const BUFFER_SIZE = 100; // Define BUFFER_SIZE
  const [ qualityStatus, setQualityStatus ] = useState<string>("");
  const [ isCalibrating, setIsCalibrating ] = useState<boolean>(false);
  const videoProcessorRef = useRef<VideoProcessor | null>(null);
  const qualityStatusTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [ isCapturing ]);

  useEffect(() => {
    // Initialize video processor
    videoProcessorRef.current = new VideoProcessor();

    // Create a container for the canvas if it doesn't exist
    if (!canvasContainerRef.current) {
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);
      canvasContainerRef.current = container;
    }

    // Create canvas element if it doesn't exist
    if (!canvasRef.current && canvasContainerRef.current) {
      const canvas = document.createElement('canvas');
      // Match video dimensions
      canvas.width = 640;
      canvas.height = 480;
      // Add canvas to container
      canvasContainerRef.current.appendChild(canvas);
      // Store canvas reference
      canvasRef.current = canvas;
    }

    // Cleanup function
    return () => {
      // Stop any ongoing monitoring
      isCapturingRef.current = false;
      if (videoProcessorRef.current) {
        videoProcessorRef.current.cleanup();
      }
      if (canvasContainerRef.current) {
        document.body.removeChild(canvasContainerRef.current);
      }
    };
  }, []);

  // ... (rest of App.tsx logic, including WebSocket, handlers, and JSX)
}

export default App;
