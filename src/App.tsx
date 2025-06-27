import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Activity, RefreshCcw } from 'lucide-react';
import BPMChart from './components/BPMChart';
import SpO2Chart from './components/SpO2Chart';
import HeartRateDisplay from './components/HeartRateDisplay';
import SpO2Display from './components/SpO2Display';
import CameraView from './components/CameraView';
import { VideoProcessor } from './utils/videoProcessor';
export const MIN_FACE_SIZE = 100; // Minimum face size in pixels

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
  signal_quality?: number;  // Add this line
  face_position?: {        // Add this interface
    x: number;
    y: number;
    size: number;
  };
}

const USE_MOCK_MODE = false;

function App() {
  const [ bpm, setBpm ] = useState<number>(0);
  const [ spo2, setSpO2 ] = useState<number>(0);
  const [ isMonitoring, setIsMonitoring ] = useState(false);

  // Full history states
  const [ fullBpmHistory, setFullBpmHistory ] = useState<{ time: string; value: number; frame: number }[]>([]);
  const [ fullSpo2History, setFullSpo2History ] = useState<{ time: string; value: number; frame: number }[]>([]);

  // Graph states (showing either full or partial history)
  const [ bpmHistoryGraph, setBpmHistoryGraph ] = useState<{ time: string; value: number; frame: number }[]>([]);
  const [ spo2HistoryGraph, setSpO2HistoryGraph ] = useState<{ time: string; value: number; frame: number }[]>([]);
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
  const [ signalQuality, setSignalQuality ] = useState(0);
  const [ facePosition, setFacePosition ] = useState<{ x: number, y: number, size: number } | null>(null);
  // Frame rate is controlled by the backend
  // We'll let the backend decide the optimal frame rate
  // Exporting to mark as used - this is needed for face detection
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

      // Clear all timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current);
        frameTimeoutRef.current = undefined;
      }

      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }

      // Close WebSocket connection if it exists
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null; // Remove the close handler to prevent reconnection
          wsRef.current.close(1000, 'Component unmounting');
        } catch (e) {
          console.warn('Error closing WebSocket during cleanup:', e);
        }
        wsRef.current = null;
      }

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

  const connectWebSocket = useCallback(() => {
    if (USE_MOCK_MODE) {
      console.log('Using mock mode - no WebSocket connection needed');
      setStatus('Mock mode active - Processing frames locally');
      setIsConnected(true);
      return;
    }

    // Clean up existing connection if any
    if (wsRef.current) {
      console.log('Cleaning up existing WebSocket connection...');
      // Remove all event listeners to prevent memory leaks
      const ws = wsRef.current;
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;

      // Only close if not already in closing/closed state
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close(1000, 'Reconnecting...');
        } catch (e) {
          console.warn('Error closing WebSocket during cleanup:', e);
        }
      }
      wsRef.current = null;
    }

    console.log(`Attempting to connect to WebSocket (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})...`);

    try {
      // Create new WebSocket connection without protocol specification
      const ws = new WebSocket('ws://localhost:8000/ws/heart-rate');
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established successfully');
        reconnectAttemptsRef.current = 0;
        setStatus('Connected to server - Starting frame capture...');
        setIsConnected(true);

        // If we're already capturing, restart frame capture with a small delay
        if (isCapturingRef.current) {
          console.log('Restarting frame capture after WebSocket reconnection...');
          // Small delay to ensure connection is fully established
          setTimeout(() => {
            if (isCapturingRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
              sendFrame();
            }
          }, 100);
        }
      };

      ws.onmessage = async (event) => {
        try {
          // Only process if we have valid data
          if (!event.data) {
            console.warn('Received empty WebSocket message');
            return;
          }
          
          // Handle both string and binary data
          let data: HealthMetrics | { type: string };
          if (typeof event.data === 'string') {
            try {
              data = JSON.parse(event.data);
              // console.warn('Received WebSocket message',data);

              // Handle ping/pong messages
              if ('type' in data && data.type === 'ping') {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send('pong');
                }
                return;
              }

              // Handle metrics data using the dedicated handler
              if ('face_detected' in data && data.face_detected !== undefined) {
                handleWebSocketMessage({
                  data: JSON.stringify(data as HealthMetrics)
                } as MessageEvent);
                return;
              }
            } catch (e) {
              console.error('Error parsing message:', e);
              return;
            }
          } else {
            // Handle binary data (if any)
            console.warn('Received binary data, ignoring');
            return;
          }

          const metrics: HealthMetrics = data;

          if (metrics.face_detected !== undefined) {
            setIsFaceDetected(metrics.face_detected);
            if (!metrics.face_detected) {
              setStatus(metrics.error || "No face detected. Please adjust your position.");
            } else {
              setStatus("");
            }
          }

          if (metrics.error) {
            console.error('Server error:', metrics.error);
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
                    setFullBpmHistory(prev => {
                      const newHistory = [ ...prev ];
                      const frameIndex = newHistory.findIndex(d => d.frame === metrics.frame_count);
                      if (frameIndex !== -1) {
                        newHistory[ frameIndex ] = {
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

              // Update BPM and SpO2 values
              if (metrics.average_bpm != null && !isNaN(metrics.average_bpm)) {
                const roundedBpm = Math.max(0, Math.round(Number(metrics.average_bpm)));
                setAverageBpm(roundedBpm);
                setBpm(roundedBpm);

                // Update BPM history
                setFullBpmHistory(prevFullBpmHistory => {
                  const now = new Date();
                  const timeStr = now.toISOString();
                  const newDataPoint = {
                    time: timeStr,
                    value: roundedBpm,
                    frame: metrics.frame_count || 0
                  };

                  // Add to full history
                  const updatedFullHistory = [ ...prevFullBpmHistory, newDataPoint ];

                  // For the graph, show either the full history or last 20 points based on monitoring state
                  if (isMonitoring) {
                    setBpmHistoryGraph(updatedFullHistory.slice(-20));
                  } else {
                    setBpmHistoryGraph(updatedFullHistory);
                  }

                  return updatedFullHistory;
                });

                setStatus(`Current BPM: ${roundedBpm}`);
              } else {
                setStatus(`Face detected - Collecting data: ${bufferProgress}% (Frame ${metrics.frame_count || 0})`);
              }

              // Update SpO2 if available
              if (metrics.average_spo2 != null && !isNaN(metrics.average_spo2)) {
                const roundedSpO2 = Math.max(0, Math.min(100, Math.round(Number(metrics.average_spo2))));
                setAverageSpO2(roundedSpO2);
                setSpO2(roundedSpO2);

                // Update SpO2 history
                setFullSpo2History(prevFullSpo2History => {
                  const now = new Date();
                  const timeStr = now.toISOString();
                  const newDataPoint = {
                    time: timeStr,
                    value: roundedSpO2,
                    frame: metrics.frame_count || 0
                  };

                  // Add to full history
                  const updatedFullHistory = [ ...prevFullSpo2History, newDataPoint ];

                  // For the graph, show either the full history or last 20 points based on monitoring state
                  if (isMonitoring) {
                    setSpO2HistoryGraph(updatedFullHistory.slice(-20));
                  } else {
                    setSpO2HistoryGraph(updatedFullHistory);
                  }

                  return updatedFullHistory;
                });
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

      ws.onerror = (error) => {
        console.error('WebSocket error:', {
          error,
          readyState: ws.readyState,
          url: ws.url,
          timestamp: new Date().toISOString()
        });
        setStatus('Connection error. Attempting to reconnect...');

        // Force close the connection on error to ensure clean reconnection
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close(1006, 'Error occurred');
          }
        } catch (e) {
          console.warn('Error closing WebSocket after error:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          readyState: ws.readyState,
          timestamp: new Date().toISOString()
        });

        setIsConnected(false);

        // Don't attempt to reconnect if the closure was intentional
        if (event.code === 1000 && event.reason === 'Component unmounting') {
          console.log('WebSocket closed intentionally, not reconnecting');
          return;
        }

        // Only reconnect if we're still supposed to be connected
        if (isCapturingRef.current) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current - 1), 30000); // Max 30s

          console.log(`WebSocket closed, attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`);

          // Only reconnect if we're not already in the process of connecting
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isCapturingRef.current && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
                console.log('Initiating WebSocket reconnection...');
                connectWebSocket();
              }
              reconnectTimeoutRef.current = undefined;
            }, delay);
          }
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setStatus('Failed to create WebSocket connection');
      setIsConnected(false);
    }
  }, [ isCapturing, isMonitoring ]);

  const startMonitoring = async () => {
    if (!videoRef.current) {
      console.error('No video element available');
      return;
    }

    // Reset all states when starting new monitoring
    setFullBpmHistory([]);
    setFullSpo2History([]);
    setBpmHistoryGraph([]);
    setSpO2HistoryGraph([]);
    setAverageBpm(null);

    // Set monitoring state
    isCapturingRef.current = true;
    setIsCapturing(true);
    setIsMonitoring(true);
    setStatus('Initializing camera...');

    try {
      // Request camera access with optimal settings
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 } // Limit frame rate to reduce load
        },
        audio: false
      });

      // Store stream reference
      videoStreamRef.current = stream;

      // Set up video element
      const video = videoRef.current;
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(reject);
        };
        video.onerror = reject;
      });

      setStatus('Connecting to server...');

      // Connect to WebSocket
      connectWebSocket();

      // Start frame capture loop
      const captureLoop = () => {
        if (!isCapturingRef.current) return;
        sendFrame();
      };

      // Start the capture loop with a small delay to ensure WebSocket is ready
      setTimeout(() => {
        if (isCapturingRef.current) {
          captureLoop();
        }
      }, 500);

      setStatus('Monitoring started - Position your face in the frame');

    } catch (error) {
      console.error('Error starting monitoring:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Failed to access camera'}`);
      stopMonitoring();
    }
  };

  const sendFrame = async () => {
    if (!isCapturingRef.current) return;

    if (USE_MOCK_MODE) {
      try {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');

          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameData = context.getImageData(0, 0, canvas.width, canvas.height);
            const metrics = videoProcessorRef.current?.processFrame(frameData);

            if (metrics?.spo2 !== undefined && metrics.spo2 !== null) {
              const currentSpO2 = metrics.spo2;
              const currentFrame = frameCountRef.current;
              setSpO2(currentSpO2);
              setFullSpo2History(prev => [
                ...prev.slice(-19),
                {
                  time: new Date().toISOString(),
                  value: currentSpO2, // This is now guaranteed to be a number
                  frame: currentFrame
                }
              ]);
              // Increment frame count for next update
              frameCountRef.current += 1;
            }

            if (metrics) {
              setIsFaceDetected(metrics.face_detected);
              setStatus(metrics.face_detected
                ? `Face detected. SpO2: ${metrics.spo2?.toFixed(1) || 'N/A'}%`
                : 'No face detected');
              setQualityStatus(metrics.quality > 0.7 ? 'Good' : 'Poor');
            }
          }
        }
      } catch (error) {
        console.error('Error in mock mode frame processing:', error);
      }
      // Schedule next frame
      if (isCapturingRef.current) {
        requestAnimationFrame(sendFrame);
      }
      return;
    }

    // WebSocket mode
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, attempting to reconnect...');
      // Only reconnect if we're not already in the process of connecting
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isCapturingRef.current && !(wsRef.current?.readyState === WebSocket.CONNECTING)) {
            console.log('Initiating WebSocket reconnection...');
            connectWebSocket();
          }
          reconnectTimeoutRef.current = undefined;
        }, 1000);
      }
      return;
    }

    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        // Capture frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to JPEG with reduced quality for smaller size
        canvas.toBlob(
          (blob) => {
            if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
              try {
                // Send as ArrayBuffer for better performance
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    if (reader.result && wsRef.current?.readyState === WebSocket.OPEN) {
                      wsRef.current.send(reader.result);
                    }
                  } catch (error) {
                    console.error('Error in sending frame:', error);
                    // If sending fails, schedule a reconnection
                    if (wsRef.current) {
                      wsRef.current.close(1000, 'Error sending frame');
                    }
                  }
                };
                reader.onerror = (error) => {
                  console.error('Error reading blob:', error);
                };
                reader.readAsArrayBuffer(blob);
              } catch (error) {
                console.error('Error sending frame:', error);
              }
            }

            // Schedule next frame if still capturing
            if (isCapturingRef.current) {
              // Throttle frame rate to prevent overwhelming the server
              // and give time for WebSocket to process messages
              const frameRate = 10; // Target 10 FPS
              const delay = Math.max(0, 1000 / frameRate - (Date.now() - (lastFrameTimeRef.current || 0)));

              frameTimeoutRef.current = setTimeout(() => {
                if (isCapturingRef.current) {
                  lastFrameTimeRef.current = Date.now();
                  animationFrameRef.current = requestAnimationFrame(sendFrame);
                }
              }, delay);
            }
          },
          'image/jpeg',
          0.7 // Lower quality for better performance
        );
      }
    } catch (error) {
      console.error('Error in frame capture:', error);
      // Schedule next frame even on error to maintain capture loop
      if (isCapturingRef.current) {
        requestAnimationFrame(sendFrame);
      }
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

    // When stopping, show the full history in the graphs
    setBpmHistoryGraph([ ...fullBpmHistory ]);
    setSpO2HistoryGraph([ ...fullSpo2History ]);

    // Log the state for debugging
    console.log('Stopped monitoring. Full history:', {
      bpmHistoryLength: fullBpmHistory.length,
      spo2HistoryLength: fullSpo2History.length,
      bpmHistoryGraphLength: bpmHistoryGraph.length,
      spo2HistoryGraphLength: spo2HistoryGraph.length
    });

    // Stop capturing and update states
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
      // Only close if connection is open or connecting
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        try {
          wsRef.current.onclose = null; // Remove close handler to prevent reconnection
          wsRef.current.close(1000, 'User stopped monitoring');
        } catch (e) {
          console.warn('Error closing WebSocket:', e);
        }
      }
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
        console.error('WebSocket error:', metrics.error);
        setStatus(metrics.error);
        return;
      }

      setIsFaceDetected(metrics.face_detected);

      if (metrics.signal_quality !== undefined) {
        setSignalQuality(metrics.signal_quality);
      }
  
      // Update face position if present
      if (metrics.face_position) {
        setFacePosition(metrics.face_position);
      }

      // Debug log for BPM values
      console.log('Received BPM values:', {
        current_bpm: metrics.current_bpm,
        bpm: metrics.bpm,
        frame: metrics.frame_count,
        buffer_progress: metrics.buffer_progress
      });

      // Use current_bpm/current_spo2 if present, otherwise fallback to bpm/spo2
      const bpmValue = metrics.current_bpm ?? metrics.bpm;
      const hasValidBpm = bpmValue !== null && bpmValue !== undefined;

      // Always update the status to reflect if we have a valid BPM reading
      if (metrics.face_detected && !hasValidBpm) {
        setStatus('Adjust face position for BPM reading...');
      } else if (metrics.face_detected && metrics.buffer_progress && metrics.buffer_progress < 100) {
        setStatus(`Calibrating... ${metrics.buffer_progress}%`);
      }

      if (hasValidBpm) {
        const roundedBpm = Math.round(bpmValue);
        setBpm(roundedBpm);

        // Update full BPM history
        setFullBpmHistory(prev => {
          const newHistory = [ ...prev ];
          newHistory.push({
            time: new Date().toISOString(),
            value: roundedBpm,
            frame: metrics.frame_count || 0
          });
          return newHistory.slice(-BUFFER_SIZE);
        });

        // Update BPM graph display (last 20 points)
        setBpmHistoryGraph(prev => {
          const newGraph = [ ...prev ];
          newGraph.push({
            time: new Date().toISOString(),
            value: roundedBpm,
            frame: metrics.frame_count || 0
          });
          return newGraph.slice(-20);
        });

        setBpmCount(prev => prev + 1);
      }

      const spo2Value = metrics.current_spo2 ?? metrics.spo2;
      if (spo2Value !== undefined && spo2Value !== null && spo2Value >= 70 && spo2Value <= 100) {
        const roundedSpO2 = Math.round(spo2Value);
        setSpO2(roundedSpO2);

        // Update full SpO2 history
        setFullSpo2History(prev => {
          const newHistory = [ ...prev ];
          newHistory.push({
            time: new Date().toISOString(),
            value: roundedSpO2,
            frame: metrics.frame_count || 0
          });
          return newHistory.slice(-BUFFER_SIZE);
        });

        // Update SpO2 graph display (last 20 points)
        setSpO2HistoryGraph(prev => {
          const newGraph = [ ...prev ];
          newGraph.push({
            time: new Date().toISOString(),
            value: roundedSpO2,
            frame: metrics.frame_count || 0
          });
          return newGraph.slice(-20);
        });

        setSpO2Count(prev => prev + 1);
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
        if (bpmValue !== undefined && bpmValue !== null) {
          statusParts.push(`BPM: ${Math.round(bpmValue)}`);
        }
        if (spo2Value !== undefined && spo2Value !== null) {
          statusParts.push(`SpO2: ${Math.round(spo2Value)}%`);
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
            <Heart className="text-teal-600 dark:text-teal-400" size={ 24 } />
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
              <CameraView
                 videoRef={videoRef}
                 isMonitoring={isMonitoring}
                 signalQuality={signalQuality}
                 facePosition={facePosition}
                 isFaceDetected={isFaceDetected}
                 faceDetectionError={status}
                 guidance={[
                   "Positioned in the center of the frame",
                   "Facing the camera directly",
                   "Well-lit with even lighting",
                   "At arm's length from the camera",
                   "Not wearing glasses or accessories that cover your face"
                 ]}
              />
              {/* WebSocket Connection Status */ }
              {/* <div className="text-xs text-center mb-2">
                <span className={isConnected ? "text-green-600" : "text-red-600"}>
                  {isConnected ? "WebSocket Connected" : "WebSocket Disconnected"}
                </span>
              </div> */}

              {/* Status Bar */ }
              {/* {status && (
                <>
                  <div className="text-xs text-center mb-2">
                    Frames processed: {frameCount} | SpO₂ readings: {spo2Count}
                  </div>
                </>
              )} */}
              { status && (
                <div className="mt-2 mb-2 text-center text-sm text-blue-700 dark:text-blue-300">
                  { status }
                </div>
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
                  onClick={ isMonitoring ? stopMonitoring : startMonitoring }
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
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Heart Rate History
              </h2>
              <div className="h-[250px]">
                <BPMChart data={ bpmHistoryGraph } />
              </div>
              { averageBpm && (
                <div className="mt-4 p-4 bg-teal-50 dark:bg-teal-900 rounded-lg">
                  <p className="font-semibold text-teal-600 dark:text-teal-400">
                    Final Average BPM: { averageBpm.toFixed(1) }
                  </p>
                </div>
              ) }
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Oxygen Saturation History
              </h2>
              <div className="h-[250px]">
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
      </main>
    </div>
  );
}

export default App;