import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { fetchUserSessions, sendMessage, setNetworkError } from '../../redux/slices/chatSlice';
import { Mic, MicOff, Send, MessageSquare, X, Lock } from 'lucide-react';
import { RiVoiceAiLine } from "react-icons/ri";
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useAuth } from '../../hooks/useAuth';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import VoiceCallWithAI from '../../pages/Voicecall';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { validateAndSanitizeChatMessage } from '../../utils/securityUtils';
import usePlanAccess from '../../hooks/usePlanAccess';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const ChatInterface: React.FC = () => {
  const navigate = useNavigate();
  const { canAccess, getUpgradeMessage } = usePlanAccess();

  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, []);

  const dispatch = useDispatch();
  const { currentSession, loading, aiLoading, networkError } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const { authLoading } = useAuth()
  const [message, setMessage] = useState('');
  const [inputLoading, setinputLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const MAX_MESSAGE_LENGTH = 1000; // Match the limit in chatSlice.ts

  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isVoicechat] = useState(false)
  // Scroll to bottom whenever messages change
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputfocus = useRef<HTMLTextAreaElement>(null)
  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  useEffect(() => {
    if (isRecording && transcript) {
      setMessage(transcript);
    }
  }, [transcript, isRecording]);
  useEffect(() => {
    if (inputfocus.current && isRecording) {
      inputfocus.current.style.height = "40px";
      inputfocus.current.style.height = `${inputfocus.current.scrollHeight}px`;
    }
  }, [message, transcript, isRecording]);
