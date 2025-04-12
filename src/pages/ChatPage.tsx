import React, { useEffect, useState } from 'react';
import ChatInterface from '../components/chat/ChatInterface';
import ChatSidebar from '../components/chat/ChatSidebar';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchUserSessions, setCurrentSession, setNetworkError } from '../redux/slices/chatSlice';
import { toast } from 'react-toastify';
import usePlanAccess from '../hooks/usePlanAccess';
import { AlertCircle } from 'lucide-react';

const ChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { networkError } = useSelector((state: RootState) => state.chat);
  const { state } = useLocation();
  const [retrying, setRetrying] = useState(false);
  const { canAccess, getUpgradeMessage } = usePlanAccess();

  // Set current session from navigation state if available
  useEffect(() => {
    if (state) {
      console.log("Setting current session from chat page", state);
      dispatch(setCurrentSession(state));
    }
  }, [state, dispatch]);

  // Fetch sessions when component mounts if user is logged in
  useEffect(() => {
    // Only fetch sessions when the component mounts or user changes
    if (user) {
      console.log("Fetching user sessions from ChatPage");
      dispatch(fetchUserSessions() as any);
    }
  }, [user, dispatch]);

  // Reset network error when component unmounts
  useEffect(() => {
    return () => {
      if (networkError) {
        dispatch(setNetworkError(false));
      }
    };
  }, [dispatch, networkError]);

  // Handle retrying when network error occurs
  useEffect(() => {
    if (user && retrying) {
      console.log("Retrying to fetch user sessions from chat page")
      toast.info("Reconnecting to server...");
      dispatch(fetchUserSessions() as any);
      setRetrying(false);
    }
  }, [retrying, user, dispatch]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      if (networkError) {
        toast.success("You're back online!");
        dispatch(setNetworkError(false));
        // Refresh sessions
        dispatch(fetchUserSessions() as any);
      }
    };

    const handleOffline = () => {
      toast.error("You're offline. Some features may not work properly.");
      dispatch(setNetworkError(true));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch, networkError]);

  // Check if user is logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sign in to access chat
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in or create an account to start chatting with our AI consultant.
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

  // Check if user has access to chat feature
  if (!canAccess('canUseChat')) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
                Subscription Required
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                <p>You need an active subscription to access the chat feature.</p>
                <p className="mt-1">{getUpgradeMessage('canUseChat')}</p>
              </div>
              <div className="mt-4">
                <Link
                  to="/pricing"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  View Subscription Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[90svh] border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <ChatSidebar />
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;