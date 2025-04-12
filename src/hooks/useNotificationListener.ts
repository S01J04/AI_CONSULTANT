import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Notification, updateNotificationInStore, markNotificationAsRead } from '../redux/slices/notificationSlice';
import { toast } from 'react-toastify';

/**
 * Hook to listen for real-time notification updates
 */
export const useNotificationListener = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!user?.uid) return;

    // Create a query for the user's notifications
    let notificationsQuery;

    try {
      // Try with ordering first
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } catch (error) {
      // Fallback if index doesn't exist
      console.warn('Using fallback query without ordering due to missing index:', error);
      notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        limit(50)
      );
    }

    console.log('Setting up notification listener for user:', user.uid);

    // Set up real-time listener with better error handling
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        console.log('Notification snapshot received, changes:', snapshot.docChanges().length);

        // Process all changes in the snapshot
        snapshot.docChanges().forEach((change) => {
          console.log('Notification change type:', change.type, 'Document ID:', change.doc.id);
          const data = change.doc.data();

          // Create a properly formatted notification object
          const notification: Notification = {
            id: change.doc.id,
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type,
            read: data.read || false,
            relatedId: data.relatedId,
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toMillis()
              : (data.createdAt || Date.now()),
            action: data.action
          };

          // Handle different change types
          if (change.type === 'added') {
            // New notification added
            console.log('Adding new notification to store:', notification);
            dispatch(updateNotificationInStore(notification));

            // Show toast for new unread notifications
            if (!notification.read) {
              console.log('Showing toast for new notification:', notification.title);
              // Create a simple toast notification without JSX
              // Create a toast with title and short message preview
              const messagePreview = notification.message.length > 50 ?
                `${notification.message.substring(0, 50)}...` : notification.message;
              toast.info(`${notification.title}: ${messagePreview}`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                onClick: () => {
                  // Mark as read when clicked
                  dispatch(markNotificationAsRead(notification.id));

                  // Navigate to the action URL if it exists
                  if (notification.action?.url) {
                    window.location.href = notification.action.url;
                  }
                }
              });
            }
          }
          else if (change.type === 'modified') {
            // Updated notification
            dispatch(updateNotificationInStore(notification));
          }
        });
      },
      (error) => {
        console.error('Error listening to notifications:', error);
      }
    );

    // Clean up listener on unmount
    return () => unsubscribe();
  }, [dispatch, user?.uid]);
};
