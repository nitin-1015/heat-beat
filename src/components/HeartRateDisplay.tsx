import { Heart } from 'lucide-react';

interface HeartRateDisplayProps {
  bpm: number;
  isMonitoring: boolean;
  isFaceDetected: boolean;
  status: string;
  qualityStatus: string;
  isCalibrating: boolean;
}

const HeartRateDisplay = ({ 
  bpm, 
  isMonitoring, 
  isFaceDetected, 
  status,
  qualityStatus,
  isCalibrating 
}: HeartRateDisplayProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
            isMonitoring 
              ? isFaceDetected 
                ? 'bg-teal-100 dark:bg-teal-900' 
                : 'bg-red-100 dark:bg-red-900'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <Heart 
              className={`w-16 h-16 ${
                isMonitoring 
                  ? isFaceDetected 
                    ? 'text-teal-500 dark:text-teal-400' 
                    : 'text-red-500 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`} 
            />
          </div>
          {isMonitoring && isFaceDetected && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-1 rounded-full shadow-md">
              <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {bpm > 0 ? bpm : '--'}
              </span>
              {bpm > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  BPM
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className={`text-lg font-medium ${
            isMonitoring 
              ? isFaceDetected 
                ? 'text-teal-600 dark:text-teal-400' 
                : 'text-red-600 dark:text-red-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {status}
          </p>
          
          {isMonitoring && (
            <div className="mt-2">
              <p className={`text-sm ${
                isCalibrating 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-teal-600 dark:text-teal-400'
              }`}>
                {qualityStatus}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeartRateDisplay;