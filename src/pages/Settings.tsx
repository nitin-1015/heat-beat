import { useState } from 'react';
import { Bell, Lock, Share2, User, Shield, Globe, Moon } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <div className="card p-4 sticky top-24">
            <nav className="space-y-1">
              {[
                { id: 'profile', label: 'Profile', icon: <User size={18} /> },
                { id: 'account', label: 'Account', icon: <Shield size={18} /> },
                { id: 'security', label: 'Security', icon: <Lock size={18} /> },
                { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
                { id: 'privacy', label: 'Privacy', icon: <Share2 size={18} /> },
                { id: 'appearance', label: 'Appearance', icon: <Moon size={18} /> },
                { id: 'language', label: 'Language', icon: <Globe size={18} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        <div className="md:col-span-3">
          <div className="card">
            {activeTab === 'profile' && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Information</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="h-32 w-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center relative">
                          <User size={48} className="text-indigo-600 dark:text-indigo-400" />
                          <button className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </div>
                        <button className="btn btn-ghost text-sm">Remove photo</button>
                      </div>
                    </div>
                    
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                          <input type="text" id="firstName" value="Alex" className="input" />
                        </div>
                        <div>
                          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                          <input type="text" id="lastName" value="Smith" className="input" />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" id="email" value="alex.smith@example.com" className="input" />
                      </div>
                      
                      <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                        <textarea id="bio" rows={4} className="input" placeholder="Write a few words about yourself..."></textarea>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Contact Information</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                        <input type="tel" id="phoneNumber" placeholder="+1 (555) 000-0000" className="input" />
                      </div>
                      <div>
                        <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                        <input type="url" id="website" placeholder="https://yourwebsite.com" className="input" />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                      <input type="text" id="address" placeholder="123 Main St" className="input" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                        <input type="text" id="city" placeholder="San Francisco" className="input" />
                      </div>
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State/Province</label>
                        <input type="text" id="state" placeholder="California" className="input" />
                      </div>
                      <div>
                        <label htmlFor="zip" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP/Postal</label>
                        <input type="text" id="zip" placeholder="94103" className="input" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 flex justify-end gap-3">
                  <button className="btn btn-ghost">Cancel</button>
                  <button className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h2>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                      <input type="password" id="currentPassword" className="input" />
                    </div>
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                      <input type="password" id="newPassword" className="input" />
                    </div>
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                      <input type="password" id="confirmPassword" className="input" />
                    </div>
                    <button className="btn btn-primary">Update Password</button>
                  </div>
                </div>
                
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">Add an extra layer of security to your account</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">We'll ask for a verification code in addition to your password when you sign in.</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notification Preferences</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Email Notifications</h3>
                    <div className="space-y-4">
                      {[
                        'Account activity and security',
                        'Project updates and comments',
                        'Newsletter and product updates',
                        'Promotional offers and discounts',
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">{item}</span>
                          <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked={index < 2} className="sr-only peer" />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Application Notifications</h3>
                    <div className="space-y-4">
                      {[
                        'Direct messages and mentions',
                        'Task assignments and deadlines',
                        'Team activity updates',
                        'System notifications',
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">{item}</span>
                          <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked={index < 3} className="sr-only peer" />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button className="btn btn-primary">Save Preferences</button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab !== 'profile' && activeTab !== 'security' && activeTab !== 'notifications' && (
              <div className="p-6 text-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</h2>
                <p className="text-gray-600 dark:text-gray-400">This section is under development.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;