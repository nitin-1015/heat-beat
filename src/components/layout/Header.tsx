import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Search, Bell, Moon, Sun, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
              <span className="font-bold">D</span>
            </div>
            <span className="font-medium text-lg hidden sm:block">Dashboard</span>
          </Link>
        </div>

        <div className={`flex items-center ${isSearchOpen ? 'w-full justify-end' : 'justify-between'} gap-4`}>
          {isSearchOpen ? (
            <form className="w-full max-w-md px-2 flex items-center" onSubmit={(e) => e.preventDefault()}>
              <input
                type="search"
                placeholder="Search..."
                className="input"
                autoFocus
              />
              <button 
                type="button" 
                className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                onClick={() => setIsSearchOpen(false)}
              >
                <X size={20} />
              </button>
            </form>
          ) : (
            <>
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell size={20} />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <Link to="/profile" className="inline-flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="h-8 w-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                  <User size={16} className="text-indigo-600 dark:text-indigo-300" />
                </div>
                <span className="hidden md:block">Profile</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;