import { BarChart, User, Mail, MapPin, Link as LinkIcon, Calendar, Edit, Bookmark, MessageCircle, Heart } from 'lucide-react';

const Profile = () => {
  // Mock data
  const user = {
    name: 'Alex Smith',
    username: '@alexsmith',
    avatar: null, // We'll use an icon instead of an image
    bio: 'Product Designer & Frontend Developer | Creating user-friendly interfaces with modern tech | React enthusiast',
    location: 'San Francisco, CA',
    website: 'alexsmith.design',
    email: 'alex.smith@example.com',
    joinDate: 'Joined March 2021',
    following: 268,
    followers: 1482,
    projects: 24,
  };
  
  const projects = [
    {
      id: 1,
      title: 'Modern Dashboard UI',
      description: 'A responsive dashboard with dark/light mode built with React, Tailwind CSS, and Recharts.',
      tag: 'UI Design',
      likes: 53,
      comments: 14,
      saved: 28,
    },
    {
      id: 2,
      title: 'E-commerce Platform',
      description: 'Full-featured online store with product listings, cart, checkout and payment integration.',
      tag: 'Web Development',
      likes: 84,
      comments: 32,
      saved: 41,
    },
    {
      id: 3,
      title: 'Task Management App',
      description: 'A productivity app with drag-and-drop tasks, projects, and team collaboration features.',
      tag: 'Mobile App',
      likes: 127,
      comments: 48,
      saved: 75,
    },
  ];
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="card overflow-hidden">
        {/* Cover image - using gradient as placeholder */}
        <div className="h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="p-6 sm:p-8 relative">
          {/* Avatar */}
          <div className="absolute -top-16 left-6 sm:left-8 h-32 w-32 rounded-full ring-4 ring-white dark:ring-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center">
            <User size={64} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          
          {/* Edit profile button */}
          <div className="flex justify-end">
            <button className="btn btn-primary flex items-center gap-2">
              <Edit size={16} />
              <span>Edit Profile</span>
            </button>
          </div>
          
          {/* Profile information */}
          <div className="mt-12">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">{user.username}</p>
            
            <p className="mt-4 text-gray-700 dark:text-gray-300">{user.bio}</p>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin size={16} />
                <span>{user.location}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <LinkIcon size={16} />
                <a href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">{user.website}</a>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Mail size={16} />
                <a href="#" className="hover:underline">{user.email}</a>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar size={16} />
                <span>{user.joinDate}</span>
              </div>
            </div>
            
            <div className="mt-6 flex gap-6">
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{user.following}</span>
                <p className="text-gray-600 dark:text-gray-400">Following</p>
              </div>
              
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{user.followers}</span>
                <p className="text-gray-600 dark:text-gray-400">Followers</p>
              </div>
              
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{user.projects}</span>
                <p className="text-gray-600 dark:text-gray-400">Projects</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button className="px-4 py-3 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-medium">Projects</button>
          <button className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Activity</button>
          <button className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Saved</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="card overflow-hidden group">
              {/* Project banner - using gradient as placeholder */}
              <div className="h-36 bg-gradient-to-r from-blue-500 to-indigo-500 group-hover:scale-105 transition-transform duration-300"></div>
              
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{project.title}</h3>
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded-full">{project.tag}</span>
                </div>
                
                <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">{project.description}</p>
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-gray-500 hover:text-red-500">
                      <Heart size={16} />
                      <span>{project.likes}</span>
                    </button>
                    
                    <button className="flex items-center gap-1 text-gray-500 hover:text-indigo-500">
                      <MessageCircle size={16} />
                      <span>{project.comments}</span>
                    </button>
                  </div>
                  
                  <button className="flex items-center gap-1 text-gray-500 hover:text-amber-500">
                    <Bookmark size={16} />
                    <span>{project.saved}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <button className="btn btn-ghost">Load More Projects</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;