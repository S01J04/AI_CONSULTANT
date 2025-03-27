import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  Timestamp
} from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { v4 as uuidv4 } from 'uuid';
import { AppDispatch, RootState } from "../store";

// -----------------------
// Interfaces
// -----------------------
export interface Message {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
  timeStamp: number;
}

export interface ChatSession {
  id: string | null;
  messages: Message[];
  title: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  loading: boolean;
  aiLoading: boolean;
  error: string | null;
  sessionCache: Record<string, ChatSession>;
}

// Create a response cache for performance
const responseCache = new Map<string, string>();

// -----------------------
// Mock AI Response Function
// -----------------------
const handleAiResponse = (message: string): Promise<string> => {
  // Check cache first for better performance
  if (responseCache.has(message)) {
    return Promise.resolve(responseCache.get(message)!);
  }

  const dummyResponses = [
    "I understand your concern. Based on the symptoms you've described, it appears that you might be experiencing stress and anxiety, which can manifest in various physical ways. It might be beneficial to take some time to relax, practice mindfulness, and consider consulting a professional for further guidance.",
    "That's a great question! Maintaining a balanced diet and regular exercise routine is essential for overall health. Consider incorporating more fruits, vegetables, and lean proteins into your meals, and aim to engage in physical activity for at least 30 minutes each day to improve your well-being.",
    "Based on current medical guidelines, it is advisable to get this checked by a specialist, especially if your symptoms persist or worsen. Early intervention can lead to better outcomes, and a specialist will be able to provide you with a more personalized treatment plan to address your concerns.",
    "I'm here to help! Could you please provide more details about your symptoms so I can better understand your situation? The more information you share, the more accurately I can suggest steps or recommend professional advice tailored to your needs.",
    "From what you've shared, it seems like a common condition that can often be managed effectively with proper care and lifestyle adjustments. However, it might be beneficial to monitor your symptoms closely and consult with a healthcare professional for a comprehensive evaluation and advice, ensuring you receive the most appropriate care."
  ];

  return new Promise((resolve) => {
    setTimeout(() => {
      const response = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
      responseCache.set(message, response); // Cache the response
      resolve(response);
    }, 2000);
  });
};

// Utility function to convert Firestore timestamps
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toMillis) {
    return new Date(timestamp.toMillis());
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date();
};

// Helper function to map Firestore messages
const mapFirestoreMessages = (messages: any[]): Message[] => {
  if (!messages || !Array.isArray(messages)) return [];
  return messages.map(msg => ({
    id: msg.id,
    sender: msg.sender,
    text: msg.text,
    timeStamp: msg.timeStamp || msg.timestamp || Date.now()
  }));
};

// -----------------------
// Thunks
// -----------------------

// Fetch User Sessions
export const fetchUserSessions = createAsyncThunk<
  ChatSession[],
  void,
  { state: RootState; rejectValue: string }
>(
  "chat/fetchUserSessions",
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log("Fetching user sessions...");
      const userId = auth.currentUser?.uid;
      if (!userId) return rejectWithValue("User ID is required");

      const chatRef = collection(db, "chatSessions");
      const q = query(chatRef, where("userId", "==", userId));
      const getChats = await getDocs(q);

      // Map Firestore documents to ChatSession objects with proper type handling
      const sessions: ChatSession[] = getChats.docs.map((chat) => {
        const item = chat.data();
        return {
          id: chat.id,
          messages: mapFirestoreMessages(item.messages || []),
          title: item.title || "New Conversation",
          updatedAt: convertTimestamp(item.updatedAt),
          createdAt: convertTimestamp(item.createdAt),
        };
      });

      return sessions;
    } catch (error: any) {
      console.error("Error fetching user sessions:", error);
      return rejectWithValue(error.message || "Failed to fetch sessions");
    }
  }
);

