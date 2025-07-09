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
  current_bpm?: number;
  current_spo2?: number;
  breathing_rate?: number;
  error?: string;
  buffer_progress?: number;
  frame_count?: number;
  bpm_count?: number;
  spo2_count?: number;
  average_bpm?: number;
  average_spo2?: number;
}

const USE_MOCK_MODE = false;

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
  const RECONNECT_DELAY = 2000;
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
  export const MIN_FACE_SIZE = 100;
  const BUFFER_SIZE = 100;
  const [ qualityStatus, setQualityStatus ] = useState<string>("");
  const [ isCalibrating, setIsCalibrating ] = useState<boolean>(false);
  const videoProcessorRef = useRef<VideoProcessor | null>(null);
  const qualityStatusTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => { isCapturingRef.current = isCapturing; }, [ isCapturing ]);

  useEffect(() => {
    videoProcessorRef.current = new VideoProcessor();
    if (!canvasContainerRef.current) {
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);
      canvasContainerRef.current = container;
    }
    if (!canvasRef.current && canvasContainerRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      canvasContainerRef.current.appendChild(canvas);
      canvasRef.current = canvas;
    }
    return () => {
      isCapturingRef.current = false;
      if (videoProcessorRef.current) videoProcessorRef.current.cleanup();
      if (canvasContainerRef.current) document.body.removeChild(canvasContainerRef.current);
    };
  }, []);

  // --- WebSocket and Frame Logic ---
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const metrics: HealthMetrics = JSON.parse(event.data);
      if (metrics.error) {
        setStatus(metrics.error);
        return;
      }
      setIsFaceDetected(metrics.face_detected);
      // Use current_bpm/current_spo2 if present, otherwise fallback to bpm/spo2
      const bpmValue = metrics.current_bpm ?? metrics.bpm;
      if (bpmValue !== undefined && bpmValue !== null) {
        setBpm(Math.round(bpmValue));
        setBpmHistory(prev => [
          ...prev,
          {
            time: new Date().toISOString(),
            value: Math.round(bpmValue),
            frame: metrics.frame_count || 0,
          },
        ].slice(-BUFFER_SIZE));
        setBpmCount(prev => prev + 1);
      }
      const spo2Value = metrics.current_spo2 ?? metrics.spo2;
      if (spo2Value !== undefined && spo2Value !== null && spo2Value >= 70 && spo2Value <= 100) {
        const roundedSpO2 = Math.round(spo2Value);
        setSpO2(roundedSpO2);
        setSpO2History(prev => [
          ...prev,
          {
            time: new Date().toISOString(),
            value: roundedSpO2,
            frame: metrics.frame_count || 0,
          },
        ].slice(-BUFFER_SIZE));
        setSpO2Count(prev => prev + 1);
      }
      if (metrics.buffer_progress !== undefined) setBufferProgress(metrics.buffer_progress);
      if (metrics.average_bpm !== undefined) setAverageBpm(metrics.average_bpm);
      if (metrics.average_spo2 !== undefined) setAverageSpO2(metrics.average_spo2);
      // Update status with both BPM and SpO2
      if (metrics.face_detected) {
        const statusParts = [];
        if (bpmValue !== undefined && bpmValue !== null) statusParts.push(`BPM: ${Math.round(bpmValue)}`);
        if (spo2Value !== undefined && spo2Value !== null) statusParts.push(`SpO2: ${Math.round(spo2Value)}%`);
        setStatus(statusParts.join(' | '));
      } else {
        setStatus('Please position your face in the center');
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, []);

  // ... (rest of App.tsx logic, including WebSocket connection, sendFrame, start/stop monitoring, and JSX)

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-teal-950 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Heart className="text-teal-600 dark:text-teal-400" size={ 24 } />
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              Health Vital
            </h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <CameraView videoRef={ videoRef } isMonitoring={ isMonitoring } />
              {/* WebSocket Connection Status */ }
              <div className="text-xs text-center mb-2">
                <span className={ isConnected ? "text-green-600" : "text-red-600" }>
                  { isConnected ? "WebSocket Connected" : "WebSocket Disconnected" }
                </span>
              </div>
              {/* Status Bar */ }
              { status && (
                <>
                  <div className="text-xs text-center mb-2">
                    Frames processed: { frameCount } | SpO₂ readings: { spo2Count }
                  </div>
                  <div className="mt-2 mb-2 text-center text-sm text-blue-700 dark:text-blue-300">
                    { status }
                  </div>
                </>
              ) }
              <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                { isMonitoring && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                      style={ { width: '100%' } }
                    ></div>
                  </div>
                ) }
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={ isMonitoring ? () => { } : () => { } }
                  className={ `flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all ${isMonitoring
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-teal-500 hover:bg-teal-600'
                    }` }
                >
                  { isMonitoring ? (
                    <>
                      <Activity size={ 20 } /> Stop Monitoring
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={ 20 } /> Start Monitoring
                    </>
                  ) }
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HeartRateDisplay
                bpm={ bpm }
                isMonitoring={ isMonitoring }
                isFaceDetected={ isFaceDetected }
                status={ `BPM: ${Math.round(bpm)}` }
                qualityStatus={ qualityStatus }
                isCalibrating={ isCalibrating }
              />
              <SpO2Display
                spo2={ Math.round(spo2) }
                isMonitoring={ isMonitoring }
                isFaceDetected={ isFaceDetected }
                status={ `SpO2: ${Math.round(spo2)}%` }
                qualityStatus={ qualityStatus }
                isCalibrating={ isCalibrating }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  Heart Rate History
                </h2>
                <div className="h-[300px]">
                  <BPMChart data={ bpmHistoryGraph } />
                </div>
                { averageBpm && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                      Final Average BPM: { Math.round(averageBpm) }
                    </p>
                  </div>
                ) }
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  Oxygen Saturation History
                </h2>
                <div className="h-[300px]">
                  <SpO2Chart data={ spo2HistoryGraph } />
                </div>
                { averageSpO2 && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                      Final Average SpO2: { Math.round(averageSpO2) }%
                    </p>
                  </div>
                ) }
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
