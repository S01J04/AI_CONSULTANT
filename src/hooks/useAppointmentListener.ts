import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Appointment, updateAppointmentInStore } from '../redux/slices/appointmentSlice';
import { createNotification } from '../redux/slices/notificationSlice';
import { toast } from 'react-toastify';

/**
 * Hook to listen for real-time appointment updates
 */
export const useAppointmentListener = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!user?.uid) return;

    let appointmentsQuery;

    // Different queries based on user role
    if (user.role === 'superadmin') {
      // Superadmin listens to all appointments
      appointmentsQuery = collection(db, 'appointments');
    } else if (user.role === 'admin') {
      // Admin (consultant) listens to appointments where they are the expert
      appointmentsQuery = query(
        collection(db, 'appointments'),
        where('expertId', '==', user.uid)
      );
    } else {
      // Regular user listens to their own appointments
      appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid)
      );
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const appointmentData = change.doc.data();
        const appointment: Appointment = {
          id: change.doc.id,
          userId: appointmentData.userId,
          expertId: appointmentData.expertId,
          expertName: appointmentData.expertName || 'Unknown Expert',
          expertSpecialization: appointmentData.expertSpecialization || 'Not specified',
          displayName: appointmentData.displayName || 'Unknown User',
          date: appointmentData.date,
          time: appointmentData.time,
          status: appointmentData.status,
          meetingLink: appointmentData.meetingLink,
          notes: appointmentData.notes,
          createdAt: appointmentData.createdAt?.toMillis() || Date.now(),
          cancellationReason: appointmentData.cancellationReason,
          cancelledBy: appointmentData.cancelledBy,
          cancelledAt: appointmentData.cancelledAt instanceof Timestamp
            ? appointmentData.cancelledAt.toMillis()
            : appointmentData.cancelledAt,
        };

        if (change.type === 'added') {
          // New appointment added
          dispatch(updateAppointmentInStore(appointment));
        }
        else if (change.type === 'modified') {
          // Appointment updated
          dispatch(updateAppointmentInStore(appointment));

          // If appointment was cancelled by admin, show notification to user
          if (
            appointment.status === 'cancelled' &&
            appointment.cancelledBy === 'admin' &&
            appointment.userId === user.uid
          ) {
            // Get user's display name
            const userDisplayName = user.displayName || 'Client';

            // Show toast notification with reason if available
            toast.info(`${userDisplayName}, your appointment with ${appointment.expertName} has been cancelled by the admin${appointment.cancellationReason ? `: ${appointment.cancellationReason}` : '.'}`, {
              position: "top-right",
              autoClose: 7000, // Longer duration to read the reason
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });

            // Create notification in the database
            dispatch(createNotification({
              userId: user.uid,
              title: 'Appointment Cancelled',
              message: `${userDisplayName}, your appointment with ${appointment.expertName} on ${appointment.date} at ${appointment.time} has been cancelled.\n\nReason: ${appointment.cancellationReason || 'No reason provided'}`,
              type: 'appointment',
              relatedId: appointment.id,
              action: {
                type: 'link',
                label: 'View Details',
                url: '/dashboard/history'
              }
            }));
          }
        }
        else if (change.type === 'removed') {
          // Appointment removed - handle if needed
          // For now, we'll just update the store
          dispatch(updateAppointmentInStore({
            ...appointment,
            status: 'cancelled',
            cancellationReason: 'Appointment was removed from the system',
            cancelledBy: 'system',
            cancelledAt: Date.now()
          }));
        }
      });
    }, (error) => {
      console.error('Error listening to appointments:', error);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, [dispatch, user?.uid, user?.role]);
};
