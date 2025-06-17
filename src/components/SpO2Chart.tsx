import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SpO2ChartProps {
  data: {
    time: string;
    value: number;
    frame: number;
  }[];
}

const SpO2Chart = ({ data }: SpO2ChartProps) => {
  // Enhanced data processing and validation
  const processData = (rawData: typeof data) => {
    // First pass: basic validation
    const validData = rawData.filter(item => 
      typeof item.value === 'number' && 
      !isNaN(item.value) && 
      item.value >= 70 && 
      item.value <= 100
    );

    if (validData.length < 2) return validData;

    // Second pass: remove outliers using moving average
    const windowSize = 3;
    const smoothedData = validData.map((item, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(validData.length, index + Math.floor(windowSize / 2) + 1);
      const window = validData.slice(start, end);
      const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
      
      // If the value deviates too much from the average, use the average instead
      if (Math.abs(item.value - avg) > 5) {
        return { ...item, value: avg };
      }
      return item;
    });

    return smoothedData;
  };

  const processedData = processData(data);

  // Create frame numbers array based on actual data
  const frameNumbers = processedData.map(d => d.frame);
  
  // Create SpO2 values array
  const spo2Values = processedData.map(d => d.value);

  // Calculate gradient colors based on SpO2 values
  const getGradientColor = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    // More natural gradient colors for SpO2
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)'); // green-500
    gradient.addColorStop(0.5, 'rgba(234, 179, 8, 0.6)'); // yellow-500
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)'); // red-500
    return gradient;
  };

  const chartData = {
    labels: frameNumbers,
    datasets: [
      {
        label: 'SpO2',
        data: spo2Values,
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          return getGradientColor(ctx);
        },
        tension: 0.3,
        fill: true,
        pointRadius: (context: any) => {
          const index = context.dataIndex;
          const value = context.raw;
          // Make points more prominent for significant changes
          return Math.abs(value - (spo2Values[index - 1] || value)) > 3 ? 5 : 3;
        },
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(34, 197, 94)', // green-500
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2.5,
        spanGaps: false,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time',
          color: '#6B7280',
          font: {
            size: 13,
            weight: '600',
            family: "'Inter', sans-serif"
          },
          padding: { top: 15 }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.08)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          maxRotation: 0,
          color: '#6B7280',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          padding: 10,
          callback: (value, index) => {
            return index % 5 === 0 ? `T${value}` : '';
          }
        },
        border: {
          display: false
        }
      },
      y: {
        title: {
          display: true,
          text: 'SpO2 %',
          color: '#6B7280',
          font: {
            size: 13,
            weight: '600',
            family: "'Inter', sans-serif"
          },
          padding: { bottom: 15 }
        },
        min: 70,
        max: 100,
        grid: {
          color: 'rgba(107, 114, 128, 0.08)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          stepSize: 5,
          color: '#6B7280',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          padding: 10,
          callback: (value) => `${value}%`
        },
        border: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#1F2937',
        borderColor: 'rgba(107, 114, 128, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: 13,
          weight: '600',
          family: "'Inter', sans-serif"
        },
        bodyFont: {
          size: 12,
          family: "'Inter', sans-serif"
        },
        callbacks: {
          label: (context) => {
            const value = context.raw;
            let status = '';
            if (value >= 95) status = 'Normal';
            else if (value >= 90) status = 'Mild Hypoxia';
            else status = 'Hypoxia';
            
            const prevValue = spo2Values[context.dataIndex - 1];
            const change = prevValue ? value - prevValue : 0;
            const changeText = change !== 0 ? ` (${change > 0 ? '+' : ''}${change.toFixed(1)}%)` : '';
            
            return value !== null ? `${value.toFixed(1)}% (${status})${changeText}` : 'No data';
          },
          title: (context) => {
            return `Time ${context[0].label}`;
          }
        }
      }
    }
  };

  // Calculate statistics
  const stats = processedData.length > 0 ? {
    avg: spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length,
    min: Math.min(...spo2Values),
    max: Math.max(...spo2Values),
    current: spo2Values[spo2Values.length - 1]
  } : null;

  return (
    <div className="w-full h-full relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      {processedData.length > 0 ? (
        <>
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white dark:from-gray-800 to-transparent z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-800 to-transparent z-10" />
          <div className="absolute top-4 left-4 z-20">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Oxygen Saturation History</h3>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Real-time SpO2 tracking</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Current SpO2</span>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 z-20 flex gap-2">
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
          {stats && (
            <div className="absolute bottom-4 left-4 right-4 z-20 grid grid-cols-4 gap-2">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{stats.current.toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Average</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{stats.avg.toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Min</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{stats.min.toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Max</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{stats.max.toFixed(1)}%</p>
              </div>
            </div>
          )}
          <div className="h-full pt-16 pb-20">
            <Line data={chartData} options={options} />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium text-lg">No SpO2 data available</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Start monitoring to see your oxygen saturation history</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpO2Chart; 