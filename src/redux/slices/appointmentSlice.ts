import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { updateAppointmentCounts } from '../slices/authSlice';
import { toast } from 'react-toastify';

export interface Expert {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  rating: number;
  photoURL: string;
  bio?: string;
  specializations?: string[];
  availability: {
    day: string;
    slots: string[];
  }[];
}

export interface Appointment {
  id: string;
  userId: string;
  expertId: string;
  expertName?: string;
  expertSpecialization?: string;
  displayName?: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
  createdAt: number;
  cancellationReason?: string;
  cancelledBy?: 'user' | 'admin' | 'system';
  cancelledAt?: number;
}

interface AppointmentState {
  appointments: Appointment[];
  userAppointments: Appointment[];
  consultantAppointments: Appointment[];
  experts?: Expert[];
  selectedExpert?: Expert | null;
  selectedDate?: string | null;
  selectedTime?: string | null;
  loading: boolean;
  error: string | null;
  success?: boolean;
}



const initialState: AppointmentState = {
  appointments: [],
  userAppointments: [],
  consultantAppointments: [],
  experts: [],
  selectedExpert: null,
  selectedDate: null,
  selectedTime: null,
  loading: false,
  error: null,
  success: false
};

export const fetchUserAppointments = createAsyncThunk(
  'appointment/fetchUserAppointments',
  async (
    payload: { userId?: string; userRole?: 'user' | 'admin' | 'superadmin' } | string | undefined,
    { rejectWithValue }
  ) => {
    // Handle both old and new parameter formats for backward compatibility
    let userId: string | undefined;
    let userRole: 'user' | 'admin' | 'superadmin' | undefined;

    if (typeof payload === 'string' || payload === undefined) {
      // Old format: just userId
      userId = payload as string;
    } else {
      // New format: object with userId and userRole
      userId = payload.userId;
      userRole = payload.userRole;
    }

    // If userId is undefined and not superadmin, return empty array
    if (!userId && userRole !== 'superadmin') {
      console.log("User ID not provided and not superadmin, skipping appointments fetch");
      return [];
    }

    try {
      const appointmentsRef = collection(db, 'appointments');
      let q;

      // Different queries based on user role
      if (userRole === 'superadmin') {
        // Superadmin can see all appointments
        console.log("Fetching all appointments for superadmin");
        q = query(appointmentsRef);
      } else if (userRole === 'admin') {
        // Admin (consultant) can see appointments where they are the expert
        console.log("Fetching appointments for admin/consultant:", userId);
        q = query(appointmentsRef, where('expertId', '==', userId));
      } else {
        // Regular user can only see their own appointments
        console.log("Fetching appointments for regular user:", userId);
        q = query(appointmentsRef, where('userId', '==', userId));
      }

      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          userId: data.userId,
          expertId: data.expertId,
          expertName: data.expertName || 'Unknown Expert',
          expertSpecialization: data.expertSpecialization || 'Not specified',
          displayName: data.displayName || 'Unknown User',
          date: data.date,
          time: data.time,
          status: data.status,
          meetingLink: data.meetingLink,
          notes: data.notes,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          cancellationReason: data.cancellationReason,
          cancelledBy: data.cancelledBy,
          cancelledAt: data.cancelledAt?.toMillis(),
        });
      });

      console.log(`Fetched ${appointments.length} appointments`);
      return appointments;
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchExperts = createAsyncThunk(
  'appointment/fetchExperts',
  async (_, { rejectWithValue }) => {
    try {
      // Query consultantProfiles collection (not consultants)
      const expertsRef = collection(db, 'consultantProfiles');
      const querySnapshot = await getDocs(query(expertsRef, where("isActive", "==", true)));

      const experts: Expert[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Generate available time slots based on consultant's availability
        const availability = [];
        const today = new Date();

        // Create 7 days of availability
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
          const dateString = date.toISOString().split('T')[0];

          // Check if this day is in the consultant's available days
          const isAvailableDay = data.days?.includes(dayName) ||
            data.availability?.days?.includes(dayName);

          if (isAvailableDay) {
            // Generate time slots based on consultant's hours
            const slots: string[] = [];
            const fromHour = data.hours?.from || data.availability?.hours?.from || 9;
            const toHour = data.hours?.to || data.availability?.hours?.to || 17;
            const duration = data.duration || data.availability?.duration || 30;

            // Calculate number of slots based on duration
            const slotsCount = Math.floor((toHour - fromHour) * 60 / duration);

            for (let j = 0; j < slotsCount; j++) {
              const minutes = j * duration;
              const hour = Math.floor(fromHour + minutes / 60);
              const minute = minutes % 60;
              slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
            }

            if (slots.length > 0) {
              availability.push({
                day: dateString,
                slots: slots
              });
            }
          }
        }

        // Map consultant profile to Expert interface
        experts.push({
          id: doc.id,
          name: data.fullName || data.name || 'Unnamed Consultant',
          specialization: data.title || data.specializations?.[0] || 'General Consultant',
          experience: data.yearsOfExperience || 0,
          bio:data.bio,
          specializations:data.specializations,
          rating: data.rating || 4.5, // Default rating if not provided
          photoURL: data.photoURL || data.profilePicture || '',
          availability: availability.length > 0 ? availability : [
            {
              day: new Date().toISOString().split('T')[0],
              slots: ['09:00', '10:00', '11:00', '14:00']
            },
            {
              day: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              slots: ['09:00', '10:00', '11:00', '14:00']
            }
          ]
        });
      });

      return experts;
    } catch (error: any) {
      console.error('Error fetching experts:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Fetch appointments for a consultant
export const fetchConsultantAppointments = createAsyncThunk(
  'appointment/fetchConsultantAppointments',
  async (consultantId: string, { rejectWithValue }) => {
    try {
      // Query appointments where consultantId matches
      console.log(consultantId)
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, where("expertId", "==", consultantId));
      const appointmentsSnapshot = await getDocs(q);

      const appointments: Appointment[] = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        userName: doc.data().displayName,
        userId: doc.data().userId || '',
        expertId: doc.data().expertId || '',
        date: doc.data().date || '',
        time: doc.data().time || '',
        status: doc.data().status as 'scheduled' | 'completed' | 'cancelled',
        meetingLink: doc.data().meetingLink,
        notes: doc.data().notes,
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        expertName: doc.data().expertName,
        expertSpecialization: doc.data().expertSpecialization
      }));
      console.log(appointments)
      return appointments;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const scheduleAppointment = createAsyncThunk(
  'appointment/scheduleAppointment',
  async ({
    userId,
    expertId,
    date,
    expertName,
    displayName,
    expertSpecialization,
    time,
    notes
  }: {
    userId: string;
    expertId: string;
    date: string;
    displayName: string;
    expertName: string;
    expertSpecialization: string;
    time: string;
    notes?: string;
  }, { rejectWithValue, getState, dispatch }) => {
    try {
      // Validate required fields
      if (!userId || !expertId || !date || !time) {
        throw new Error('Missing required fields for appointment');
      }

      // Get expert details from the state
      const state = getState() as { appointment: AppointmentState };
      const expert = state.appointment.experts?.find(e => e.id === expertId);

      if (!expert) {
        throw new Error('Expert not found');
      }

      // Use provided expert details or fallback to state data
      const finalExpertName = expertName || expert.name;
      const finalExpertSpecialization = expertSpecialization || expert.specialization;

      // Check if the time slot is still available
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('expertId', '==', expertId),
        where('date', '==', date),
        where('time', '==', time),
        where('status', '==', 'scheduled')
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error('This time slot is no longer available. Please select another time.');
      }

      // Generate a meeting link
      const meetingLink = `https://meet.google.com/abc-${Math.random().toString(36).substring(2, 7)}`;

      // Create an appointment record
      const appointmentData = {
        userId,
        expertId,
        expertName: finalExpertName,
        expertSpecialization: finalExpertSpecialization,
        displayName,
        date,
        time,
        status: 'scheduled',
        meetingLink,
        notes: notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);

      // Decrement the user's available appointments when creating a new appointment
      try {
        // Import the incrementAppointmentsUsed action (which actually decrements appointmentsTotal)
        const { incrementAppointmentsUsed } = require('../slices/authSlice');
        await dispatch(incrementAppointmentsUsed(userId));
        console.log(`Decremented available appointments for user ${userId} when scheduling appointment`);
      } catch (error) {
        console.error('Failed to update available appointments when scheduling:', error);
        // Continue with the appointment creation even if updating fails
      }

      return {
        id: docRef.id,
        ...appointmentData,
        createdAt: Date.now(),
      };
    } catch (error: any) {
      console.error('Error in scheduleAppointment:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const completeAppointment = createAsyncThunk(
  'appointment/completeAppointment',
  async ({ appointmentId, completedBy }: { appointmentId: string, completedBy?: 'user' | 'admin' | 'system' }, { rejectWithValue, dispatch }) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);

      // Get the appointment data first to access user information
      const appointmentDoc = await getDoc(appointmentRef);
      if (!appointmentDoc.exists()) {
        throw new Error('Appointment not found');
      }

      const appointmentData = appointmentDoc.data();
      const completionData = {
        status: 'completed',
        completedBy: completedBy || 'admin',
        completedAt: serverTimestamp()
      };

      await updateDoc(appointmentRef, completionData);

      // Update the user's appointments used count when an appointment is completed
      // This will increment appointmentsUsed to track completed appointments
      try {
        // Use the imported updateAppointmentCounts action
        const result = await dispatch(updateAppointmentCounts(appointmentData.userId));

        if (updateAppointmentCounts.fulfilled.match(result)) {
          console.log(`Successfully updated appointments used count for user ${appointmentData.userId}`);

          // Force refresh the page after a short delay to ensure UI is updated
          setTimeout(() => {
            // This is a hack to force the UI to refresh with the updated appointment counts
            // In a production app, you would use a more elegant solution
            window.location.reload();
          }, 1500); // Give time for the toast to be visible
        } else {
          console.error('Failed to update appointments used count:', result.error);
        }
      } catch (error) {
        console.error('Failed to update appointments used count when completing:', error);
        // Continue with the appointment completion even if updating counts fails
      }

      // Create a notification for the user
      if (appointmentData.userId) {
        try {
          console.log('Creating completion notification for user:', appointmentData.userId);

          // Get the user's display name from the appointment data
          const userDisplayName = appointmentData.displayName || 'Client';

          const notificationData = {
            userId: appointmentData.userId,
            title: 'Appointment Completed',
            message: `${userDisplayName}, your appointment with ${appointmentData.expertName} on ${appointmentData.date} at ${appointmentData.time} has been marked as completed.`,
            type: 'appointment',
            relatedId: appointmentId,
            read: false,
            createdAt: serverTimestamp(),
            action: {
              type: 'link',
              label: 'View Appointment History',
              url: '/dashboard/history'
            }
          };

          // Add the notification to Firestore
          await addDoc(collection(db, 'notifications'), notificationData);

          // Also show a toast notification
          toast.info(`Notification sent to user about completed appointment`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } catch (error) {
          console.error('Failed to create notification:', error);
          // Continue with the completion even if notification fails
        }
      }

      return { appointmentId, completedBy };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const cancelAppointment = createAsyncThunk(
  'appointment/cancelAppointment',
  async ({ appointmentId, reason, cancelledBy }: { appointmentId: string, reason?: string, cancelledBy?: 'user' | 'admin' | 'system' }, { rejectWithValue, dispatch }) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);

      // Get the appointment data first to access user information
      const appointmentDoc = await getDoc(appointmentRef);
      if (!appointmentDoc.exists()) {
        throw new Error('Appointment not found');
      }

      const appointmentData = appointmentDoc.data();
      const cancellationData = {
        status: 'cancelled',
        cancellationReason: reason || 'No reason provided',
        cancelledBy: cancelledBy || 'user',
        cancelledAt: serverTimestamp()
      };

      await updateDoc(appointmentRef, cancellationData);

      // If cancelled by admin, create a notification for the user
      if (cancelledBy === 'admin' && appointmentData.userId) {
        try {
          console.log('Admin cancellation detected, creating notification');
          console.log('User ID:', appointmentData.userId);
          console.log('Appointment data:', appointmentData);

          // Import directly from Firebase to avoid circular dependency
          // We'll create the notification document directly instead of using the action
          const notificationsRef = collection(db, 'notifications');
          // No need to check for createNotification since we're using Firebase directly

          console.log('Creating cancellation notification for user:', appointmentData.userId);
          console.log('Cancellation reason:', reason);

          // Get the user's display name from the appointment data
          const userDisplayName = appointmentData.displayName || 'Client';

          const notificationData = {
            userId: appointmentData.userId,
            title: 'Appointment Cancelled',
            message: `${userDisplayName}, your appointment with ${appointmentData.expertName} on ${appointmentData.date} at ${appointmentData.time} has been cancelled.\n\nReason: ${reason || 'No reason provided'}`,
            type: 'appointment',
            relatedId: appointmentId,
            read: false,
            createdAt: serverTimestamp(),
            action: {
              type: 'link',
              label: 'View Appointment History',
              url: '/dashboard/history'
            }
          };

          console.log('Notification data:', notificationData);

          // Create the notification directly in Firebase
          try {
            const notificationDoc = await addDoc(notificationsRef, {
              ...notificationData,
              createdAt: serverTimestamp()
            });
            console.log('Notification created with ID:', notificationDoc.id);

            // We don't need to manually update the store
            // The notification listener will pick up the new notification
            console.log('Notification created successfully, listener will update the store');
          } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
          }

          // Also show a toast notification
          const { toast } = require('react-toastify');
          toast.info(`Notification sent to user about cancelled appointment`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } catch (error) {
          console.error('Failed to create notification:', error);
          // Continue with the cancellation even if notification fails
        }
      }

      return { appointmentId, cancelledBy };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState,
  reducers: {
    updateAppointmentInStore: (state, action: PayloadAction<Appointment>) => {
      const appointment = action.payload;

      // Update in userAppointments
      const userAppointmentIndex = state.userAppointments.findIndex(
        (a) => a.id === appointment.id
      );
      if (userAppointmentIndex !== -1) {
        state.userAppointments[userAppointmentIndex] = appointment;
      } else {
        state.userAppointments.push(appointment);
      }

      // Update in consultantAppointments
      const consultantAppointmentIndex = state.consultantAppointments.findIndex(
        (a) => a.id === appointment.id
      );
      if (consultantAppointmentIndex !== -1) {
        state.consultantAppointments[consultantAppointmentIndex] = appointment;
      } else {
        // Add to consultant appointments if this is for the current user as an expert
        state.consultantAppointments.push(appointment);
      }

      // Update in all appointments
      const allAppointmentIndex = state.appointments.findIndex(
        (a) => a.id === appointment.id
      );
      if (allAppointmentIndex !== -1) {
        state.appointments[allAppointmentIndex] = appointment;
      } else {
        state.appointments.push(appointment);
      }
    },
    setSelectedExpert: (state, action: PayloadAction<string>) => {
      const expertId = action.payload;
      state.selectedExpert = state.experts?.find(expert => expert.id === expertId) || null;
    },
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
    setSelectedTime: (state, action: PayloadAction<string>) => {
      state.selectedTime = action.payload;
    },
    clearSelections: (state) => {
      state.selectedExpert = null;
      state.selectedDate = null;
      state.selectedTime = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.userAppointments = action.payload;
      })
      .addCase(fetchUserAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchConsultantAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConsultantAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.consultantAppointments = action.payload;
      })
      .addCase(fetchConsultantAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(scheduleAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scheduleAppointment.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.userAppointments.unshift(action.payload as Appointment);
        state.selectedExpert = null;
        state.selectedDate = null;
        state.selectedTime = null;
      })
      .addCase(scheduleAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(cancelAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const { appointmentId, cancelledBy } = action.payload;

        // Update in userAppointments
        const userAppointmentIndex = state.userAppointments.findIndex(
          (appointment) => appointment.id === appointmentId
        );
        if (userAppointmentIndex !== -1) {
          state.userAppointments[userAppointmentIndex].status = 'cancelled';
        }

        // Also update in consultantAppointments if present
        const consultantAppointmentIndex = state.consultantAppointments.findIndex(
          (appointment) => appointment.id === appointmentId
        );
        if (consultantAppointmentIndex !== -1) {
          state.consultantAppointments[consultantAppointmentIndex].status = 'cancelled';
        }

        // Also update in all appointments if present
        const allAppointmentIndex = state.appointments.findIndex(
          (appointment) => appointment.id === appointmentId
        );
        if (allAppointmentIndex !== -1) {
          state.appointments[allAppointmentIndex].status = 'cancelled';
        }
      })
      .addCase(cancelAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(completeAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const { appointmentId, completedBy } = action.payload;

        // Update in userAppointments
        const userAppointmentIndex = state.userAppointments.findIndex(
          (appointment) => appointment.id === appointmentId
        );
        if (userAppointmentIndex !== -1) {
          state.userAppointments[userAppointmentIndex].status = 'completed';
        }

        // Update in consultantAppointments
        const consultantAppointmentIndex = state.consultantAppointments.findIndex(
          (appointment) => appointment.id === appointmentId
        );
        if (consultantAppointmentIndex !== -1) {
          state.consultantAppointments[consultantAppointmentIndex].status = 'completed';
        }

        // Also update in all appointments if present
        const allAppointmentIndex = state.appointments.findIndex(
          (appointment) => appointment.id === appointmentId
        );
        if (allAppointmentIndex !== -1) {
          state.appointments[allAppointmentIndex].status = 'completed';
        }
      })
      .addCase(completeAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchExperts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExperts.fulfilled, (state, action) => {
        state.loading = false;
        state.experts = action.payload;
      })
      .addCase(fetchExperts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  updateAppointmentInStore,
  setSelectedExpert,
  setSelectedDate,
  setSelectedTime,
  clearSelections,
  clearError
} = appointmentSlice.actions;
export default appointmentSlice.reducer;