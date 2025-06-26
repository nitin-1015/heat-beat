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

interface BPMChartProps {
  data: DataPoint[];
}

const BPMChart: React.FC<BPMChartProps> = ({ data }) => {
  // Process and validate the data
  const processData = (rawData: DataPoint[]): DataPoint[] => {
    // Basic validation - allow wider range of BPM values (40-200)
    const validData = rawData.filter(item => 
      typeof item.value === 'number' && 
      !isNaN(item.value) && 
      item.value >= 40 && 
      item.value <= 200
    );
    
    if (validData.length === 0) return [];

    if (validData.length < 2) return validData;

    // Smooth data using adaptive moving average
    const windowSize = Math.min(5, Math.max(3, Math.floor(validData.length / 10)));
    
    return validData.map((item, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(validData.length, index + Math.floor(windowSize / 2) + 1);
      const window = validData.slice(start, end);
      
      // Calculate weighted average (more recent values have higher weight)
      const weights = window.map((_, i) => 1 / (1 + Math.abs(i - (index - start))));
      const sumWeights = weights.reduce((a, b) => a + b, 0);
      const avg = window.reduce((sum, d, i) => sum + d.value * (weights[i] / sumWeights), 0);
      
      // Only smooth if the difference is significant
      return Math.abs(item.value - avg) > 15 
        ? { ...item, value: Math.round(avg) } 
        : item;
    });
  };

  const processedData = processData(data);
  const frameNumbers = processedData.map(d => `T${d.frame}`);
  const bpmValues = processedData.map(d => d.value);

  // Calculate gradient for the chart line
  const getGradientColor = (context: ScriptableContext<"line">) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return 'rgba(59, 130, 246, 0.8)';
    
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');
    return gradient;
  };

  // Chart data configuration
  const chartData = React.useMemo(() => ({
    labels: frameNumbers,
    datasets: [
      {
        label: 'BPM',
        data: bpmValues,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: (context: ScriptableContext<"line">) => getGradientColor(context),
        tension: 0.3,
        fill: true,
        pointRadius: (context: any) => {
          const index = context.dataIndex;
          const value = context.raw;
          // Show only last 3 points and points with significant changes
          if (index >= bpmValues.length - 3) return 4;
          if (index > 0 && Math.abs(value - bpmValues[Math.max(0, index - 1)]) > 5) return 4;
          return 0;
        },
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
        spanGaps: false,
      },
    ],
  }), [frameNumbers, bpmValues]);

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
        beginAtZero: false,
        min: 40,  // Fixed minimum for BPM
        max: 220, // Fixed maximum for BPM
        suggestedMin: 40,  // Suggested minimum that can auto-adjust
        suggestedMax: 220, // Suggested maximum that can auto-adjust
        title: {
          display: true,
          text: 'BPM',
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
          callback: (value) => `${value} BPM`
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
            return `${label}: ${value} BPM`;
          }
        }
      }
    }
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (bpmValues.length === 0) return null;
    
    const values = bpmValues.filter(v => v !== null && !isNaN(v));
    if (values.length === 0) return null;
    
    return {
      current: values[values.length - 1],
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }, [bpmValues]);

  return (
    <div className="bg-white ">
      <div className="h-48">
        <Line options={options} data={chartData} />
      </div>
      {stats && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-sm text-gray-500">Current</p>
            <p className="text-lg font-semibold">{Math.round(stats.current)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Avg</p>
            <p className="text-lg font-semibold">{Math.round(stats.average)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Min</p>
            <p className="text-lg font-semibold">{Math.round(stats.min)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Max</p>
            <p className="text-lg font-semibold">{Math.round(stats.max)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BPMChart;
