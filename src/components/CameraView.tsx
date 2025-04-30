import { RefObject } from 'react';
import { Camera } from 'lucide-react';

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isMonitoring: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ videoRef, isMonitoring }) => {
  return (
    <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
      {!isMonitoring && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Camera size={48} className="mx-auto mb-2" />
            <p>Camera feed will appear here</p>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
        width={320} 
        height={240}
      />
    </div>
  );
};

export default CameraView;