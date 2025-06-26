import { RefObject } from 'react';
import { Camera } from 'lucide-react';

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isMonitoring: boolean;
  signalQuality?: number; // 0-1 scale
  facePosition?: { x: number; y: number; size: number } | null;
}

const CameraView: React.FC<CameraViewProps> = ({ 
  videoRef, 
  isMonitoring,
  signalQuality = 0,
  facePosition = null
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
      {/* Camera feed placeholder */}
      {!isMonitoring && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Camera size={48} className="mx-auto mb-2" />
            <p>Camera feed will appear here</p>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
        width={320} 
        height={240}
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Signal quality indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200 dark:bg-gray-600">
        <div 
          className={`h-full ${signalColor} transition-all duration-500`}
          style={{ width: signalWidth }}
        />
      </div>

      {/* Face positioning guides */}
      {isMonitoring && (
        <div className="absolute inset-0 border-4 border-dashed border-white/20 rounded-lg pointer-events-none" />
      )}

      {/* Face position feedback */}
      {isMonitoring && facePosition && (
        <div 
          className="absolute border-2 border-green-400 rounded-full transition-all duration-300"
          style={{
            left: `${facePosition.x * 100}%`,
            top: `${facePosition.y * 100}%`,
            width: `${facePosition.size * 100}%`,
            aspectRatio: '1/1',
            transform: 'translate(-50%, -50%)',
            opacity: 0.7
          }}
        />
      )}

      {/* Status messages */}
      {isMonitoring && (
        <div className="absolute top-2 left-2 right-2 text-center">
          <div className="inline-block bg-black/70 text-white text-xs px-2 py-1 rounded">
            {signalQuality > 0.7 ? '✓ Good signal' : 
             signalQuality > 0.4 ? '✓ Weak signal' : '✗ Adjust position'}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraView;