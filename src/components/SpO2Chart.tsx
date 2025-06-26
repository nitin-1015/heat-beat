import React from 'react';
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
  Filler,
  ChartOptions,
  ScriptableContext
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

interface DataPoint {
  time: string;
  value: number;
  frame: number;
}

interface SpO2ChartProps {
  data: DataPoint[];
}

const SpO2Chart: React.FC<SpO2ChartProps> = ({ data }) => {
  // Process and validate the data
  const processData = (rawData: DataPoint[]): DataPoint[] => {
    // Basic validation
    const validData = rawData.filter(item => 
      typeof item.value === 'number' && 
      !isNaN(item.value) && 
      item.value >= 70 && 
      item.value <= 100
    );

    if (validData.length < 2) return validData;

    // Smooth data using moving average
    const windowSize = 3;
    return validData.map((item, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(validData.length, index + Math.floor(windowSize / 2) + 1);
      const window = validData.slice(start, end);
      const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
      
      // Smooth out large deviations
      return Math.abs(item.value - avg) > 5 
        ? { ...item, value: Math.round(avg) } 
        : item;
    });
  };

  const processedData = processData(data);
  const frameNumbers = processedData.map(d => `T${d.frame}`);
  const spo2Values = processedData.map(d => d.value);

  // Calculate gradient for the chart line
  const getGradientColor = (context: ScriptableContext<"line">) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return 'rgba(34, 197, 94, 0.8)';
    
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
    gradient.addColorStop(0.5, 'rgba(234, 179, 8, 0.4)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
    return gradient;
  };

  // Chart data configuration
  const chartData = React.useMemo(() => ({
    labels: frameNumbers,
    datasets: [
      {
        label: 'SpO2',
        data: spo2Values,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: (context: ScriptableContext<"line">) => getGradientColor(context),
        tension: 0.3,
        fill: true,
        pointRadius: (context: any) => {
          const index = context.dataIndex;
          const value = context.raw;
          // Show only last 3 points and points with significant changes
          if (index >= spo2Values.length - 3) return 4;
          if (index > 0 && Math.abs(value - spo2Values[Math.max(0, index - 1)]) > 2) return 4;
          return 0;
        },
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
        spanGaps: false,
      },
    ],
  }), [frameNumbers, spo2Values]);

  // Chart options
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
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
            weight: 600,
            family: "'Inter', sans-serif"
          },
          padding: { top: 15 }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.08)',
          drawOnChartArea: false,
          lineWidth: 1
        },
        ticks: {
          maxRotation: 0,
          color: '#6B7280',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          padding: 8
        }
      },
      y: {
        min: 70,
        max: 100,
        title: {
          display: true,
          text: 'SpO2 %',
          color: '#6B7280',
          font: {
            size: 13,
            weight: 600,
            family: "'Inter', sans-serif"
          },
          padding: { bottom: 15 }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.08)',
          drawOnChartArea: true,
          lineWidth: 1
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          padding: 8,
          callback: (value) => `${value}%`
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#111827',
        bodyColor: '#4B5563',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}%`;
          }
        }
      }
    }
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (spo2Values.length === 0) return null;
    
    const values = spo2Values.filter(v => v !== null && !isNaN(v));
    if (values.length === 0) return null;
    
    return {
      current: values[values.length - 1],
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }, [spo2Values]);

  return (
    <div className="bg-white">
      <div className="h-48">
        <Line options={options} data={chartData} />
      </div>
      {stats && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-sm text-gray-500">Current</p>
            <p className="text-lg font-semibold">{Math.round(stats.current)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Avg</p>
            <p className="text-lg font-semibold">{Math.round(stats.average)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Min</p>
            <p className="text-lg font-semibold">{Math.round(stats.min)}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Max</p>
            <p className="text-lg font-semibold">{Math.round(stats.max)}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpO2Chart;
