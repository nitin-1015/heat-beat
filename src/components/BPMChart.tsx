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

interface BPMChartProps {
  data: {
    time: string;
    value: number;
    frame: number;
  }[];
}

const BPMChart = ({ data }: BPMChartProps) => {
  // Enhanced data processing and validation
  const processData = (rawData: typeof data) => {
    // First pass: basic validation
    const validData = rawData.filter(item => 
      typeof item.value === 'number' && 
      !isNaN(item.value) && 
      item.value >= 40 && 
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
      if (Math.abs(item.value - avg) > 10) {
        return { ...item, value: avg };
      }
      return item;
    });

    return smoothedData;
  };

  const processedData = processData(data);

  // Create frame numbers array based on actual data
  const frameNumbers = processedData.map(d => d.frame);
  
  // Create BPM values array
  const bpmValues = processedData.map(d => d.value);

  // Calculate gradient colors based on BPM values
  const getGradientColor = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    // More natural gradient colors for heart rate
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // blue-500
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.6)'); // indigo-500
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.2)'); // purple-500
    return gradient;
  };

  const chartData = {
    labels: frameNumbers,
    datasets: [
      {
        label: 'BPM',
        data: bpmValues,
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          return getGradientColor(ctx);
        },
        tension: 0.3, // Reduced tension for more accurate representation
        fill: true,
        pointRadius: (context: any) => {
          const index = context.dataIndex;
          const value = context.raw;
          // Make points more prominent for significant changes
          return Math.abs(value - (bpmValues[index - 1] || value)) > 5 ? 5 : 3;
        },
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(59, 130, 246)', // blue-500
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2.5, // Slightly thinner line for better accuracy
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
            // Show every 5th label to avoid crowding
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
          text: 'BPM',
          color: '#6B7280',
          font: {
            size: 13,
            weight: '600',
            family: "'Inter', sans-serif"
          },
          padding: { bottom: 15 }
        },
        min: 40,
        max: 100,
        grid: {
          color: 'rgba(107, 114, 128, 0.08)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          stepSize: 10,
          color: '#6B7280',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          padding: 10,
          callback: (value) => `${value} BPM`
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
            if (value >= 40 && value < 60) status = 'Resting';
            else if (value >= 60 && value < 80) status = 'Normal';
            else if (value >= 80 && value <= 100) status = 'Active';
            
            const prevValue = bpmValues[context.dataIndex - 1];
            const change = prevValue ? value - prevValue : 0;
            const changeText = change !== 0 ? ` (${change > 0 ? '+' : ''}${change.toFixed(1)} BPM)` : '';
            
            return value !== null ? `${value.toFixed(1)} BPM (${status})${changeText}` : 'No data';
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
    avg: bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length,
    min: Math.min(...bpmValues),
    max: Math.max(...bpmValues),
    current: bpmValues[bpmValues.length - 1]
  } : null;

  return (
    <div className="w-full h-full relative bg-white dark:bg-gray-800 p-4">
      {processedData.length > 0 ? (
        <>
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white dark:from-gray-800 to-transparent z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-800 to-transparent z-10" />
          <div className="absolute top-4 left-4 z-20">
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Real-time BPM tracking</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Current BPM</span>
              </div>
            </div>
          </div>
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">40-60 BPM</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Resting</span>
            </div>
            <div className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">60-80 BPM</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Normal</span>
            </div>
            <div className="px-2 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">80-100 BPM</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Active</span>
            </div>
          </div>
          {stats && (
            <div className="absolute bottom-4 left-4 right-4 z-20 grid grid-cols-4 gap-2">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{stats.current.toFixed(1)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Average</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{stats.avg.toFixed(1)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Min</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{stats.min.toFixed(1)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Max</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white">{stats.max.toFixed(1)}</p>
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
            <p className="text-gray-600 dark:text-gray-300 font-medium text-lg">No BPM data available</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Start monitoring to see your heart rate history</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BPMChart;