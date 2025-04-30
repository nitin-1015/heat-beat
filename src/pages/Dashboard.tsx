import { useState } from 'react';
import { BarChart, Calendar, Clock, TrendingUp, Users, DollarSign, Inbox, Eye } from 'lucide-react';
import StatsCard from '../components/dashboard/StatsCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import Chart from '../components/dashboard/Chart';
import WelcomeMessage from '../components/dashboard/WelcomeMessage';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('weekly');
  
  const statsData = [
    { 
      title: 'Total Users', 
      value: '8,249', 
      change: '+12%', 
      trend: 'up',
      icon: <Users size={20} />
    },
    { 
      title: 'Revenue', 
      value: '$24,780', 
      change: '+8.2%', 
      trend: 'up',
      icon: <DollarSign size={20} />
    },
    { 
      title: 'Active Projects', 
      value: '47', 
      change: '+3', 
      trend: 'up',
      icon: <Calendar size={20} />
    },
    { 
      title: 'Avg. Session', 
      value: '4m 53s', 
      change: '-0.5%', 
      trend: 'down',
      icon: <Clock size={20} />
    },
  ];
  
  const chartData = [
    {
      name: 'Mon',
      users: 420,
      revenue: 240,
    },
    {
      name: 'Tue',
      users: 532,
      revenue: 300,
    },
    {
      name: 'Wed',
      users: 550,
      revenue: 350,
    },
    {
      name: 'Thu',
      users: 420,
      revenue: 280,
    },
    {
      name: 'Fri',
      users: 610,
      revenue: 400,
    },
    {
      name: 'Sat',
      users: 500,
      revenue: 380,
    },
    {
      name: 'Sun',
      users: 380,
      revenue: 220,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <WelcomeMessage />
        
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input max-w-xs"
          >
            <option value="daily">Today</option>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
          </select>
          
          <button className="btn btn-primary">
            Download Report
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Performance Overview</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-teal-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
              </div>
            </div>
          </div>
          <Chart data={chartData} />
        </div>
        
        <div className="card overflow-hidden">
          <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium">Recent Activity</h3>
          </div>
          <ActivityFeed />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Popular Pages</h3>
            <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {[
              { path: '/home', views: '4,890', rate: '64%' },
              { path: '/products', views: '3,682', rate: '51%' },
              { path: '/blog/top-tips', views: '2,445', rate: '42%' },
              { path: '/contact', views: '1,753', rate: '38%' },
            ].map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Eye size={16} className="text-gray-500" />
                  <span className="text-gray-900 dark:text-gray-100">{page.path}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-700 dark:text-gray-300">{page.views}</span>
                  <span className="text-green-600 dark:text-green-400">{page.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Quick Stats</h3>
            <select className="input max-w-xs text-sm py-1">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-green-500" />
                <h4 className="font-medium">Conversion</h4>
              </div>
              <p className="text-2xl font-medium">3.6%</p>
              <p className="text-green-600 dark:text-green-400 text-xs mt-1">+0.6% from last period</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart size={16} className="text-purple-500" />
                <h4 className="font-medium">Sessions</h4>
              </div>
              <p className="text-2xl font-medium">14,892</p>
              <p className="text-green-600 dark:text-green-400 text-xs mt-1">+7.4% from last period</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Inbox size={16} className="text-blue-500" />
                <h4 className="font-medium">Messages</h4>
              </div>
              <p className="text-2xl font-medium">243</p>
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">-2.4% from last period</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-amber-500" />
                <h4 className="font-medium">Customers</h4>
              </div>
              <p className="text-2xl font-medium">8,249</p>
              <p className="text-green-600 dark:text-green-400 text-xs mt-1">+12.7% from last period</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;