import React from 'react';
import ExpertList from '../components/appointment/ExpertList';
import AppointmentScheduler from '../components/appointment/AppointmentScheduler';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { Link } from 'react-router-dom';

const AppointmentsPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sign in to schedule appointments
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in or create an account to schedule appointments with our experts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Schedule an Expert Consultation
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Choose a specialist and book a time that works for you
          </p>
        </div>
        
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ExpertList />
          <AppointmentScheduler />
        </div>
      </div>
    </div>
  );
};

export default AppointmentsPage;