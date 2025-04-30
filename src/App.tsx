import { useState, useRef, useEffect } from 'react';
import { Heart, Activity, RefreshCcw } from 'lucide-react';
import BPMChart from './components/BPMChart';
import HeartRateDisplay from './components/HeartRateDisplay';
import CameraView from './components/CameraView';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
// import { Camera } from '@mediapipe/camera_utils';
import FFT from 'fft.js';

const SAMPLE_RATE = 25;           // Frames per second
const BUFFER_SIZE = 450;          // Number of samples to collect (~10 sec of data)
const ROI_INDEXES = [
  // Forehead + upper cheeks (more stable region for rPPG)
  10, 338, 297, 332, 284, // left forehead
  389, 356, 454, 323, 361, // right forehead
  93, 132, 58, 172, 136, 150 // nose/cheek junction
];
const MAX_BPM = 100;              // Upper bound for realistic BPM
const MIN_BPM = 45;               // Lower bound for realistic BPM


function App() {
  const [bpm, setBpm] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const isMonitoringBtn = useRef(false);
  const [bpmHistoryGraph, setBpmHistory] = useState<{ time: string; value: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // const videoRef = useRef(null);
  // const canvasRef = useRef(null);
  // const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // const [bpm, setBpm] = useState(null);
  const [lastBPM, setLastBPM] = useState<number>(0); // store last stable bpm
  const bpmHistory = useRef<number[]>([]);
  const [status, setStatus] = useState('Initializing...');
  const greenChannel = useRef<number[]>([]);  // Buffer to store green values
  // const [lastUpdate, setLastUpdate] = useState(Date.now());
  const lastUpdate = useRef(Date.now());
  const isFaceDetected = useRef(false);

  const startMonitoring = async () => {
    setIsMonitoring(true);
    // isMonitoring.current = true;
    isMonitoringBtn.current = true;
    console.log(`after isMonitoring: `, isMonitoring);
    // Your existing face detection and BPM calculation logic here
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    isMonitoringBtn.current = true;
    // isMonitoring.current = false;
    console.log(`[stopMonitoring] after isMonitoring: `, isMonitoring);
    setBpm(0);
    bpmHistory.current = [];
  };

  useEffect(() => {
    const loadAndStart = async () => {
      setStatus('Loading model...');
      console.log('Loading model...');

      /**
       * Configuring the webcam
       */
      await tf.setBackend('webgl');
      await tf.ready();

      /**
       * Initialize detector object
       */
      const detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          refineLandmarks: true
        }
      );

      // Access webcam
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // 3. Wait until video metadata is loaded (dimensions available)
        await new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = () => resolve(null);
        });

        // 4. Play the video
        await videoRef.current.play();
      }

      const video = videoRef.current;
      console.log(`video : `, !!video);

      if (!video) {
        return;
      }

      // const canvas = canvasRef.current;
      const canvas = document.createElement('canvas');
      console.log(`canvas : `, !!canvas);
      if (!canvas) {
        console.log(`canvas is false, retrying after some time`);
        setTimeout(loadAndStart, 1000);
        return;
      }

      const ctx = canvas.getContext('2d');
      console.log(`ctx : `, !!ctx);
      if (!ctx) {
        return;
      }

      // await new Promise((res) => (video.onloadedmetadata = res));
      video.play();
      setStatus('Scanning for face...');
      console.log('Scanning for face...');

      // Ensure canvas has matching size after video starts
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;

      // Process each frame
      setInterval(async () => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.log(`return from here v`);
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const faces = await detector.estimateFaces(video);

        if (!faces.length) {
          setStatus('Face not detected');
          console.log(`Face not detected`);
          isFaceDetected.current = false;
          setBpm(0);
          return;
        }

        if (isFaceDetected.current === false) {
          setStatus('Face detected, Calculating your BPM....');
          console.log(`Face detected, Calculating your BPM....`);
          isFaceDetected.current = true;
        }

        /**
         * To check only when monitoring is started
         */
        if (isMonitoringBtn.current) {
          const keypoints = faces[0].keypoints;

          // Extract green values from chosen ROI keypoints
          let greenSum = 0;
          ROI_INDEXES.forEach(index => {
            const { x, y } = keypoints[index];
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            greenSum += pixel[1]; // Green channel
          });

          const avgGreen = greenSum / ROI_INDEXES.length;

          greenChannel.current.push(avgGreen);

          // Keep buffer size within limit
          if (greenChannel.current.length > BUFFER_SIZE) {
            greenChannel.current.shift();
          }

          const now = Date.now();
          // Once enough data is collected, estimate BPM
          if (greenChannel.current.length === BUFFER_SIZE && now - lastUpdate.current >= 3000) {
            const bpmVal: number = calculateBPM(greenChannel.current, SAMPLE_RATE);

            if (bpmVal >= MIN_BPM && bpmVal <= MAX_BPM) {
              // Keep track of recent BPMs
              bpmHistory.current.push(bpmVal);

              if (bpmHistory.current.length > 5) bpmHistory.current.shift(); // use last 5 readings

              const avgBpm = Math.round(
                bpmHistory.current.reduce((sum, val) => sum + val, 0) / bpmHistory.current.length
              );
              console.log(`avgBpm : `, avgBpm);

              // Only update BPM if jump isn't too wild
              if (!lastBPM || Math.abs(avgBpm - lastBPM) <= 20) {
                console.log(`avgBpm : `, avgBpm);
                setBpm(avgBpm);
                setLastBPM(avgBpm);
                lastUpdate.current = now;

                // Manage setBpmHistory for graph
                const current = new Date();
                const minutes = String(current.getMinutes()).padStart(2, '0');
                const seconds = String(current.getSeconds()).padStart(2, '0');
                const timeFormatted = `${minutes}:${seconds}`;
                console.log(`timeFormatted : `, timeFormatted);
                
                setBpmHistory(prev => [
                  ...prev,
                  { time: timeFormatted, value: avgBpm }
                ].slice(-20)); // Keep last 20 readings


              } else {
                console.log(`Ignored sudden BPM jump to ${avgBpm}`);
              }
              setStatus('Successfully calculated your BPM ....');
            }
          }
        }
      }, 1000 / SAMPLE_RATE);
    };

    loadAndStart();
  }, []);

  /**
     * Apply FFT to extract dominant frequency from green channel signal
     * @param {*} signal 
     * @param {*} sampleRate 
     * @returns 
     */
  const calculateBPM = (signal: number[], sampleRate: number) => {
    const fftSize = Math.pow(2, Math.floor(Math.log2(signal.length)));
    const fft = new FFT(fftSize);
    const input = new Array(fftSize).fill(0);
    for (let i = 0; i < fftSize; i++) {
      input[i] = signal[i];
    }

    const out = fft.createComplexArray();
    fft.realTransform(out, input);
    fft.completeSpectrum(out);

    const powers: number[] = [];
    for (let i = 0; i < fftSize / 2; i++) {
      const re = out[2 * i];
      const im = out[2 * i + 1];
      powers.push(Math.sqrt(re * re + im * im));
    }

    const freqs = powers.map((_, i) => (i * sampleRate) / fftSize);
    const minHz = 0.7, maxHz = 3.0; // 42–180 BPM
    const bpmCandidates = freqs.map((f, i) => ({
      freq: f,
      power: powers[i],
      bpm: f * 60
    })).filter(x => x.freq >= minHz && x.freq <= maxHz);

    const peak = bpmCandidates.reduce((a, b) => (a.power > b.power ? a : b), bpmCandidates[0]);

    return Math.round(peak.bpm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white dark:from-teal-950 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Heart className="text-teal-600 dark:text-teal-400" size={24} />
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              Heart Rate Monitor
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <CameraView videoRef={videoRef} isMonitoring={isMonitoring} />

              <div className="mt-6 flex justify-center">
                <button
                  onClick={isMonitoring ? stopMonitoring : startMonitoring}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all ${isMonitoring
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

            <HeartRateDisplay bpm={bpm} isMonitoring={isMonitoring} isFaceDetected={isFaceDetected.current} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Heart Rate History
            </h2>
            <BPMChart data={bpmHistoryGraph} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;