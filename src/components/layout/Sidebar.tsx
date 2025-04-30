import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, Settings, Users, ClipboardList, HelpCircle } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  
  const navItems = [
    { icon: <Home size={20} />, label: 'Dashboard', path: '/' },
    { icon: <BarChart2 size={20} />, label: 'Analytics', path: '/analytics' },
    { icon: <ClipboardList size={20} />, label: 'Projects', path: '/projects' },
    { icon: <Users size={20} />, label: 'Team', path: '/team' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
    { icon: <HelpCircle size={20} />, label: 'Help', path: '/help' },
  ];
  
  return (
    <aside 
      className={`fixed left-0 top-16 bottom-0 z-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-0 -translate-x-full sm:translate-x-0 sm:w-16'
      } overflow-hidden`}
    >
      <nav className="h-full py-6 flex flex-col">
        <div className="space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span className={`${isOpen ? 'opacity-100' : 'opacity-0 sm:hidden'} transition-opacity`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
        
        <div className="mt-auto px-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4">
            <h4 className="font-medium text-indigo-600 dark:text-indigo-400 mb-2">Need help?</h4>
            <p className={`text-sm text-gray-600 dark:text-gray-400 mb-3 ${!isOpen && 'sm:hidden'}`}>
              Check our documentation for guides and examples.
            </p>
            <a 
              href="#" 
              className="btn btn-primary text-xs w-full"
            >
              View Docs
            </a>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;