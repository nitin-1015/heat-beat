import { Calendar, MessageSquare, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'message',
    title: 'New message received',
    description: 'Alex sent you a message',
    time: '5 min ago',
    icon: <MessageSquare size={16} />,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 2,
    type: 'task',
    title: 'Task completed',
    description: 'Website redesign project',
    time: '30 min ago',
    icon: <CheckCircle size={16} />,
    iconColor: 'text-green-500',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 3,
    type: 'reminder',
    title: 'Meeting reminder',
    description: 'Team standup at 2:00 PM',
    time: '1 hour ago',
    icon: <Clock size={16} />,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    id: 4,
    type: 'alert',
    title: 'System alert',
    description: 'High CPU usage detected',
    time: '3 hours ago',
    icon: <AlertCircle size={16} />,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 5,
    type: 'calendar',
    title: 'New event scheduled',
    description: 'Product launch on Monday',
    time: 'Yesterday',
    icon: <Calendar size={16} />,
    iconColor: 'text-purple-500',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 6,
    type: 'document',
    title: 'Document updated',
    description: 'Annual report v2',
    time: 'Yesterday',
    icon: <FileText size={16} />,
    iconColor: 'text-indigo-500',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
];

const ActivityFeed = () => {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {activities.map((activity) => (
        <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div className="flex gap-3">
            <div className={`p-2 rounded-full ${activity.iconBg} ${activity.iconColor} self-start mt-0.5`}>
              {activity.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">{activity.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.time}</p>
            </div>
          </div>
        </div>
      ))}
      
      <div className="p-4 text-center">
        <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium">
          View All Activity
        </button>
      </div>
    </div>
  );
};

export default ActivityFeed;