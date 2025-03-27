import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { Link } from 'react-router-dom';
import ExpertList from '../components/appointment/ExpertList';
import AppointmentScheduler from '../components/appointment/AppointmentScheduler';
import { fetchExperts } from '../redux/slices/appointmentSlice';
import { Users, Calendar } from 'lucide-react';

const AppointmentsPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const appointment = useSelector((state: RootState) => state.appointment);
  const [activeView, setActiveView] = useState<'experts' | 'scheduler'>('experts');
  
  // Track if we're on mobile based on window width
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Fetch experts on component mount
  useEffect(() => {
    dispatch(fetchExperts() as any);
  }, [dispatch]);
  
  // Listen for window resize events
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Switch to scheduler view automatically when an expert is selected on mobile
  useEffect(() => {
    if (isMobile && appointment.selectedExpert) {
      setActiveView('scheduler');
    }
  }, [isMobile, appointment.selectedExpert]);

  // If not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 max-w-md w-full text-center">
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
    <div className="container mx-auto px-4 py-4">
      {/* Compact page header */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Book a Consultation
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a consultant and schedule a time that works for you
        </p>
      </div>
      
      {/* Mobile View - Tab Navigation */}
      {isMobile && (
        <div className="mb-4">
          <div className="grid grid-cols-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button 
              onClick={() => setActiveView('experts')}
              className={`flex items-center justify-center py-2 rounded-md transition-colors ${
                activeView === 'experts' 
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              Consultants
            </button>
            <button 
              onClick={() => setActiveView('scheduler')}
              className={`flex items-center justify-center py-2 rounded-md transition-colors ${
                activeView === 'scheduler' 
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              disabled={!appointment.selectedExpert}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </button>
          </div>
        </div>
      )}

      {/* Desktop Layout - Side by side with fixed height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        {/* Expert List */}
        {(!isMobile || (isMobile && activeView === 'experts')) && (
          <div className={`${isMobile ? 'col-span-1' : 'lg:col-span-5'} overflow-auto`} style={{ maxHeight: isMobile ? 'auto' : 'calc(100vh - 150px)' }}>
            <ExpertList />
          </div>
        )}

        {/* Appointment Scheduler */}
        {(!isMobile || (isMobile && activeView === 'scheduler')) && (
          <div className={`${isMobile ? 'col-span-1' : 'lg:col-span-7'} overflow-auto`} style={{ maxHeight: isMobile ? 'auto' : 'calc(100vh - 150px)' }}>
            <AppointmentScheduler />
          </div>
        )}
      </div>

      {/* Expert Selection Feedback (Desktop Only) - Smaller and less intrusive */}
      {!isMobile && appointment.selectedExpert && (
        <div className="fixed bottom-2 right-2 bg-indigo-600 text-white py-1 px-3 rounded-lg shadow-sm flex items-center space-x-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span>
            {appointment.selectedExpert.name} selected
          </span>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;