// Send Message & Generate AI Response
export const sendMessage = createAsyncThunk<
  { sessionId: string; updatedTitle: string },
  { setinputLoading: (loading: boolean) => void; setMessage: (message: string) => void; message: string; sessionId: string },
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>(
  "chat/sendMessage",
  async (
    { setinputLoading, setMessage, message, sessionId },
    { dispatch, rejectWithValue, getState }
  ) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return rejectWithValue("User not found");

      // Create new session if needed
      if (!sessionId) {
        const action = await dispatch(createNewSession());
        if (createNewSession.fulfilled.match(action)) {
          sessionId = action.payload.id as string;
          if (!sessionId) return rejectWithValue("Failed to create session");
        } else {
          return rejectWithValue("Failed to create new session");
        }
      }

      // Create user message
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: "user",
        text: message,
        timeStamp: Date.now()
      };
      
      // Update UI immediately
      dispatch(addMessage({ sessionId, message: newMessage }));
      dispatch(setAiLoading({ sessionId, loading: true }));

      // Generate AI response
      let fullText = "";
      try {
        const response = await handleAiResponse(message);
        // Turn off AI loading immediately after getting the response
        dispatch(setAiLoading({ sessionId, loading: false }));
        
        // Create AI message
        const aiMessageId = Date.now().toString();
        const initialAiMessage: Message = {
          id: aiMessageId,
          sender: "ai",
          text: "",
          timeStamp: Date.now()
        };
        dispatch(addMessage({ sessionId, message: initialAiMessage }));

        // Simulate typing effect
        const words = response.split(' ');
        for (let i = 0; i < words.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          fullText += (i === 0 ? "" : " ") + words[i];
          dispatch(updateMessage({ sessionId, messageId: aiMessageId, text: fullText }));
        }
        setinputLoading(false);
        setMessage("");
      } catch (error) {
        console.error("Error generating AI response:", error);
        dispatch(setAiLoading({ sessionId, loading: false }));
        // Continue with saving the user message even if AI response fails
      }

      // Update Firestore
      const chatRef = doc(db, "chatSessions", sessionId);
      const aiMessage = {
        id: Date.now().toString(),
        sender: "ai",
        text: fullText,
        timeStamp: Date.now()
      };

      try {
        await updateDoc(chatRef, {
          messages: arrayUnion(newMessage, aiMessage),
          updatedAt: serverTimestamp()
        });

        // Update title if this is one of the first messages
        const updatedDoc = await getDoc(chatRef);
        const updatedData = updatedDoc.data();
        const updatedMessages = mapFirestoreMessages(updatedData?.messages || []);
        
        if (updatedMessages.length > 0 && updatedMessages.length < 4) {
          const updatedTitle = updatedMessages[0].text.slice(0, 50) + (updatedMessages[0].text.length > 50 ? '...' : '');
          await updateDoc(chatRef, {
            title: updatedTitle,
            updatedAt: serverTimestamp()
          });
          
          // Refresh sessions to get the updated title
          dispatch(fetchUserSessions());
           // Cleanup
          return { sessionId, updatedTitle };
        }
      } catch (error) {
        console.error("Error updating Firestore:", error);
        // The message is already in the Redux store, so we can continue
      }

      // Cleanup
      setinputLoading(false);
      setMessage("");
      
      return { sessionId, updatedTitle: "" };
    } catch (error: any) {
      console.error("Error in sendMessage:", error);
      setinputLoading(false);
      return rejectWithValue(error.message || "Failed to send message");
    }
  }
);

// Clear User Chat Sessions
export const clearChat = createAsyncThunk<
  boolean,
  void,
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>(
  "chat/clearChats",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return rejectWithValue("User not found");

      // Update local state first for immediate UI feedback
      dispatch(clearChats());

      // Delete from Firestore
      const chatCollectionRef = collection(db, "chatSessions");
      const chatQuery = query(chatCollectionRef, where("userId", "==", userId));
      const chatDocs = await getDocs(chatQuery);
      
      if (chatDocs.empty) {
        return true;
      }

      // Use batch for better performance with multiple documents
      const batch = writeBatch(db);
      chatDocs.docs.forEach((chatDoc) => {
        batch.delete(doc(db, "chatSessions", chatDoc.id));
      });
      
      await batch.commit();
      return true;
    } catch (error: any) {
      console.error("Error clearing chat sessions:", error);
      return rejectWithValue(error.message || "Failed to clear chats");
    }
  }
);

// Create a New Chat Session
export const createNewSession = createAsyncThunk<
  ChatSession,
  void,
  { rejectValue: string }
>(
  "chat/createNewSession",
  async (_, { rejectWithValue }) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return rejectWithValue("User is not logged in");

      // Prepare new session data
      const sessionId = uuidv4();
      const newChatSession: ChatSession = {
        id: sessionId,
        title: "New Conversation",
        messages: [],
        updatedAt: new Date(),
        createdAt: new Date()
      };

      // Create in Firestore
      const chatRef = collection(db, "chatSessions");
      const newChatDoc = await addDoc(chatRef, {
        userId,
        title: newChatSession.title,
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Return with Firestore ID
      return {
        ...newChatSession,
        id: newChatDoc.id
      };
    } catch (error: any) {
      console.error("Error creating new chat session:", error);
      return rejectWithValue(error.message || "Failed to create new session");
    }
  }
);

