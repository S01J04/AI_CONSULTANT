import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  Timestamp,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';

// Helper function to handle different timestamp formats
const getTimestampValue = (data: any): number => {
  if (data.createdAt?.toMillis) {
    // Firestore Timestamp object with toMillis method
    return data.createdAt.toMillis();
  } else if (data.createdAt?.seconds) {
    // Firestore Timestamp object with seconds field
    return new Date(data.createdAt.seconds * 1000).getTime();
  } else if (data.timestamp) {
    // Legacy timestamp field
    return data.timestamp;
  } else {
    // Fallback to current time
    return Date.now();
  }
};

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'payment' | 'system' | 'admin';
  read: boolean;
  relatedId?: string; // ID of related entity (appointment, payment, etc.)
  createdAt: number;
  action?: {
    type: 'link' | 'button';
    label: string;
    url?: string;
    handler?: string;
  };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null
};

// Fetch user notifications
export const fetchUserNotifications = createAsyncThunk(
  'notification/fetchUserNotifications',
  async (userId: string | undefined, { rejectWithValue }) => {
    if (!userId) {
      console.log("User ID not provided, skipping notifications fetch");
      return [];
    }

    try {
      const notificationsRef = collection(db, 'notifications');

      // Try to fetch with ordering first, but fall back to simpler query if index doesn't exist
      let q;
      try {
        q = query(
          notificationsRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(50) // Limit to most recent 50 notifications
        );
      } catch (error) {
        console.warn('Using fallback query without ordering due to missing index:', error);
        // Fallback query without ordering if index doesn't exist
        q = query(
          notificationsRef,
          where('userId', '==', userId),
          limit(50)
        );
      }

      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (error: any) {
        // If we get an index error, show a more helpful message
        if (error.message && error.message.includes('index')) {
          console.warn('Firebase index error. Please create the required index using the link in the error message.');
          console.warn('For now, falling back to a simpler query without ordering.');

          // Fallback to simpler query without ordering
          const fallbackQuery = query(
            notificationsRef,
            where('userId', '==', userId)
          );
          querySnapshot = await getDocs(fallbackQuery);
        } else {
          throw error; // Re-throw if it's not an index error
        }
      }

      const notifications: Notification[] = [];

      // Sort manually if we had to use the fallback query
      let needsManualSorting = !q.toString().includes('orderBy');

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          read: data.read || false,
          relatedId: data.relatedId,
          createdAt: getTimestampValue(data),
          action: data.action
        });
      });

      // If we couldn't use orderBy in the query, sort manually
      if (needsManualSorting) {
        return notifications.sort((a, b) => b.createdAt - a.createdAt);
      }

      return notifications;
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Create a new notification
export const createNotification = createAsyncThunk(
  'notification/createNotification',
  async ({
    userId,
    title,
    message,
    type,
    relatedId,
    action
  }: {
    userId: string;
    title: string;
    message: string;
    type: 'appointment' | 'payment' | 'system' | 'admin';
    relatedId?: string;
    action?: {
      type: 'link' | 'button';
      label: string;
      url?: string;
      handler?: string;
    };
  }, { rejectWithValue }) => {
    try {
      // Validate required fields
      if (!userId || !title || !message || !type) {
        throw new Error('Missing required fields for notification');
      }

      // Create notification record
      const notificationData = {
        userId,
        title,
        message,
        type,
        read: false,
        relatedId,
        createdAt: serverTimestamp(),
        action
      };

      console.log('About to add notification to Firebase:', notificationData);

      try {
        const docRef = await addDoc(collection(db, 'notifications'), notificationData);
        console.log('Successfully added notification to Firebase with ID:', docRef.id);

        const result = {
          id: docRef.id,
          ...notificationData,
          createdAt: Date.now()
        };

        console.log('Returning notification data:', result);
        return result;
      } catch (dbError) {
        console.error('Firebase error adding notification:', dbError);
        throw dbError;
      }
    } catch (error: any) {
      console.error('Error creating notification:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
  'notification/markNotificationAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
      return notificationId;
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Mark all notifications as read
export const markAllNotificationsAsRead = createAsyncThunk(
  'notification/markAllNotificationsAsRead',
  async (userId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { notification: NotificationState };
      const unreadNotifications = state.notification.notifications.filter(n => !n.read);

      // Update each notification in Firestore
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        return updateDoc(notificationRef, { read: true });
      });

      await Promise.all(updatePromises);
      return unreadNotifications.map(n => n.id);
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Delete a notification
export const deleteNotification = createAsyncThunk(
  'notification/deleteNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      return notificationId;
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Clear all notifications for a user
export const clearAllNotifications = createAsyncThunk(
  'notification/clearAllNotifications',
  async (userId: string, { rejectWithValue, dispatch }) => {
    try {
      console.log('Clearing all notifications for user:', userId);

      // Get all notifications for the user
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      console.log(`Found ${querySnapshot.size} notifications to delete`);

      // Delete each notification
      const deletePromises = querySnapshot.docs.map(doc => {
        console.log('Deleting notification:', doc.id);
        return deleteDoc(doc.ref);
      });

      await Promise.all(deletePromises);

      // Clear notifications in the store
      dispatch(clearNotifications());

      return { success: true, count: querySnapshot.size };
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
      return rejectWithValue(error.message);
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    updateNotificationInStore: (state, action: PayloadAction<Notification>) => {
      const notification = action.payload;

      // Check if notification already exists
      const index = state.notifications.findIndex(n => n.id === notification.id);

      if (index !== -1) {
        // Update existing notification
        state.notifications[index] = notification;
      } else {
        // Add new notification
        state.notifications.unshift(notification);
        if (!notification.read) {
          state.unreadCount += 1;
        }
      }

      // Sort notifications by createdAt (newest first)
      state.notifications.sort((a, b) => b.createdAt - a.createdAt);
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    addLocalNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'createdAt'>>) => {
      const newNotification: Notification = {
        ...action.payload,
        id: `local-${Date.now()}`,
        createdAt: Date.now()
      };
      state.notifications.unshift(newNotification);
      if (!newNotification.read) {
        state.unreadCount += 1;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchUserNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((notification: Notification) => !notification.read).length;
      })
      .addCase(fetchUserNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create notification
      .addCase(createNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload as Notification);
        state.unreadCount += 1;
      })

      // Mark as read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      // Mark all as read
      .addCase(markAllNotificationsAsRead.fulfilled, (state, action) => {
        const notificationIds = action.payload as string[];
        state.notifications.forEach(notification => {
          if (notificationIds.includes(notification.id)) {
            notification.read = true;
          }
        });
        state.unreadCount = 0;
      })

      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n.id === action.payload);
        if (index !== -1) {
          const wasUnread = !state.notifications[index].read;
          state.notifications.splice(index, 1);
          if (wasUnread) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })

      // Clear all notifications
      .addCase(clearAllNotifications.fulfilled, (state) => {
        // The clearNotifications action is already dispatched in the thunk,
        // but we'll set the state here as well for completeness
        state.notifications = [];
        state.unreadCount = 0;
        console.log('All notifications cleared from store');
      })
      .addCase(clearAllNotifications.rejected, (state, action) => {
        console.error('Failed to clear notifications:', action.payload);
        state.error = action.payload as string;
      });
  }
});

export const { updateNotificationInStore, clearNotifications, addLocalNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
