import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center px-4 py-16">
      <h1 className="text-9xl font-bold text-indigo-600 dark:text-indigo-400">404</h1>
      <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mt-4">Page not found</h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mt-2">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary mt-8 flex items-center gap-2">
        <Home size={18} />
        <span>Back to Dashboard</span>
      </Link>
    </div>
  );
};

export default NotFound;