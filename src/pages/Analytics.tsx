import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Analytics = () => {
  const [period, setPeriod] = useState('month');
  
  const trafficData = [
    { name: 'Social', value: 30 },
    { name: 'Direct', value: 40 },
    { name: 'Organic', value: 20 },
    { name: 'Referral', value: 10 },
  ];
  
  const usersByCountry = [
    { name: 'USA', value: 40 },
    { name: 'UK', value: 20 },
    { name: 'Canada', value: 15 },
    { name: 'Australia', value: 12 },
    { name: 'Others', value: 13 },
  ];
  
  const deviceData = [
    { name: 'Desktop', value: 45 },
    { name: 'Mobile', value: 40 },
    { name: 'Tablet', value: 15 },
  ];
  
  const performanceData = [
    { name: 'Jan', conversions: 65, visitors: 400 },
    { name: 'Feb', conversions: 59, visitors: 380 },
    { name: 'Mar', conversions: 80, visitors: 500 },
    { name: 'Apr', conversions: 81, visitors: 540 },
    { name: 'May', conversions: 56, visitors: 320 },
    { name: 'Jun', conversions: 55, visitors: 300 },
    { name: 'Jul', conversions: 40, visitors: 220 },
  ];
  
  const COLORS = ['#4F46E5', '#0D9488', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Detailed insights about your application performance</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input max-w-xs"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          
          <button className="btn btn-primary">
            Export Data
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-4">Traffic Sources</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {trafficData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-4">User Demographics</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usersByCountry}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {usersByCountry.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-4">Device Usage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="card p-6">
        <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={performanceData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visitors" fill="#4F46E5" name="Visitors" />
              <Bar dataKey="conversions" fill="#0D9488" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-4">Top Pages</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Views</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg. Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bounce Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  { page: '/home', views: '12,543', avgTime: '2m 40s', bounceRate: '32%' },
                  { page: '/products', views: '8,212', avgTime: '3m 12s', bounceRate: '28%' },
                  { page: '/blog', views: '6,154', avgTime: '4m 31s', bounceRate: '25%' },
                  { page: '/about', views: '4,987', avgTime: '1m 45s', bounceRate: '45%' },
                  { page: '/contact', views: '3,421', avgTime: '1m 10s', bounceRate: '51%' },
                ].map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">{item.page}</td>
                    <td className="px-4 py-3 text-sm">{item.views}</td>
                    <td className="px-4 py-3 text-sm">{item.avgTime}</td>
                    <td className="px-4 py-3 text-sm">{item.bounceRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-medium mb-4">User Behavior</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Session Duration</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">3m 42s</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div className="h-2 bg-indigo-600 rounded-full" style={{ width: '72%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pages per Session</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">4.2</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div className="h-2 bg-teal-600 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bounce Rate</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">38%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div className="h-2 bg-amber-500 rounded-full" style={{ width: '38%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conversion Rate</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">5.4%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div className="h-2 bg-green-600 rounded-full" style={{ width: '5.4%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">User Retention</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">42.7%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div className="h-2 bg-purple-600 rounded-full" style={{ width: '42.7%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;