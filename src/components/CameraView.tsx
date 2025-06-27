import { RefObject } from 'react';
import { Camera } from 'lucide-react';

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isMonitoring: boolean;
  signalQuality?: number; // 0-1 scale
  facePosition?: { x: number; y: number; size: number } | null;
  faceDetectionError?: string;  // Add this line
  guidance?: string[];  // Add this line
  isFaceDetected?: boolean;  // Add this line
}

const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  isMonitoring,
  signalQuality = 0,
  facePosition = null,
  faceDetectionError = '',
  guidance = [],
  isFaceDetected = false,
}) => {
  // Calculate signal quality color
  const getSignalColor = (quality: number) => {
    if (quality > 0.7) return 'bg-green-500';
    if (quality > 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const signalColor = getSignalColor(signalQuality);
  const signalWidth = `${Math.max(10, signalQuality * 100)}%`;

  return (
    <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
      {/* Camera feed placeholder */ }
      { !isMonitoring && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Camera size={ 48 } className="mx-auto mb-2" />
            <p>Camera feed will appear here</p>
          </div>
        </div>
      ) }

      {/* Video element */ }
      <div className="relative w-full h-full">
        <video
          ref={ videoRef }
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          width={ 320 }
          height={ 240 }
          style={ { transform: 'scaleX(-1)' } }
        />
        
        {/* Round face detection guide */}
        {isMonitoring && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-white/30 pointer-events-none">
            {isFaceDetected ? (
              <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse" />
            ) : (
              <div className="absolute inset-0 rounded-full border-4 border-red-400/50" />
            )}
            
            {/* Center crosshair */}
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-white/50 transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 h-4 w-0.5 bg-white/50 transform -translate-x-1/2 -translate-y-1/2" />
            
            {/* Position indicators */}
            <div className="absolute top-2 left-1/2 w-1 h-2 bg-white/50 transform -translate-x-1/2" />
            <div className="absolute bottom-2 left-1/2 w-1 h-2 bg-white/50 transform -translate-x-1/2" />
            <div className="absolute left-2 top-1/2 w-2 h-1 bg-white/50 transform -translate-y-1/2" />
            <div className="absolute right-2 top-1/2 w-2 h-1 bg-white/50 transform -translate-y-1/2" />
          </div>
        )}
      </div>

      {/* Signal quality indicator */ }
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 dark:bg-gray-600">
        <div
          className={ `h-full ${signalColor} transition-all duration-500` }
          style={ { width: signalWidth } }
        />
      </div>

      {/* Face positioning guides */ }
      { isMonitoring && (
        <div className="absolute inset-0 border-4 border-dashed border-white/20 rounded-lg pointer-events-none" />
      ) }

      {/* Face position feedback */ }
      { isMonitoring && facePosition && (
        <div
          className="absolute border-2 border-green-400 rounded-full transition-all duration-300"
          style={ {
            left: `${facePosition.x * 100}%`,
            top: `${facePosition.y * 100}%`,
            width: `${facePosition.size * 100}%`,
            aspectRatio: '1/1',
            transform: 'translate(-50%, -50%)',
            opacity: 0.7
          } }
        />
      ) }

      {/* Status messages */ }
      { isMonitoring && (
        <div className="absolute top-2 left-2 right-2 text-center">
          <div className="inline-block bg-black/70 text-white text-xs px-2 py-1 rounded">
            { signalQuality > 0.7 ? '' :
              signalQuality > 0.4 ? 'Weak signal' : '✗ Adjust position' }
            {/* {signalQuality > 0 && ` (${Math.round((signalQuality) * 100)}%)`} */ }
          </div>
        </div>
      ) }
      {/* Face detection guidance overlay */ }
      { isMonitoring && !isFaceDetected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-2xl mb-2">👤</div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                No Face Detected
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                { faceDetectionError || "Please ensure your face is:" }
              </p>
              { guidance && guidance.length > 0 && (
                <ul className="text-left text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  { guidance.map((item, index) => (
                    <li key={ index } className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{ item }</span>
                    </li>
                  )) }
                </ul>
              ) }
            </div>
          </div>
        </div>
      ) }
    </div>
  );
};

export default CameraView;