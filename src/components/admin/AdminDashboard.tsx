import React, { useState } from 'react';
import { Users, Calendar, Settings, LogOut } from 'lucide-react';
import AppointmentManagement from './AppointmentManagement';
import ExpertManagement from './ExpertManagement';
import UserManagement from './UserManagement';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('appointments');

  const tabs = [
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'experts', label: 'Experts', icon: Users },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return <AppointmentManagement />;
      case 'experts':
        return <ExpertManagement />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <div>Settings Content</div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        </div>
        <nav className="mt-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-full p-4">
          <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard; 