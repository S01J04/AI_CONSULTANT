import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { fetchUserSessions, sendMessage } from '../../redux/slices/chatSlice';
import { Mic, MicOff, Send, Volume2, VolumeX, MessageSquare, Clock, ArrowRight, X } from 'lucide-react';
import { RiVoiceAiLine } from "react-icons/ri";
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { useAuth } from '../../hooks/useAuth';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const ChatInterface: React.FC = () => {



  useEffect(() => {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, []);

  const dispatch = useDispatch();
  const { currentSession, loading, aiLoading } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentPlan } = useSelector((state: RootState) => state.payment);
  const { authloading } = useAuth()
  const [message, setMessage] = useState('');
  const [inputLoading, setinputLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const footerHeight = 10; // Adjust this value based on your footer height
  // Scroll to bottom whenever messages change
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputfocus = useRef<HTMLTextAreaElement>(null)
  const {
    transcript,
    listening,
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

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [currentSession?.messages, loading]);

  // useEffect(() => {
  //   if (user) {
  //    console.log("fetching user sessions from chat page")
  //   dispatch(fetchUserSessions() as any);
  //   }
  // }, []);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    inputfocus.current?.focus()
  }, [currentSession]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setinputLoading(true)
    if (!message.trim()) return;

    if (!user) {
      // Handle unauthenticated user
      return;
    }
    console.log("current session", user)

    try {
      await dispatch(sendMessage({
        setinputLoading,
        setMessage,
        message,
        sessionId: currentSession?.id || null,
        // userId: user.uid,
      }) as any);
      console.log("setting message to none")

      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.style.height = "40px"; // Reset to initial height
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  const startListening = () => SpeechRecognition.startListening({ continuous: true });

  const handleToggleVoice = () => {
    dispatch(toggleVoice());
  };
  // console.log("current messages",currentSession?.messages)
  const handleToggleRecording = () => {
    // In a real app, this would use the Web Speech API or a similar service
    setIsRecording(!isRecording);

    if (!isRecording) {
      // Start recording
      console.log('Recording started...');
      // Simulate recording for demo purposes
      setTimeout(() => {

        setIsRecording(false);
        setMessage('This is a simulated voice message that would be transcribed from actual speech in a production environment.');
      }, 3000);
    } else {
      // Stop recording
      console.log('Recording stopped.');
    }
  };
  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }
  return (
    <div className="flex relative  flex-col h-[90%] bg-gray-50 dark:bg-gray-900 bg-transparent overflow-hidden">
      {/* Chat header */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          {authloading ? (
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
        {authloading ? (
          [...Array(5)].map((_, index) => (
            <div key={index} className="flex justify-start">
              <div className="max-w-[75%] bg-gray-200 dark:bg-gray-700 rounded-lg p-4 animate-pulse">
                <Skeleton className="w-40 h-4 mb-2" />
                <Skeleton className="w-24 h-4" />
              </div>
            </div>
          ))
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
                    <p className="break-words whitespace-pre-wrap">{msg?.text}</p>
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
        {authloading ? (
          <Skeleton className="w-full h-12 rounded-md" />
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                if (!isRecording) {
                  startListening(); // ✅ call it
                } else {
                  SpeechRecognition.stopListening();  // ✅ call it
                  resetTranscript();

                  
                }
                setIsRecording(!isRecording);
              }}

              className={`p-2 rounded-full ${isRecording
                ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 animate-pulse"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
            >
              {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>


            <textarea
              ref={inputfocus}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={loading ? "AI is typing..." : "Type your message..."}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-hidden max-h-40 min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              disabled={inputLoading}
              onInput={(e) => {
                e.currentTarget.style.height = "40px";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (message.trim() && !aiLoading) {
                    handleSendMessage(e);
                  }
                }
              }}
            />

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
                  disabled={!message.trim() || inputLoading}
                  className="bg-indigo-600 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={inputLoading}
                className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};

export default ChatInterface;

