import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Uses localStorage
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import paymentReducer from './slices/paymentSlice';
import appointmentReducer from './slices/appointmentSlice';
import uiReducer from './slices/uiSlice';
import adminReducer from './slices/adminSlice';
import notificationReducer from './slices/notificationSlice';

// 🔥 Configuring Redux Persist with enhanced security
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['ui'], // Only persist UI preferences, not sensitive data
};

// Separate configs for different slices with specific fields to persist
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['isAuthenticated'], // Only persist authentication state, not user data
};

const chatPersistConfig = {
  key: 'chat',
  storage,
  whitelist: ['sessionId'], // Only persist session ID, not message content
};

// 🔥 Wrapping the reducers with persistReducer
const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedChatReducer = persistReducer(chatPersistConfig, chatReducer);
const persistedUiReducer = persistReducer(persistConfig, uiReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer, // Persisted auth reducer (only authentication state)
    chat: persistedChatReducer, // Persisted chat reducer (only session ID)
    payment: paymentReducer, // Not persisted for security
    appointment: appointmentReducer, // Not persisted for security
    ui: persistedUiReducer, // Persisted UI preferences
    admin: adminReducer, // Not persisted for security
    notification: notificationReducer, // Not persisted - we want fresh notifications on reload
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// 🔥 Create a persistor instance
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
