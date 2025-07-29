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
import { toast } from 'react-toastify';
import { updateChatCount } from "./authSlice";

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
  sessionsLoading: boolean;
  aiLoading: boolean;
  error: string | null;
  networkError: boolean;
  sessionCache: Record<string, ChatSession>;
}

// AI Response Implementation

// -----------------------
// Mock AI Response Function
// -----------------------

// const handleAiResponse = async (
//   message: string,
//   sessionId: string,
//   onChunk?: (chunk: string) => void
// ): Promise<string> => {
//   try {
//     const MAX_MESSAGE_LENGTH = 1000;
//     let trimmedMessage = message;
//     if (message.length > MAX_MESSAGE_LENGTH) {
//       trimmedMessage = message.substring(0, MAX_MESSAGE_LENGTH) + "... (message truncated)";
//     }
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 15000);
//     const response = await fetch(`https://ai-consultant-chatbot-371140242198.asia-south1.run.app/chat/text`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Accept': 'text/event-stream'
//       },
//       body: JSON.stringify({
//         user_id: sessionId,
//         message: trimmedMessage,
//         client_type: "web"
//       }),
//       signal: controller.signal
//     });
//     clearTimeout(timeoutId);
//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Server Error ${response.status}: ${errorText}`);
//     }
//     console.log(response);
//     const reader = response.body?.getReader();
//     const decoder = new TextDecoder('utf-8');
//     let finalMessage = '';
//     while (reader) {
//       const { done, value } = await reader.read();
//       if (done) break;
//       const chunk = decoder.decode(value, { stream: true });
//       const lines = chunk.split('\n');
//       for (const line of lines) {
//         if (line.startsWith('data: ')) {
//           const jsonStr = line.replace(/^data:\s*/, '').trim();
//           try {
//             const parsed = JSON.parse(jsonStr);
//             if (parsed.message) {
//               finalMessage += parsed.message;
//               if (onChunk) onChunk(finalMessage);
//             }
//           } catch (e) {
//             // Ignore parse errors for non-JSON lines
//           }
//         }
//       }
//     }
//     if (!finalMessage) throw new Error('No message returned from AI');
//     return finalMessage;
//   } catch (error: any) {
//     if (error.name === 'AbortError') {
//       throw new Error('Request timed out. Please try again.');
//     }
//     throw error;
//   }
// };
// =======================
// AI RESPONSE HANDLER
// =======================
const handleAiResponse = async (
  message: string,
  sessionId: string,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  console.log("🚀 [AI] Starting handleAiResponse");
  try {
    const MAX_MESSAGE_LENGTH = 1000;
    let trimmedMessage = message;
    if (message.length > MAX_MESSAGE_LENGTH) {
      trimmedMessage = message.substring(0, MAX_MESSAGE_LENGTH) + "... (message truncated)";
      console.log("✂️ [AI] Message truncated due to length");
    }

    console.log("📤 [AI] Sending request:", { sessionId, message: trimmedMessage });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error("⏱️ [AI] Request timed out");
      controller.abort();
    }, 15000);

    const response = await fetch(`https://ai-consultant-chatbot-371140242198.asia-south1.run.app/chat/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({ user_id: uuidv4(), message: trimmedMessage, client_type: "web" }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [AI] Server Error ${response.status}:`, errorText);
      throw new Error(`Server Error ${response.status}: ${errorText}`);
    }

    console.log("✅ [AI] Streaming started");
    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    let finalMessage = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("🔚 [AI] Streaming ended");
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.replace(/^data:\s*/, '').trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.message) {
              console.log("📥 [AI Chunk Received]:", parsed.message);
              finalMessage += parsed.message;
              if (onChunk) onChunk(finalMessage);
            }
          } catch (e) {
            console.warn("⚠️ [AI] Ignoring non-JSON line:", line);
          }
        }
      }
    }

    if (!finalMessage) throw new Error('No message returned from AI');
    console.log("✅ [AI] Final message ready:", finalMessage);
    return finalMessage;

  } catch (error: any) {
    console.error("❌ [AI] Error in handleAiResponse:", error);
    if (error.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw error;
  }
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
  async (_, { rejectWithValue }) => {
    try {
      console.log("Fetching user sessions...");
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log("User not logged in yet, skipping session fetch");
        return []; // Return empty array instead of error
      }

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
// export const sendMessage = createAsyncThunk<
//   { sessionId: string; updatedTitle: string },
//   { setinputLoading: (loading: boolean) => void; setMessage: (message: string) => void; message: string; sessionId: string },
//   { state: RootState; dispatch: AppDispatch; rejectValue: string }
// >(
//   "chat/sendMessage",
//   async (
//     { setinputLoading, setMessage, message, sessionId },
//     { dispatch, rejectWithValue }
//   ) => {
//     try {
//       const userId = auth.currentUser?.uid;
//       if (!userId) return rejectWithValue("User not found");

//       // Create new session if needed
//       if (!sessionId) {
//         const action = await dispatch(createNewSession());
//         if (createNewSession.fulfilled.match(action)) {
//           sessionId = action.payload.id as string;
//           if (!sessionId) return rejectWithValue("Failed to create session");
//         } else {
//           return rejectWithValue("Failed to create new session");
//         }
//       }

//       // Create user message
//       const newMessage: Message = {
//         id: Date.now().toString(),
//         sender: "user",
//         text: message,
//         timeStamp: Date.now()
//       };

//       // Update UI immediately
//       dispatch(addMessage({ sessionId, message: newMessage }));
//       dispatch(setAiLoading({ sessionId, loading: true }));

//       // Generate AI response
//       let fullText = "";
//       try {


//         // Typing effect for streamed AI response
//         const aiMessageId = Date.now().toString();
//         const initialAiMessage: Message = {
//           id: aiMessageId,
//           sender: "ai",
//           text: "",
//           timeStamp: Date.now()
//         };
//         dispatch(addMessage({ sessionId, message: initialAiMessage }));
//         let fullText = "";
//         let firstChunk = true;
//         await handleAiResponse(message, sessionId, (partial) => {
//           fullText = partial;
//           dispatch(updateMessage({ sessionId, messageId: aiMessageId, text: fullText }));
//           if (firstChunk) {
//             dispatch(setAiLoading({ sessionId, loading: false }));
//             firstChunk = false;
//           }
//         });
//                     setinputLoading(false);

//         setMessage("");
//       } catch (error: any) {
//         console.error("Error generating AI response:", error);
//         dispatch(setAiLoading({ sessionId, loading: false }));

//         // Add an error message from the AI
//         const aiErrorMessageId = Date.now().toString();
//         let errorMessage = "I'm sorry, I encountered an error processing your request. Please try again later.";

//         // Customize error message based on error type
//         if (error.message?.includes('Network error') || error.message?.includes('fetch')) {
//           errorMessage = "I'm having trouble connecting to the server. Please check your internet connection and try again.";
//           dispatch(setNetworkError(true));
//         } else if (error.message?.includes('timed out')) {
//           errorMessage = "The request timed out. Please try again when you have a better connection.";
//           dispatch(setNetworkError(true));
//         } else if (error.message?.includes('status: 500') || error.message?.includes('Internal server error')) {
//           errorMessage = "The server is experiencing issues. Please try again later.";
//         } else if (error.message?.includes('missing message field') || error.message?.includes('Invalid response')) {
//           errorMessage = "I received an invalid response from the server. This might be a temporary issue. Please try again.";
//         } else if (error.message?.includes('context_length_exceeded') ||
//                    error.message?.includes('maximum context length') ||
//                    error.message?.includes('too long for AI')) {
//           errorMessage = "Your message is too long for me to process. Please send a shorter message or break it into smaller parts.";
//         }

//         const aiErrorMessage: Message = {
//           id: aiErrorMessageId,
//           sender: "ai",
//           text: errorMessage,
//           timeStamp: Date.now()
//         };

//         // Show a toast notification for the error
//         toast.error(`Error: ${error.message?.substring(0, 100)}`, {
//           position: "top-right",
//           autoClose: 5000,
//           hideProgressBar: false,
//           closeOnClick: true,
//           pauseOnHover: true,
//           draggable: true,
//         });

//         dispatch(addMessage({ sessionId, message: aiErrorMessage }));
//         setinputLoading(false);
//         setMessage("");
//         return { sessionId, updatedTitle: "" };
//       }

//       // Update Firestore
//       try {
//         const chatRef = doc(db, "chatSessions", sessionId);
//         const aiMessage = {
//           id: Date.now().toString(),
//           sender: "ai",
//           text: fullText,
//           timeStamp: Date.now()
//         };

//         await updateDoc(chatRef, {
//           messages: arrayUnion(newMessage, aiMessage),
//           updatedAt: serverTimestamp()
//         });

//         // Get user data to check plan and update chat count
//         const userRef = doc(db, "users", userId);
//         const userDoc = await getDoc(userRef);

//         if (userDoc.exists()) {
//           const userData = userDoc.data();
//           const hasPremiumPlan = userData.plan === 'premium' || userData.plan === 'basic';

//           // Only decrement chat count for non-premium users
//           if (!hasPremiumPlan && userData.chatCount !== undefined) {
//             // Calculate new chat count
//             const newChatCount = Math.max(0, userData.chatCount - 1);

//             // Update Firestore
//             await updateDoc(userRef, {
//               chatCount: newChatCount
//             });

//             // Update Redux state
//             dispatch(updateChatCount({
//               uid: userId,
//               chatCount: newChatCount
//             }));
//           }
//         }

//         // Update title if this is one of the first messages
//       const updatedDoc = await getDoc(chatRef);
//         const updatedData = updatedDoc.data();
//         const updatedMessages = mapFirestoreMessages(updatedData?.messages || []);

//       if (updatedMessages.length > 0 && updatedMessages.length < 4) {
//           const updatedTitle = updatedMessages[0].text.slice(0, 50) + (updatedMessages[0].text.length > 50 ? '...' : '');
//         await updateDoc(chatRef, {
//           title: updatedTitle,
//           updatedAt: serverTimestamp()
//         });

//           // Refresh sessions to get the updated title
//           dispatch(fetchUserSessions());



//           // Cleanup
//           return { sessionId, updatedTitle };
//         }





//         // Cleanup
//         setinputLoading(false);
//         setMessage("");

//         return { sessionId, updatedTitle: "" };
//       } catch (firestoreError: any) {
//         console.error("Error updating Firestore:", firestoreError);

//         // Show error toast
//         toast.error(`Error saving message: ${firestoreError.message || 'Unknown error'}`, {
//           position: "top-right",
//           autoClose: 5000,
//           hideProgressBar: false,
//           closeOnClick: true,
//           pauseOnHover: true,
//           draggable: true,
//         });

//         // Cleanup
//         setinputLoading(false);
//         setMessage("");

//         return { sessionId, updatedTitle: "" };
//       }
//     } catch (error: any) {
//       console.error("Error in sendMessage:", error);
//       setinputLoading(false);

//       // Show error toast
//       toast.error(`Error sending message: ${error.message || 'Unknown error'}`, {
//         position: "top-right",
//         autoClose: 5000,
//         hideProgressBar: false,
//         closeOnClick: true,
//         pauseOnHover: true,
//         draggable: true,
//       });

//       return rejectWithValue(error.message || "Failed to send message");
//     }
//   }
// );
export const sendMessage = createAsyncThunk<
  { sessionId: string; updatedTitle: string },
  { setinputLoading: (loading: boolean) => void; setMessage: (message: string) => void; message: string; sessionId: string },
  { state: RootState; dispatch: AppDispatch; rejectValue: string }
>(
  "chat/sendMessage",
  async (
    { setinputLoading, setMessage, message, sessionId },
    { dispatch, rejectWithValue }
  ) => {
    console.log("🚀 [sendMessage] Triggered:", { message, sessionId });

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error("❌ [sendMessage] No user found");
        return rejectWithValue("User not found");
      }

      // ✅ Create session if needed
      if (!sessionId) {
        console.log("🆕 [sendMessage] No session found. Creating new session...");
        const action = await dispatch(createNewSession());
        if (createNewSession.fulfilled.match(action)) {
          sessionId = action.payload.id as string;
          console.log("✅ [sendMessage] New session created:", sessionId);
        } else {
          console.error("❌ [sendMessage] Failed to create session");
          return rejectWithValue("Failed to create session");
        }
      }

      // ✅ Generate unique IDs
      const userMessageId = `${Date.now()}-${Math.random()}`;
      const aiMessageId = `${Date.now()}-${Math.random()}`;

      // ✅ Create user message
      const newMessage: Message = {
        id: userMessageId,
        sender: "user",
        text: message,
        timeStamp: Date.now()
      };
      console.log("📝 [Redux] Adding user message:", newMessage);
      dispatch(addMessage({ sessionId, message: newMessage }));
      dispatch(setAiLoading({ sessionId, loading: true }));

      // ✅ Create AI placeholder
      console.log("🤖 [Redux] Creating AI placeholder:", aiMessageId);
      dispatch(addMessage({
        sessionId,
        message: { id: aiMessageId, sender: "ai", text: "", timeStamp: Date.now() }
      }));

      // ✅ AI Response Streaming
      let fullText = "";
      let firstChunk = true;
      try {
        console.log("📤 [AI] Requesting AI response...");
        await handleAiResponse(message, sessionId, (partial) => {
          console.log("📥 [AI Chunk]:", partial);
          fullText = partial;

          // ✅ Update only AI message (Safe)
          dispatch(updateMessage({
            sessionId,
            messageId: aiMessageId,
            text: fullText,
            sender: "ai" // ensure we only touch AI messages
          }));

          if (firstChunk) {
            dispatch(setAiLoading({ sessionId, loading: false }));
            console.log("✅ [AI] First chunk received, loader stopped");
            firstChunk = false;
          }
        });
      } catch (err) {
                    dispatch(setAiLoading({ sessionId, loading: false }));
 setinputLoading(false);
      setMessage("");
        console.error("❌ [AI] Streaming failed:", err);
      }

      // ✅ Handle empty AI response
      if (!fullText.trim()) {
        console.warn("⚠️ [AI] Empty response. Using fallback.");
        fullText = "I'm sorry, I couldn't process your request.";
        dispatch(updateMessage({ sessionId, messageId: aiMessageId, text: fullText, sender: "ai" }));
      }

      // ✅ Save to Firestore
      console.log("💾 [DB] Saving to Firestore...");
      const chatRef = doc(db, "chatSessions", sessionId);
      await updateDoc(chatRef, {
        messages: arrayUnion(
          newMessage,
          { id: aiMessageId, sender: "ai", text: fullText, timeStamp: Date.now() }
        ),
        updatedAt: serverTimestamp()
      });
      console.log("✅ [DB] Messages saved successfully");

      // ✅ Update chat count (if needed)
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const hasPremium = userData.plan === 'premium' || userData.plan === 'basic';
        if (!hasPremium && userData.chatCount !== undefined) {
          const newChatCount = Math.max(0, userData.chatCount - 1);
          await updateDoc(userRef, { chatCount: newChatCount });
          dispatch(updateChatCount({ uid: userId, chatCount: newChatCount }));
          console.log("🔄 [DB] Chat count updated:", newChatCount);
        }
      }

      // ✅ Update title if few messages
      const updatedDoc = await getDoc(chatRef);
      const updatedData = updatedDoc.data();
      const updatedMessages = mapFirestoreMessages(updatedData?.messages || []);
      let updatedTitle = "";
      if (updatedMessages.length > 0 && updatedMessages.length < 4) {
        updatedTitle = updatedMessages[0].text.slice(0, 50) + (updatedMessages[0].text.length > 50 ? '...' : '');
        await updateDoc(chatRef, { title: updatedTitle, updatedAt: serverTimestamp() });
        console.log("✏️ [DB] Updated chat title:", updatedTitle);
        dispatch(fetchUserSessions());
      }

      // ✅ Cleanup
      setinputLoading(false);
      setMessage("");
      console.log("✅ [sendMessage] Completed successfully");
      return { sessionId, updatedTitle };

    } catch (error: any) {
      console.error("❌ [sendMessage] Error:", error);
      setinputLoading(false);
      toast.error(`Error: ${error.message || 'Unknown error'}`, { position: "top-right", autoClose: 5000 });
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
    sessionsLoading: false,
    aiLoading: false,
    error: null,
    networkError: false,
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
    setNetworkError: (state, action: PayloadAction<boolean>) => {
      state.networkError = action.payload;
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
        state.sessionsLoading = true;
        state.error = null;
        state.networkError = false;
      })
      .addCase(fetchUserSessions.fulfilled, (state, action) => {
        state.sessionsLoading = false;
        state.sessions = action.payload;
        state.networkError = false;

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
        state.sessionsLoading = false;

        // Check if it's a network error
        if (action.payload === 'network-error' ||
            (typeof action.payload === 'string' && action.payload.includes('network'))) {
          state.networkError = true;
          state.error = "Network error. Please check your internet connection.";

          // Show network error toast
          toast.error("Network error. Please check your internet connection.", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } else {
          state.error = action.payload || "Failed to fetch sessions";

          // Show general error toast
          toast.error(`Error: ${action.payload || "Failed to fetch sessions"}`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      })
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.networkError = false;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.networkError = false;
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

        // Check if it's a network error
        if (action.payload && typeof action.payload === 'string' &&
            (action.payload.includes('network') || action.payload.includes('timeout'))) {
          state.networkError = true;
          state.error = "Network error. Please check your internet connection.";

          // Show network error toast
          toast.error("Network error. Please check your internet connection.", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } else {
          state.error = action.payload || "Failed to send message";

          // Show general error toast
          toast.error(`Error: ${action.payload || "Failed to send message"}`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
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
  updateMessage,
  setNetworkError
} = chatSlice.actions;

export default chatSlice.reducer;