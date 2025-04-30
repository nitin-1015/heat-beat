import { Heart } from 'lucide-react';

interface HeartRateDisplayProps {
  bpm: number;
  isMonitoring: boolean;
  isFaceDetected: boolean;
  isMonitoringBtn: boolean
}

const HeartRateDisplay: React.FC<HeartRateDisplayProps> = ({ bpm, isMonitoring, isFaceDetected, isMonitoringBtn }) => {
  const getBPMStatus = () => {
    if (bpm === 0 && isFaceDetected && isMonitoringBtn) return { text: 'Face Detected, Calculating BPM...', color: 'text-gray-500' };
    if (bpm === 0 && isFaceDetected) return { text: 'Face Detected', color: 'text-gray-500' };
    if (bpm === 0) return { text: 'Face not detected', color: 'text-gray-500' };
    if (bpm < 50) return { text: 'Low', color: 'text-blue-500' };
    if (bpm > 100) return { text: 'High', color: 'text-red-500' };
    return { text: 'Normal', color: 'text-green-500' };
  };

  const status = getBPMStatus();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className={`relative ${isMonitoring ? 'animate-pulse' : ''}`}>
          <Heart size={48} className="text-teal-500" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
          {bpm} <span className="text-xl">BPM</span>
        </h2>
        <p className={`text-lg font-medium ${status.color}`}>
          {status.text}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        {[
          { label: 'Low', value: '< 50' },
          { label: 'Normal', value: '50-100' },
          { label: 'High', value: '> 100' },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">{item.label}</div>
            <div className="text-lg font-medium text-gray-900 dark:text-white">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeartRateDisplay;