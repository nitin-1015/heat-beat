import { Droplet } from 'lucide-react';

interface SpO2DisplayProps {
  spo2: number;
  isMonitoring: boolean;
  isFaceDetected: boolean;
  status: string;
  qualityStatus: string;
  isCalibrating: boolean;
}

const SpO2Display = ({ 
  spo2, 
  isMonitoring, 
  isFaceDetected, 
  status,
  qualityStatus,
  isCalibrating 
}: SpO2DisplayProps) => {
  // Determine SpO2 status and color
  const getSpO2Status = (value: number) => {
    if (value >= 95) return { status: 'Normal', color: 'text-green-500 dark:text-green-400' };
    if (value >= 90) return { status: 'Mild Hypoxia', color: 'text-yellow-500 dark:text-yellow-400' };
    return { status: 'Hypoxia', color: 'text-red-500 dark:text-red-400' };
  };

  const spo2Status = getSpO2Status(spo2);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
            isMonitoring 
              ? isFaceDetected 
                ? 'bg-blue-100 dark:bg-blue-900' 
                : 'bg-red-100 dark:bg-red-900'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            <Droplet 
              className={`w-16 h-16 ${
                isMonitoring 
                  ? isFaceDetected 
                    ? spo2Status.color
                    : 'text-red-500 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`} 
            />
          </div>
          {isMonitoring && isFaceDetected && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-1 rounded-full shadow-md">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {spo2}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">SpO2</span>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className={`text-lg font-medium ${
            isMonitoring 
              ? isFaceDetected 
                ? spo2Status.color
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
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                {qualityStatus}
              </p>
            </div>
          )}
        </div>

        {/* SpO2 Status Indicators */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <span className="text-xs font-medium text-green-600 dark:text-green-400">95-100%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Normal</span>
          </div>
          <div className="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">90-94%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Mild</span>
          </div>
          <div className="px-2 py-1 bg-red-50 dark:bg-red-900/30 rounded-lg">
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Below 90%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpO2Display; 