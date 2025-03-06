import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Uses localStorage
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import paymentReducer from './slices/paymentSlice';
import appointmentReducer from './slices/appointmentSlice';
import uiReducer from './slices/uiSlice';
import adminReducer from './slices/adminSlice';

// 🔥 Configuring Redux Persist
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth','chat','appointment','payment'], // Only persist 'auth' and 'chat', remove others if needed
};

// 🔥 Wrapping the reducers with persistReducer
const persistedAuthReducer = persistReducer(persistConfig, authReducer);
const persistedChatReducer = persistReducer(persistConfig, chatReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer, // Persisted auth reducer
    chat: persistedChatReducer, // Persist chat if needed
    payment: paymentReducer, // Not persisted
    appointment: appointmentReducer, // Not persisted
    ui: uiReducer, // Not persisted
    admin: adminReducer, // Not persisted
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