// -----------------------
// Redux Slice
// -----------------------
const chatSlice = createSlice({
  name: "chat",
  initialState: {
    sessions: [],
    currentSession: null,
    loading: false,
    aiLoading: false,
    error: null,
    sessionCache: {}
  } as ChatState,
  reducers: {
    addMessage: (state, action: PayloadAction<{ sessionId: string; message: Message }>) => {
      const { sessionId, message } = action.payload;
      const chat = state.sessions.find((chat) => chat.id === sessionId);
      if (chat) {
        chat.messages.push(message);
        if (state.currentSession && state.currentSession.id === sessionId) {
          state.currentSession.messages.push(message);
        }
      }
    },
    setMessages: (state, action: PayloadAction<{ sessionId: string; messages: Message[] }>) => {
      const { sessionId, messages } = action.payload;
      const chat = state.sessions.find((chat) => chat.id === sessionId);
      if (chat) {
        chat.messages = messages;
        if (state.currentSession && state.currentSession.id === sessionId) {
          state.currentSession.messages = messages;
        }
      }
    },
    setAiLoading: (state, action: PayloadAction<{ sessionId: string; loading: boolean }>) => {
      state.aiLoading = action.payload.loading;
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      // Find session by ID in sessions array
      const session = state.sessions.find(s => s.id === action.payload);
      // Update current session
      state.currentSession = session || null;
    },
    clearChats: (state) => {
      state.sessions = [];
      state.currentSession = null;
      state.sessionCache = {};
    },
    updateMessage: (state, action: PayloadAction<{ sessionId: string; messageId: string; text: string }>) => {
      const { sessionId, messageId, text } = action.payload;
      // Only update if it's the current session
      if (!state.currentSession || state.currentSession.id !== sessionId) return;
      
      const messageIndex = state.currentSession.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        state.currentSession.messages[messageIndex].text = text;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload;
        
        // Update current session only if not already set
        if (!state.currentSession && action.payload.length > 0) {
          state.currentSession = action.payload[0];
        }
        
        // Update session cache
        action.payload.forEach(session => {
          if (session.id) {
            state.sessionCache[session.id] = session;
          }
        });
      })
      .addCase(fetchUserSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch sessions";
      })
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        const { sessionId } = action.payload;
        
        // Find session
        const sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex !== -1) {
          const session = state.sessions[sessionIndex];
          
          // Update title based on first message if needed
          if (session.messages.length > 0) {
            const firstMessage = session.messages[0].text;
            const truncatedTitle = firstMessage.length > 50 
              ? `${firstMessage.substring(0, 50)}...` 
              : firstMessage;
              
            state.sessions[sessionIndex].title = truncatedTitle;
            state.sessions[sessionIndex].updatedAt = new Date();
            
            // Update current session if it matches
            if (state.currentSession && state.currentSession.id === sessionId) {
              state.currentSession.title = truncatedTitle;
              state.currentSession.updatedAt = new Date();
            }
            
            // Update cache
            if (session.id) {
              state.sessionCache[session.id] = state.sessions[sessionIndex];
            }
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.aiLoading = false;
        state.error = action.payload || "Failed to send message";
      })
      .addCase(clearChat.fulfilled, (state) => {
        // State already cleared in clearChats reducer
        state.loading = false;
      })
      .addCase(clearChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to clear chats";
      })
      .addCase(createNewSession.fulfilled, (state, action) => {
        const newSession = action.payload;
        
        // Add to sessions array
        state.sessions.push(newSession);
        
        // Set as current session
        state.currentSession = newSession;
        
        // Add to cache
        if (newSession.id) {
          state.sessionCache[newSession.id] = newSession;
        }
      })
      .addCase(createNewSession.rejected, (state, action) => {
        state.error = action.payload || "Failed to create new session";
      });
  }
});

export const { 
  addMessage, 
  setMessages, 
  setAiLoading, 
  setCurrentSession, 
  clearChats, 
  updateMessage 
} = chatSlice.actions;

export default chatSlice.reducer;
