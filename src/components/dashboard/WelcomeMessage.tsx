const WelcomeMessage = () => {
  // In a real app, this would come from authentication context
  const userName = 'Alex';
  
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  
  return (
    <div className="mb-2">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {getCurrentGreeting()}, {userName}!
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Here's what's happening with your projects today.
      </p>
    </div>
  );
};

export default WelcomeMessage;