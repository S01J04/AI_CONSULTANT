import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, addDoc, serverTimestamp, query, where, orderBy,doc, getDocs, updateDoc, arrayUnion, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: number;
  isVoice?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  loading: boolean;
  error: string | null;
  isVoiceEnabled: boolean;
}

const initialState: ChatState = {
  sessions: [],
  currentSession: null,
  loading: false,
  error: null,
  isVoiceEnabled: false,
};

// Simulated AI response function (in a real app, this would call an actual AI service)
const getAIResponse = async (message: string): Promise<string> => {
  // Simulate network delay
  
  const responses = [
    "I understand your concern. Based on the symptoms you've described, it could be related to stress or anxiety. However, I recommend consulting with a healthcare professional for a proper diagnosis.",
    "That's a great question! The recommended approach would be to maintain a balanced diet and regular exercise routine. Would you like more specific advice?",
    "Based on current medical guidelines, it's advisable to get this checked by a specialist. Would you like me to help you schedule a consultation with one of our experts?",
    "I'm here to help! Could you provide more details about your symptoms so I can give you more accurate information?",
    "From what you've shared, this seems like a common condition that can be managed with proper care. Let me explain some self-care strategies you might find helpful."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

export const fetchUserSessions = createAsyncThunk(
  'chat/fetchUserSessions',
  async (userId: string, { rejectWithValue }) => {
    try {
      const sessionsRef = collection(db, 'chatSessions');
      const q = query(
        sessionsRef,
        where('userId', '==', userId),
        // orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const sessions: ChatSession[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          title: data.title,
          messages: data.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp.toMillis ? msg.timestamp.toMillis() : msg.timestamp,
          })),
          createdAt: data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt,
          updatedAt: data.updatedAt.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
        });
      });
      console.log(sessions)
      return sessions;
    } catch (error: any) {
      console.error("Error fetching user sessions:", error);
      return rejectWithValue(error.message || "Failed to fetch user sessions");
    }
  }
);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ text, sessionId, userId }: { text: string; sessionId: string | null; userId: string }, { getState, dispatch }) => {
    try {
      const state = getState() as { chat: ChatState };
      let currentSessionId = sessionId;
      let sessionRef;

      // 1. Create user message with temporary ID
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        text,
        sender: "user",
        timestamp: Date.now(),
      };

      // 2. Add user message to Redux immediately (optimistic update)
      dispatch(addMessageToRedux({ sessionId: currentSessionId || '', message: userMessage }));

      // 3. Create or get session in Firestore
      if (!currentSessionId) {
        const sessionData = {
          title: text.substring(0, 30) + (text.length > 30 ? "..." : ""),
          messages: [userMessage],
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "chatSessions"), sessionData);
        currentSessionId = docRef.id;
        sessionRef = doc(db, "chatSessions", currentSessionId);
      } else {
        sessionRef = doc(db, "chatSessions", currentSessionId);
      }

      // 4. Save user message to Firestore
      await updateDoc(sessionRef, {
        messages: arrayUnion({ ...userMessage, id: uuidv4() }),
        updatedAt: serverTimestamp(),
      });

      // 5. Update Redux with permanent ID for user message
      dispatch(updateMessageInRedux({ 
        sessionId: currentSessionId, 
        tempId: userMessage.id, 
        newMessageId: uuidv4() 
      }));

      // 6. Get AI response asynchronously
      const aiResponseText = await getAIResponse(text);
      const aiMessage: Message = {
        id: uuidv4(),
        text: aiResponseText,
        sender: "ai",
        timestamp: Date.now(),
      };

      // 7. Add AI message to Firestore
      await updateDoc(sessionRef, {
        messages: arrayUnion(aiMessage),
        updatedAt: serverTimestamp(),
      });

      // 8. Add AI message to Redux
      dispatch(addMessageToRedux({ sessionId: currentSessionId, message: aiMessage }));

      return { sessionId: currentSessionId, userMessage, aiMessage };
    } catch (error: any) {
      console.error("Error sending message:", error);
      // Reset loading state on error
      dispatch({ type: 'chat/setLoading', payload: false });
      throw error;
    }
  }
);


