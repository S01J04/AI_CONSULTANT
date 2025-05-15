import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { createNewSession, setCurrentSession } from '../../redux/slices/chatSlice';
import { format, isToday, isYesterday, subDays, subMonths, isWithinInterval } from 'date-fns';
import { MessageSquare, X } from 'lucide-react';
import { GoSidebarExpand } from "react-icons/go";
import { HiOutlinePencilSquare } from "react-icons/hi2";
import Skeleton from 'react-loading-skeleton';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from 'react-router-dom';

const ChatSidebar: React.FC = () => {
  const dispatch = useDispatch();
  const {loading, sessions, currentSession } = useSelector((state: RootState) => state.chat);

  // console.log("sessions",sessions,currentSession)
  const {authloading}=useAuth()
  const [isOpen, setIsOpen] = useState(false);
  
  // Handle outside click to close sidebar
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (isOpen && !(event.target as HTMLElement).closest('.sidebar-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleNewChat = async () => {
    const action = await dispatch(createNewSession());
  
    console.log("New session created:", action.payload);
  
    // if (createNewSession.fulfilled.match(action)) {
    //   // dispatch(setNewSession(action.payload)); // Update Redux store
    //   dispatch(setCurrentSession(action.payload.id)); // Set active session
    // }
  };
  

  const handleSelectSession = (sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
  
    // Delay closing sidebar to ensure session state updates
    setTimeout(() => {
      setIsOpen(false);
    }, 100); 
  };
  

  // Categorize chats based on time
  const categorizeSessions = () => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const last3Days: any[] = [];
    const last7Days: any[] = [];
    const last30Days: any[] = [];
    const older: any[] = [];

    const now = new Date();
    const threeDaysAgo = subDays(now, 3);
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);
    const threeMonthsAgo = subMonths(now, 3);

    sessions.forEach((session) => {
      const sessionDate = new Date(session.updatedAt);

      if (isToday(sessionDate)) {
        today.push(session);
      } else if (isYesterday(sessionDate)) {
        yesterday.push(session);
      } else if (isWithinInterval(sessionDate, { start: threeDaysAgo, end: now })) {
        last3Days.push(session);
      } else if (isWithinInterval(sessionDate, { start: sevenDaysAgo, end: now })) {
        last7Days.push(session);
      } else if (isWithinInterval(sessionDate, { start: thirtyDaysAgo, end: now })) {
        last30Days.push(session);
      } else {
        older.push(session);
      }
    });

    return { today, yesterday, last3Days, last7Days, last30Days, older };
  };

  const { today, yesterday, last3Days, last7Days, last30Days, older } = categorizeSessions();

  return (
    <>
      {/* Header Section with Hamburger */}
      <div className="flex items-center justify-between lg:justify-end bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        {/* Hamburger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-gray-600 hover:text-gray-800 p-2 rounded-md"
        >
          {isOpen ? <X className="h-6 w-6" /> : <GoSidebarExpand className="h-6 w-6" />}
        </button>

        {/* New Chat Button (Icon with Tooltip) */}
        <div className="relative group">
  {authloading? (
    <Skeleton width={40} height={40} />
  ) : (
    <button onClick={handleNewChat} className="text-gray-600 hover:text-gray-800 p-2 rounded-md">
      <HiOutlinePencilSquare className="h-6 w-6" />
    </button>
  )}
  <span className="absolute z-[1000] text-nowrap top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 text-xs bg-gray-800 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
    New Conversation
  </span>
</div>
 
      </div>

      {/* Sidebar */}
      <div
  className={`fixed top-[60px] sidebar-container left-0 h-[70vh] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col w-[70%] max-w-sm transform transition-transform ease-in-out duration-300 z-40
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:w-64 md:max-w-none md:static
  `}
>

        <div className="flex-1 overflow-y-auto p-2">
          {authloading ? (
            // Skeleton Loader While Fetching Sessions
            <div className="p-2">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="mb-3">
                  <Skeleton className="w-full h-10 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            [
              { title: "Today", sessions: today },
              { title: "Yesterday", sessions: yesterday },
              { title: "Previous 3 Days", sessions: last3Days },
              { title: "Previous 7 Days", sessions: last7Days },
              { title: "Previous 30 Days", sessions: last30Days },
              { title: "Older than 3 Months", sessions: older },
            ].map(({ title, sessions }) =>
              sessions.length > 0 && (
                <div key={title} className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
                    {title}
                  </h3>
                  <ul className="space-y-1">
                    {sessions.map((session) => (
                      <li key={session.id}>
                        <button
                          onClick={() => handleSelectSession(session.id)}
                          className={`w-full flex items-start p-2 rounded-md text-left ${
                            currentSession?.id === session.id
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <MessageSquare className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{session.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {format(new Date(session.updatedAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )
          )}

          {!authloading && sessions.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <p>No conversations yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;