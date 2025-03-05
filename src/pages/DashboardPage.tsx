import React from 'react';
import UserDashboard from '../components/dashboard/UserDashboard';

const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <UserDashboard />
    </div>
  );
};

export default DashboardPage;