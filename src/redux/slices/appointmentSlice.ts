import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface Expert {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  rating: number;
  photoURL: string;
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

// Mock experts data
const mockExperts: Expert[] = [
  {
    id: 'exp1',
    name: 'Dr. Sarah Johnson',
    specialization: 'General Physician',
    experience: 12,
    rating: 4.8,
    photoURL: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
    availability: [
      {
        day: '2024-05-20',
        slots: ['10:00', '11:00', '14:00', '15:00']
      },
      {
        day: '2024-05-21',
        slots: ['09:00', '10:00', '11:00', '14:00']
      },
      {
        day: '2024-05-22',
        slots: ['10:00', '11:00', '14:00', '16:00']
      },
      {
        day: '2024-05-23',
        slots: ['09:00', '10:00', '14:00', '15:00']
      }
    ]
  },
  {
    id: 'exp2',
    name: 'Dr. Michael Chen',
    specialization: 'Cardiologist',
    experience: 15,
    rating: 4.9,
    photoURL: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
    availability: [
      {
        day: '2024-05-20',
        slots: ['09:00', '10:00', '15:00', '16:00']
      },
      {
        day: '2024-05-21',
        slots: ['11:00', '14:00', '15:00', '16:00']
      },
      {
        day: '2024-05-22',
        slots: ['09:00', '10:00', '11:00', '14:00']
      },
      {
        day: '2024-05-23',
        slots: ['10:00', '11:00', '15:00', '16:00']
      }
    ]
  },
  {
    id: 'exp3',
    name: 'Dr. Emily Rodriguez',
    specialization: 'Nutritionist',
    experience: 8,
    rating: 4.7,
    photoURL: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
    availability: [
      {
        day: '2024-05-20',
        slots: ['11:00', '14:00', '15:00', '17:00']
      },
      {
        day: '2024-05-21',
        slots: ['09:00', '10:00', '11:00', '16:00']
      },
      {
        day: '2024-05-22',
        slots: ['10:00', '14:00', '15:00', '16:00']
      },
      {
        day: '2024-05-23',
        slots: ['09:00', '11:00', '14:00', '15:00']
      }
    ]
  }
];

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
  async (userId: string, { rejectWithValue }) => {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('userId', '==', userId)
      );
      
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
          date: data.date,
          time: data.time,
          status: data.status,
          meetingLink: data.meetingLink,
          notes: data.notes,
          createdAt: data.createdAt?.toMillis() || Date.now(),
        });
      });
      
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
      const querySnapshot = await getDocs(expertsRef);
      
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
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, where("consultantId", "==", consultantId));
      const appointmentsSnapshot = await getDocs(q);
      
      const appointments: Appointment[] = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
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
  }, { rejectWithValue, getState }) => {
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

export const cancelAppointment = createAsyncThunk(
  'appointment/cancelAppointment',
  async (appointmentId: string, { rejectWithValue }) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      
      await updateDoc(appointmentRef, {
        status: 'cancelled',
      });
      
      return appointmentId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState,
  reducers: {
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
        const appointmentId = action.payload;
        const appointmentIndex = state.userAppointments.findIndex(
          (appointment) => appointment.id === appointmentId
        );
        
        if (appointmentIndex !== -1) {
          state.userAppointments[appointmentIndex].status = 'cancelled';
        }
      })
      .addCase(cancelAppointment.rejected, (state, action) => {
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
  setSelectedExpert, 
  setSelectedDate, 
  setSelectedTime, 
  clearSelections, 
  clearError 
} = appointmentSlice.actions;
export default appointmentSlice.reducer;