export const createNewSession = createAsyncThunk(
  "chat/createNewSession",
  async (_, { getState }) => {
    // Ensure user is logged in
    if (!auth.currentUser) {
      throw new Error("User is not logged in");
    }

    const userId = auth.currentUser.uid;
    console.log("Creating session for user:", userId);

    const sessionData: Omit<ChatSession, "id"> = {
      title: "New Conversation",
      messages: [],
      userId,
      createdAt: serverTimestamp(), // Firestore timestamp
      updatedAt: serverTimestamp(),
    };

    // 🔹 Save to Firestore
    const docRef = await addDoc(collection(db, "chatSessions"), sessionData);

    // 🔹 Fetch session data from Firestore
    const sessionSnap = await getDoc(docRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session creation failed.");
    }

    const session = sessionSnap.data();

    // Convert Firestore timestamp to JavaScript timestamp
    return {
      id: docRef.id,
      ...session,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
);

export const clearChat = createAsyncThunk(
  'chat/clearChat',
  async (userId: string, { rejectWithValue }) => {
    try {
      const sessionsRef = collection(db, 'chatSessions');
      const q = query(
        sessionsRef,
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );

      await Promise.all(deletePromises);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to clear chat history");
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessageToRedux: (state, action: PayloadAction<{ sessionId: string; message: Message }>) => {
      const { sessionId, message } = action.payload;
      const session = state.sessions.find((s) => s.id === sessionId);
      if (session) {
        session.messages.push(message);
      }
    },
    // **Replace temp message ID with Firestore ID**
    updateMessageInRedux: (state, action: PayloadAction<{ sessionId: string; tempId: string; newMessageId: string }>) => {
      const { sessionId, tempId, newMessageId } = action.payload;
      const session = state.sessions.find((s) => s.id === sessionId);
      if (session) {
        const message = session.messages.find((m) => m.id === tempId);
        if (message) {
          message.id = newMessageId;
        }
      }
    },
    setNewSession: (state, action: PayloadAction<ChatSession>) => {
      state.sessions.unshift(action.payload); // Use Firestore session
      state.currentSession = action.payload;
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      const session = state.sessions.find(s => s.id === action.payload);
      if (session) {
        state.currentSession = session;
      }
    },    
    toggleVoice: (state) => {
      state.isVoiceEnabled = !state.isVoiceEnabled;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
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
        
        if (action.payload.length > 0) {
          state.currentSession = action.payload[0];
        }
      })
      .addCase(fetchUserSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      
        const { sessionId, userMessage, aiMessage } = action.payload;
        let sessionIndex = state.sessions.findIndex(s => s.id === sessionId);
      
        if (sessionIndex === -1) {
          console.warn(`Session with ID ${sessionId} not found in Redux store. Adding it now.`);
      
          const newSession: ChatSession = {
            id: sessionId,
            title: userMessage.text.substring(0, 30) + (userMessage.text.length > 30 ? "..." : ""),
            messages: [userMessage, aiMessage],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
      
          state.sessions.unshift(newSession);
          state.currentSession = newSession;
        } else {
          state.sessions[sessionIndex].messages.push(userMessage, aiMessage);
          state.sessions[sessionIndex].updatedAt = Date.now();
      
          if (state.sessions[sessionIndex].messages.length === 2) {
            state.sessions[sessionIndex].title = userMessage.text.substring(0, 30) + 
              (userMessage.text.length > 30 ? "..." : "");
          }
      
          if (state.currentSession?.id === sessionId) {
            state.currentSession.messages.push(userMessage, aiMessage);
            state.currentSession.updatedAt = Date.now();
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to send message';
      })
      .addCase(clearChat.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearChat.fulfilled, (state) => {
        state.loading = false;
        state.sessions = [];
        state.currentSession = null;
      })
      .addCase(clearChat.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { addMessageToRedux, updateMessageInRedux,setNewSession, setCurrentSession, toggleVoice, clearError, setLoading } = chatSlice.actions;
export default chatSlice.reducer;
