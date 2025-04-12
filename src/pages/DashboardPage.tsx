import React from 'react';
import UserDashboard from '../components/dashboard/UserDashboard';

interface DashboardPageProps {
  initialTab?: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ initialTab }) => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <UserDashboard initialTab={initialTab} />
    </div>
  );
};

export default DashboardPage;