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
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
  createdAt: number;
}

interface AppointmentState {
  experts: Expert[];
  userAppointments: Appointment[];
  selectedExpert: Expert | null;
  selectedDate: string | null;
  selectedTime: string | null;
  loading: boolean;
  error: string | null;
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
  experts: mockExperts,
  userAppointments: [],
  selectedExpert: null,
  selectedDate: null,
  selectedTime: null,
  loading: false,
  error: null,
};

export const fetchUserAppointments = createAsyncThunk(
  'appointment/fetchUserAppointments',
  async (userId: string, { rejectWithValue }) => {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('userId', '==', userId),
        // orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          userId: data.userId,
          expertId: data.expertId,
          date: data.date,
          time: data.time,
          status: data.status,
          meetingLink: data.meetingLink,
          notes: data.notes,
          createdAt: data.createdAt.toMillis(),
        });
      });
      
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
    time,
    notes 
  }: { 
    userId: string; 
    expertId: string; 
    date: string; 
    time: string;
    notes?: string;
  }, { rejectWithValue }) => {
    try {
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
        date,
        time,
        status: 'scheduled',
        meetingLink,
        notes: notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);
      
      // Update expert's availability
      const expertRef = doc(db, 'experts', expertId);
      await updateDoc(expertRef, {
        [`availability.${date}.${time}`]: false
      });
      
      return {
        id: docRef.id,
        ...appointmentData,
        createdAt: Date.now(),
      };
    } catch (error: any) {
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
      state.selectedExpert = state.experts.find(expert => expert.id === expertId) || null;
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