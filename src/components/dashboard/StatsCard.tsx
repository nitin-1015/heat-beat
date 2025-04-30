import { ArrowDown, ArrowUp, DivideIcon as LucideIcon } from 'lucide-react';
import React, { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, trend, icon }) => {
  return (
    <div className="card p-6 hover:translate-y-[-4px] transition-transform duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-700 dark:text-gray-300">{title}</h3>
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <div className="text-indigo-600 dark:text-indigo-400">
            {icon}
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-medium mb-1">{value}</p>
          <div className="flex items-center gap-1">
            {trend === 'up' ? (
              <ArrowUp size={14} className="text-green-500" />
            ) : trend === 'down' ? (
              <ArrowDown size={14} className="text-red-500" />
            ) : null}
            <span 
              className={
                trend === 'up' 
                  ? 'text-green-600 dark:text-green-400 text-sm' 
                  : trend === 'down' 
                    ? 'text-red-600 dark:text-red-400 text-sm' 
                    : 'text-gray-600 dark:text-gray-400 text-sm'
              }
            >
              {change}
            </span>
          </div>
        </div>
        <div className="h-10 w-20 bg-gray-50 dark:bg-gray-700/50 rounded-md overflow-hidden">
          {/* Simple stat visualization - could be replaced with mini-chart */}
          <div 
            className={`h-full ${
              trend === 'up' 
                ? 'bg-green-500/20' 
                : trend === 'down' 
                  ? 'bg-red-500/20' 
                  : 'bg-gray-500/20'
            }`}
            style={{ width: `${Math.random() * 50 + 30}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;