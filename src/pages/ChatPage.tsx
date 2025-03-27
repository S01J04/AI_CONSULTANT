import React, { useEffect } from 'react';
import ChatInterface from '../components/chat/ChatInterface';
import ChatSidebar from '../components/chat/ChatSidebar';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { Link, useLocation } from 'react-router-dom';
import { fetchUserSessions, setCurrentSession } from '../redux/slices/chatSlice';

const ChatPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { sessions,currentSession, loading } = useSelector((state: RootState) => state.chat);
  const {state}=useLocation(state=>state.state)

  // Always call useEffect, but dispatch fetch only if user exists.

  console.log("state id",state)
  useEffect(() => { 
    if(state!=null){
      console.log("setting current session from chat page",state)
      dispatch(setCurrentSession(state))
    }} , [state,dispatch])

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