console.log(inputLoading,aiLoading,loading)
  // First useEffect - only scroll on user input and initial loading
  useEffect(() => {
    // Only scroll when:
    // 1. User sends a new message (inputLoading changes to true)
    // 2. Initial loading of messages completes
    if (inputLoading || loading) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [inputLoading, loading]);

  // Second useEffect - scroll to show AI message when it starts generating
  useEffect(() => {
    // Scroll when an empty AI message is first added
    const hasEmptyAiMessage = currentSession?.messages?.some(msg =>
      msg.sender === "ai" && msg.text === ""
    );

    if (hasEmptyAiMessage && messagesContainerRef.current) {
      // Find the last message element
      const messagesContainer = messagesContainerRef.current;
      const lastMessageElement = messagesContainer.lastElementChild?.previousElementSibling;

      if (lastMessageElement) {
        // Scroll to position the last message slightly above the bottom
        const scrollOffset = 100; // Adjust this value as needed
        messagesContainer.scrollTop = lastMessageElement.offsetTop - scrollOffset;
      } else {
        // Fallback to scrolling to bottom if we can't find the element
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, []);

const toastShownRef = useRef(false); // Prevent duplicate toasts

  useEffect(() => {
    const count = user?.chatCount || 0;
    if (user && user.plan !== 'premium' && user.plan !== 'basic' && count === 0 && !toastShownRef.current) {
      toastShownRef.current = true; // mark as shown

      toast.error(
        <div onClick={() => navigate('/pricing')} className="cursor-pointer">
          You’ve reached your message limit. Click here to upgrade.
        </div>,
        {
          duration: 5000,
        }
      );
    }

    // Reset the toastShownRef if the user gets more messages or refreshes plan
    if (count > 0 || user?.plan) {
      toastShownRef.current = false;
    }
  }, [user?.chatCount, user?.plan, navigate]);
  useEffect(() => {
    if (user) {
     console.log("fetching user sessions from chat page")
     dispatch(fetchUserSessions() as any);
     }
  }, []);
  useEffect(() => {
    inputfocus.current?.focus()
  }, [currentSession]);

  // Handle retrying when network error occurs
  useEffect(() => {
    if (user && retrying) {
      console.log("Retrying to fetch user sessions from chat interface")
      toast.info("Reconnecting to server...");
      dispatch(fetchUserSessions() as any);
      setRetrying(false);
    }
  }, [retrying, user, dispatch]);

  // Show toast when network error occurs
  // useEffect(() => {
  //   if (networkError) {
  //     toast.error("Network error. Please check your internet connection.", {
  //       position: "top-right",
  //       autoClose: 5000,
  //       hideProgressBar: false,
  //       closeOnClick: true,
  //       pauseOnHover: true,
  //       draggable: true,
  //     });
  //   }
  // }, [networkError]);

  const handleRetry = () => {
    setRetrying(true);
    dispatch(setNetworkError(false));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // // Check if user has access to chat feature
    // if (!canAccess('canUseChat')) {
    //   toast.error(getUpgradeMessage('canUseChat'));
    //   navigate('/pricing');
    //   return;
    // }

    // Validate and sanitize the message
    const sanitizedMessage = validateAndSanitizeChatMessage(message, MAX_MESSAGE_LENGTH);

    // Check if message is valid
    if (!sanitizedMessage) {
      setinputLoading(false);
      if (isRecording) {
        // Don't show toast for empty voice messages to avoid annoying the user
        console.log('Invalid voice message detected, ignoring');
      } else if (!message.trim()) {
        toast.warning('Please enter a message before sending');
      } else if (message.length > MAX_MESSAGE_LENGTH) {
        toast.warning(`Your message exceeds the maximum length of ${MAX_MESSAGE_LENGTH} characters. Please shorten it.`);
      } else {
        toast.error('Your message contains potentially unsafe content and cannot be sent');
      }
      return;
    }

    setinputLoading(true)

    if (!user) {
      // Handle unauthenticated user
      toast.warning("Please log in to send messages");
      setinputLoading(false);
      return;
    }

    // Check if user has a premium plan
    const hasPremiumPlan = user.plan === 'premium' || user.plan === 'basic';

    // If user doesn't have a premium plan, check chat count
    if (!hasPremiumPlan && (user.chatCount === undefined || user.chatCount <= 0)) {
      toast.error("You've reached your free message limit. Please upgrade to a premium plan to continue chatting.", {
        position: "top-center",
        autoClose: 5000,
      });
      setinputLoading(false);
      navigate('/pricing');
      return;
    }

    // Log the current chat count for debugging
    console.log(`Current chat count: ${user.chatCount}`);


    try {
      // Use the sanitized message
      await dispatch(sendMessage({
        setinputLoading,
        setMessage,
        message: sanitizedMessage, // Use the sanitized message
        sessionId: currentSession?.id || "",
      }) as any);

      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.style.height = "40px"; // Reset to initial height
      }
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Check for specific error messages
      if (error.message?.includes('too long') ||
          error.message?.includes('maximum context length') ||
          error.message?.includes('context_length_exceeded')) {
        toast.error("Your message is too long for the AI to process. Please try sending a shorter message.");
      } else {
        toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
      }

      setinputLoading(false);
    }
  };
  // Start speech recognition with error handling
  const startListening = () => {
    try {
      SpeechRecognition.startListening({ continuous: true });
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast.error('Could not access microphone. Please check your browser permissions.');
    }
  };



  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }
  return (
    <div className="flex relative  flex-col h-[85%] bg-gray-50 dark:bg-gray-900 bg-transparent overflow-hidden">
      {/* Chat header */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          {authLoading ? (
            <Skeleton className="w-32 h-6 rounded-md" />
          ) : (
            <>  <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {currentSession?.title || "Chat"}
              </h2></>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* <button
            onClick={handleToggleVoice}
            className={`p-2 rounded-full
              ${isVoiceEnabled
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
            title={isVoiceEnabled ? 'Disable voice responses' : 'Enable voice responses'}
          >
            {isVoiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button> */}
        </div>
      </div>

      {/* Chat messages */}
      {/* Chat Messages */}
      <div ref={messagesContainerRef} className="flex-1 pb-6 p-4 overflow-y-auto scrollbar-hide scroll-smooth space-y-4">
        {/* Show skeleton loader only when the app is initially loading */}
        {authLoading ? (
          [...Array(5)].map((_, index) => (
            <div key={index} className="flex justify-start">
              <div className="max-w-[75%] bg-gray-200 dark:bg-gray-700 rounded-lg p-4 animate-pulse">
                <Skeleton className="w-40 h-4 mb-2" />
                <Skeleton className="w-24 h-4" />
              </div>
            </div>
          ))
        ) : networkError ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <X className="h-10 w-10 text-red-500 mb-3" />
            <h3 className="text-red-500 font-medium mb-2">Network Error</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
              Unable to connect to the server. Please check your connection.
            </p>
            <button
              onClick={() => {
                setRetrying(true);
                dispatch(setNetworkError(false));
              }}
              className="flex items-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
            >
              {retrying ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Reconnecting...
                </>
              ) : (
                <>
                  <span className="mr-2">⟳</span>
                  Retry
                </>
              )}
            </button>
          </div>
        ) : !currentSession?.messages?.length ? (
          <div className="flex flex-col items-center justify-center h-[90%] text-center text-gray-500 dark:text-gray-400">
            <MessageSquare className="h-12 w-12 mb-4 text-indigo-300 dark:text-indigo-700" />
            <p className="text-lg font-medium mb-2">Start a new conversation</p>
            <p className="max-w-md">
              Ask any health or wellness question, and our AI consultant will provide guidance.
            </p>
          </div>
        ) : (
          <>
            {/* Show previous messages */}
            {currentSession?.messages?.map((msg) => (
              msg ? (
                <div ref={messagesEndRef} key={msg?.id} className={`flex pt-5 ${msg?.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-2 ${msg?.sender === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <ReactMarkdown
                     remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                  {msg?.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : null
            ))}


            {/* Show typing indicator when waiting for AI response */}
            {aiLoading && (
              <div ref={messagesEndRef} className="flex justify-start">
                <div className="max-w-[75%] bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>



      {/* Premium upgrade prompt */}
      {/* {!currentPlan && currentSession?.messages?.length >= 10 && (
        <div className="bg-gradient-to-r sm:hidden md:block absolute bottom-24 left-0 right-0  from-indigo-500 to-purple-600 text-white p-4">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="font-bold text-lg">Need deeper help?</h3>
              <p className="text-indigo-100 mt-1">
                Upgrade to premium for voice calls with human experts and advanced AI features.
              </p>
            </div>
            <Link
              to="/pricing"
              className="flex items-center bg-white text-indigo-600 px-4 py-2 rounded-md font-medium text-sm hover:bg-indigo-50 transition-colors"
            >
              Upgrade <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      )} */}

      {/* Chat Input */}
      <div className="bg-white fixed w-screen md:w-[40%] bottom-0 md:bottom-3 rounded-2xl border left-1/2 transform -translate-x-1/2 dark:bg-gray-800 px-4 py-3 border-gray-300 dark:border-gray-700 shadow-lg">
        {/* Message count indicator for non-premium users */}
        {user && !user.plan && (
  <div className="mb-2 text-xs text-center">
    <span
      className={`font-medium ${
        (user.chatCount || 0) > 3 ? 'text-gray-600 dark:text-gray-300' : 'text-red-500'
      }`}
    >
      {(user.chatCount || 0) > 0
        ? `You have ${user.chatCount} free ${user.chatCount === 1 ? 'message' : 'messages'} remaining`
        : 'You have used all your free messages. Please upgrade to continue.'}
    </span>

    {/* Show Upgrade Link if chatCount is 3 or less (including 0) */}
    {(user.chatCount || 0) <= 3 && (
      <Link
        to="/pricing"
        className="ml-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        Upgrade now
      </Link>
    )}
  </div>
)}


        {authLoading ? (
          <Skeleton className="w-full h-12 rounded-md" />
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                // Implement the toggleRecording function inline
                if (isRecording) {
                  try {
                    SpeechRecognition.stopListening();
                    setIsRecording(false);

                    // If transcript is meaningful, keep it; otherwise clear it
                    if (transcript && transcript.trim().length < 2) {
                      setMessage('');
                      resetTranscript();
                    }
                  } catch (error) {
                    console.error('Error stopping recording:', error);
                    setIsRecording(false);
                  }
                } else {
                  resetTranscript();
                  startListening();
                  setIsRecording(true);
                  toast.info('Voice recording started', {
                    autoClose: 2000,
                    hideProgressBar: true,
                  });
                }
              }}

              className={`p-2 rounded-full ${isRecording
                ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 animate-pulse"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
            >
              {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>


            <div className="flex-1 relative">
              <textarea
                ref={inputfocus}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={aiLoading ? "AI is typing..." : "Type your message..."}
                className={`w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 ${message.length > MAX_MESSAGE_LENGTH ? 'focus:ring-red-500 border-red-500' : 'focus:ring-indigo-500'} resize-none overflow-hidden max-h-40 min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed`}
                rows={1}
                disabled={inputLoading || aiLoading}
                onInput={(e) => {
                  e.currentTarget.style.height = "40px";
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (message.trim() && !aiLoading && message.length <= MAX_MESSAGE_LENGTH) {
                      handleSendMessage(e);
                    } else if (message.length > MAX_MESSAGE_LENGTH) {
                      toast.warning("Your message is too long. Please shorten it.");
                    }
                  }
                }}
              />
              <div className={`absolute right-2 bottom-1 text-xs ${message.length > MAX_MESSAGE_LENGTH ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {message.length}/{MAX_MESSAGE_LENGTH}
              </div>
            </div>

            {message.length > 0 ? (
              isRecording && (message || transcript) ? (
                <button
                  type="button"
                  onClick={() => {
                    setinputLoading(false); // ✅ This line is the fix

                    SpeechRecognition.stopListening();
                    setIsRecording(false);
                    setMessage('');
                    resetTranscript();
                  }}
                  className="bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                  title="Stop & clear"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!message.trim() || inputLoading || aiLoading || message.length > MAX_MESSAGE_LENGTH}
                  className="bg-indigo-600 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (canAccess('canUseVoice')) {
                    navigate('/voicechat');
                  } else {
                    toast.error(getUpgradeMessage('canUseVoice'));
                    navigate('/pricing');
                  }
                }}
                disabled={inputLoading}
                className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={canAccess('canUseVoice') ? 'Start voice chat' : 'Upgrade to use voice chat'}
              >
                <RiVoiceAiLine className="h-5 w-5" />
              </button>
            )}


          </form>
        )}

        {isRecording && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
            <Mic className="h-4 w-4 mr-1 animate-pulse" />
            <span>Recording... Speak now</span>
          </div>
        )}
      </div>
      {isVoicechat &&
        <div className="absolute inset-y-0 inset-x-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex justify-center items-center  z-50">
          <VoiceCallWithAI />
        </div>}
    </div>
  );
};

export default ChatInterface;




