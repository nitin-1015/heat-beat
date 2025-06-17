import { useState, useRef, useEffect } from 'react';
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
  const [bpm, setBpm] = useState<number>(0);
  const [spo2, setSpO2] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [bpmHistoryGraph, setBpmHistory] = useState<{ time: string; value: number; frame: number }[]>([]);
  const [spo2HistoryGraph, setSpO2History] = useState<{ time: string; value: number; frame: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds
  const [frameCount, setFrameCount] = useState<number>(0);
  const [bufferProgress, setBufferProgress] = useState(0);
  const frameCountRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const videoStreamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const isCapturingRef = useRef<boolean>(false);
  const [averageBpm, setAverageBpm] = useState<number | null>(null);
  const [averageSpO2, setAverageSpO2] = useState<number | null>(null);
  const [bpmCount, setBpmCount] = useState<number>(0);
  const [spo2Count, setSpO2Count] = useState<number>(0);
  const FRAME_RATE = 5; // Reduced to 5 FPS for better accuracy
  const FRAME_INTERVAL = 1000 / FRAME_RATE; // 200ms between frames
  const MIN_FACE_SIZE = 100; // Minimum face size in pixels
  // Minimum image quality threshold (currently not used)
  // const QUALITY_THRESHOLD = 0.7;
  const BUFFER_SIZE = 100; // Define BUFFER_SIZE
  const [qualityStatus, setQualityStatus] = useState<string>("");
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const videoProcessorRef = useRef<VideoProcessor | null>(null);
  const qualityStatusTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    isCapturingRef.current = isCapturing;
  }, [isCapturing]);

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
      // Reset video processor
      if (videoProcessorRef.current) {
        videoProcessorRef.current.reset();
      }
      
      // Clean up canvas
      if (canvasContainerRef.current) {
        // Remove all children (canvas) from container
        while (canvasContainerRef.current.firstChild) {
          canvasContainerRef.current.removeChild(canvasContainerRef.current.firstChild);
        }
        // Remove container from DOM
        if (canvasContainerRef.current.parentNode) {
          canvasContainerRef.current.parentNode.removeChild(canvasContainerRef.current);
        }
        canvasContainerRef.current = null;
      }
      
      // Clear canvas reference
      canvasRef.current = null;
    };
  }, []);

  const connectWebSocket = () => {
    if (USE_MOCK_MODE) {
        console.log('Using mock mode - no WebSocket connection needed');
        setStatus('Mock mode active - Processing frames locally');
        setIsConnected(true);
        return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
    }

    console.log('Attempting to connect to WebSocket...');
    
    try {
      wsRef.current = new WebSocket('ws://localhost:8000/ws/heart-rate');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connection established successfully');
        setStatus('Connected to server - Starting frame capture...');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // If we're already capturing, restart frame capture
        if (isCapturingRef.current) {
          console.log('Restarting frame capture after WebSocket reconnection...');
          sendFrame();
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const metrics: HealthMetrics = JSON.parse(event.data);
          
          if (metrics.error) {
            setStatus(`Error: ${metrics.error}`);
            setQualityStatus("Error in measurement");
            return;
          }
          
          // Check quality before updating BPM
          if (checkQuality(metrics)) {
            setIsFaceDetected(metrics.face_detected);
            
            if (metrics.face_detected) {
              // Update frame count and progress
              if (metrics.frame_count) {
                setFrameCount(metrics.frame_count);
                const progress = Math.round((metrics.buffer_progress || 0));
                setBufferProgress(progress);
              }
              
              // Always try to get BPM value for each frame
              if (metrics.frame_count !== undefined) {
                const bpmValue = metrics.average_bpm !== undefined ? metrics.average_bpm : metrics.bpm;
                
                if (bpmValue !== undefined && bpmValue !== null) {
                  const currentBpm = Math.round(bpmValue);
                  
                  // Only update BPM if quality is good
                  if (!isCalibrating) {
                    setBpmHistory(prev => {
                      const newHistory = [...prev];
                      const frameIndex = newHistory.findIndex(d => d.frame === metrics.frame_count);
                      if (frameIndex !== -1) {
                        newHistory[frameIndex] = {
                          time: new Date().toISOString(),
                          value: currentBpm,
                          frame: metrics.frame_count || 0  // Provide fallback for frame_count
                        };
                      } else {
                        // Add new entry with current BPM and frame count
                        const newEntry = {
                          time: new Date().toISOString(),
                          value: currentBpm,
                          frame: metrics.frame_count || 0  // Provide fallback for frame_count
                        };
                        newHistory.push(newEntry);
                      }
                      
                      // Sort by frame number and keep only the last 20 entries
                      return newHistory
                        .sort((a, b) => a.frame - b.frame)
                        .slice(-20);
                    });
                    
                    setBpm(currentBpm);
                  }
                }
              }

              // Update status with current BPM
              if (metrics.average_bpm != null && !isNaN(metrics.average_bpm)) {
                // Safely round the BPM value, ensuring it's a valid number
                const roundedBpm = Math.max(0, Math.round(Number(metrics.average_bpm)));
                setAverageBpm(roundedBpm);
                setBpm(roundedBpm);
                setStatus(`Current BPM: ${roundedBpm}`);
              } else {
                setStatus(`Face detected - Collecting data: ${bufferProgress}% (Frame ${metrics.frame_count || 0})`);
              }
            } else {
              setStatus('Face not detected - Please position your face in the center of the camera');
              setAverageBpm(null);
              setBpm(0);
              setBufferProgress(0);
            }
          }
        } catch (error) {
          console.error('Error processing server message:', error);
          setStatus('Error processing server response');
          setQualityStatus("Error in processing");
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error details:', {
          error,
          readyState: wsRef.current?.readyState,
          url: wsRef.current?.url,
          timestamp: new Date().toISOString()
        });
        setStatus('Connection error - Please check if server is running');
        setIsConnected(false);
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });
        setIsConnected(false);
        
        // Only attempt reconnect if we're still monitoring and haven't reached max attempts
        if (isMonitoring && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);
          setStatus(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, RECONNECT_DELAY);
        } else if (isMonitoring) {
          console.log('Max reconnection attempts reached');
          setStatus('Failed to reconnect. Please check if server is running and try again.');
          stopMonitoring();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setStatus('Failed to create WebSocket connection');
      setIsConnected(false);
    }
  };

  const startMonitoring = async () => {
    if (!videoRef.current) {
      console.error('No video element available');
      return;
    }
    
    // Reset all states at the beginning
    isCapturingRef.current = true;
    setIsCapturing(true);
    setIsMonitoring(true);
    setStatus('Starting monitoring...');
    setFrameCount(0);
    frameCountRef.current = 0;
    setBufferProgress(0);
    setBpmHistory([]); // Clear BPM history
    setBpmCount(0);
    setAverageBpm(null);
    setBpm(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: FRAME_RATE, max: FRAME_RATE }
        } 
      });
      
      videoStreamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        if (videoRef.current?.readyState === 4) {
          resolve(true);
        } else {
          videoRef.current!.onloadeddata = () => resolve(true);
        }
      });
      
      // Connect to WebSocket first
      connectWebSocket();
      
      // Start frame capture loop
      const captureFrame = async () => {
        if (isCapturingRef.current) {
          await sendFrame();
          frameCountRef.current++;
          setFrameCount(frameCountRef.current);
          animationFrameRef.current = requestAnimationFrame(captureFrame);
        }
      };
      
      // Start frame capture after a short delay
      setTimeout(() => {
        if (isCapturingRef.current) {
          captureFrame();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error starting monitoring:', error);
      setStatus('Failed to start monitoring');
      setIsMonitoring(false);
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  const sendFrame = async () => {
    if (USE_MOCK_MODE) {
        console.log('Processing frame in mock mode');
        try {
            if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                
                if (context) {
                    // Draw video frame to canvas
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    console.log('Frame drawn to canvas');
                    
                    // Get frame data and process it
                    const frameData = context.getImageData(0, 0, canvas.width, canvas.height);
                    console.log('Frame data captured, size:', frameData.data.length);
                    
                    const metrics = videoProcessorRef.current?.processFrame(frameData);
                    console.log('Processed metrics:', metrics);
                    
                    if (metrics) {
                        // Update state with processed metrics
                        if (metrics.spo2 !== null) {
                            setSpO2(metrics.spo2);
                            setSpO2History(prev => {
                                // Ensure we have valid SpO2 data
                                const spo2Value = typeof metrics.spo2 === 'number' ? metrics.spo2 : 0;
                                
                                // Create new history entry with consistent time format
                                const newEntry = {
                                    time: new Date().toISOString(),
                                    value: spo2Value,
                                    frame: frameCount
                                };
                                
                                // Combine with previous history, keeping only last 20 entries
                                return [...prev, newEntry].slice(-20);
                            });
                            console.log('Updated SpO2:', metrics.spo2);
                        }
                        
                        if (metrics.face_detected) {
                            setIsFaceDetected(true);
                            setStatus(`Face detected. SpO2: ${metrics.spo2?.toFixed(1) || 'N/A'}%`);
                            console.log('Face detected, quality:', metrics.quality);
                        } else {
                            setIsFaceDetected(false);
                            setStatus('No face detected');
                            console.log('No face detected');
                        }
                        
                        setQualityStatus(metrics.quality > 0.7 ? 'Good' : 'Poor');
                    }
                }
            }
        } catch (error) {
            console.error('Error processing frame in mock mode:', error);
        }
        return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, attempting to reconnect...');
      await connectWebSocket();
      return;
    }

    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Draw video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          console.log('Frame drawn to canvas');
          
          // Get frame data and process it
          const frameData = context.getImageData(0, 0, canvas.width, canvas.height);
          console.log('Frame data captured, size:', frameData.data.length);
          
          const metrics = videoProcessorRef.current?.processFrame(frameData);
          console.log('Processed metrics:', metrics);
          
          if (metrics) {
            // Update state with processed metrics
            if (metrics.spo2 !== null) {
              setSpO2(metrics.spo2);
              setSpO2History(prev => {
                const newHistory = [...prev, {
                  time: new Date().toISOString(),
                  value: metrics.spo2!,
                  frame: frameCount
                }];
                // Keep only the last 20 readings
                return newHistory.slice(-20);
              });
              console.log('Updated SpO2:', metrics.spo2);
            }
            
            if (metrics.face_detected) {
              setIsFaceDetected(true);
              setStatus(`Face detected. SpO2: ${metrics.spo2?.toFixed(1) || 'N/A'}%`);
              console.log('Face detected, quality:', metrics.quality);
            } else {
              setIsFaceDetected(false);
              setStatus('No face detected');
              console.log('No face detected');
            }
            
            setQualityStatus(metrics.quality > 0.7 ? 'Good' : 'Poor');
          }
          
          // Convert canvas to blob and send
          canvas.toBlob((blob) => {
            if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
              console.log('Sending frame to server, size:', blob.size);
              wsRef.current.send(blob);
            } else {
              console.log('Cannot send frame - WebSocket not ready or blob is null');
            }
          }, 'image/jpeg', 0.8);
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  };

  const stopMonitoring = () => {
    console.log('Stopping monitoring:', {
      frameCount: frameCountRef.current,
      timestamp: new Date().toISOString(),
      metrics: {
        totalFrames: frameCountRef.current,
        bufferProgress: bufferProgress,
        isFaceDetected: isFaceDetected,
        averageBpm: averageBpm,
        bpmCount: bpmCount
      }
    });
    
    // Stop capturing immediately
    isCapturingRef.current = false;
    setIsCapturing(false);
    setIsMonitoring(false);
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    // Close WebSocket connection gracefully
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Stop video stream
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => {
        console.log('Stopping video track:', {
          label: track.label,
          timestamp: new Date().toISOString(),
          trackState: {
            enabled: track.enabled,
            readyState: track.readyState,
            muted: track.muted
          }
        });
        track.stop();
      });
      videoStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Reset all states
    setAverageBpm(null);
    setIsFaceDetected(false);
    setFrameCount(0);
    frameCountRef.current = 0;
    setBufferProgress(0);
    setBpm(0);
    setBpmHistory([]);
    setBpmCount(0);
  };

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  // Add debounced quality status update
  const updateQualityStatus = (status: string) => {
    if (qualityStatusTimeoutRef.current) {
      clearTimeout(qualityStatusTimeoutRef.current);
    }
    qualityStatusTimeoutRef.current = setTimeout(() => {
      setQualityStatus(status);
    }, 1000); // Wait 1 second before updating
  };

  useEffect(() => {
    return () => {
      if (qualityStatusTimeoutRef.current) {
        clearTimeout(qualityStatusTimeoutRef.current);
      }
    };
  }, []);

  // Update the checkQuality function
  const checkQuality = (metrics: HealthMetrics) => {
    if (!metrics.face_detected) {
      updateQualityStatus("Please position your face in the center");
      return false;
    }
    
    if (metrics.buffer_progress && metrics.buffer_progress < 20) {
      updateQualityStatus("Calibrating... Please stay still");
      setIsCalibrating(true);
      return false;
    }
    
    if (metrics.buffer_progress && metrics.buffer_progress >= 20) {
      setIsCalibrating(false);
      updateQualityStatus("Good quality signal");
      return true;
    }
    
    return true;
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const metrics: HealthMetrics = JSON.parse(event.data);
      
      if (metrics.error) {
        setStatus(metrics.error);
        return;
      }

      setIsFaceDetected(metrics.face_detected);
      
      if (metrics.bpm !== undefined) {
        setBpm(metrics.bpm);
        setBpmHistory(prev => [...prev, {
          time: new Date().toISOString(),
          value: metrics.bpm!,
          frame: metrics.frame_count || 0
        }].slice(-BUFFER_SIZE));
        setBpmCount(prev => prev + 1);
      }

      if (metrics.spo2 !== undefined) {
        // Validate SpO2 value and round it
        const validSpO2 = metrics.spo2 >= 70 && metrics.spo2 <= 100;
        if (validSpO2) {
          const roundedSpO2 = Math.round(metrics.spo2);
          setSpO2(roundedSpO2);
          setSpO2History(prev => [...prev, {
            time: new Date().toISOString(),
            value: roundedSpO2,
            frame: metrics.frame_count || 0
          }].slice(-BUFFER_SIZE));
          setSpO2Count(prev => prev + 1);
        }
      }

      if (metrics.buffer_progress !== undefined) {
        setBufferProgress(metrics.buffer_progress);
      }

      if (metrics.average_bpm !== undefined) {
        setAverageBpm(metrics.average_bpm);
      }

      if (metrics.average_spo2 !== undefined) {
        setAverageSpO2(metrics.average_spo2);
      }

      // Update status with both BPM and SpO2
      if (metrics.face_detected) {
        const statusParts = [];
        if (metrics.bpm !== undefined) {
          statusParts.push(`BPM: ${Math.round(metrics.bpm)}`);
        }
        if (metrics.spo2 !== undefined) {
          statusParts.push(`SpO2: ${Math.round(metrics.spo2)}%`);
        }
        setStatus(statusParts.join(' | '));
      } else {
        setStatus('Please position your face in the center');
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-teal-950 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Heart className="text-teal-600 dark:text-teal-400" size={24} />
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              Health Monitor
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <CameraView videoRef={videoRef} isMonitoring={isMonitoring} />

              <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                {isMonitoring && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                      className="bg-teal-600 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={isMonitoring ? stopMonitoring : startMonitoring}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all ${
                    isMonitoring
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-teal-500 hover:bg-teal-600'
                  }`}
                >
                  {isMonitoring ? (
                    <>
                      <Activity size={20} /> Stop Monitoring
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={20} /> Start Monitoring
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HeartRateDisplay 
                bpm={bpm} 
                isMonitoring={isMonitoring} 
                isFaceDetected={isFaceDetected} 
                status={`BPM: ${Math.round(bpm)}`}
                qualityStatus={qualityStatus}
                isCalibrating={isCalibrating}
              />
              <SpO2Display 
                spo2={Math.round(spo2)} 
                isMonitoring={isMonitoring} 
                isFaceDetected={isFaceDetected} 
                status={`SpO2: ${Math.round(spo2)}%`}
                qualityStatus={qualityStatus}
                isCalibrating={isCalibrating}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Heart Rate History
              </h2>
              <div className="h-[300px]">
                <BPMChart data={bpmHistoryGraph} />
              </div>
              {averageBpm && (
                <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-900 rounded-lg">
                  <p className="font-semibold text-teal-600 dark:text-teal-400">
                    Final Average BPM: {averageBpm.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Oxygen Saturation History
              </h2>
              <div className="h-[300px]">
                <SpO2Chart data={spo2HistoryGraph} />
              </div>
              {averageSpO2 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    Final Average SpO2: {Math.round(averageSpO2)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;