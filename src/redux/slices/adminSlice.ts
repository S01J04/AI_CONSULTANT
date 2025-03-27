import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Timestamp } from 'firebase/firestore';

// Add interfaces for Firestore data
interface FirestoreUser {
  id: string;
  displayName?: string;
  email?: string;
  plan?: string;
}

interface FirestoreAppointment {
  id: string;
  userId: string;
  expertId: string;
  displayName: string;
  notes: string;
  expertName: string;
  expertSpecialization: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface FirestorePayment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
}

export interface AdminStats {
  totalUsers: number;
  totalAppointments: number;
  totalRevenue: number;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    plan: string;
  }>;
  recentAppointments: Array<{
    id: string;
    displayName: string;
    notes: string;
    expertName: string;
    expertSpecialization: string;
    date: string;
    time: string;
    status: 'scheduled' | 'completed' | 'cancelled';
  }>;
  recentPayments: Array<{
    id: string;
    user: string;
    plan: string;
    amount: number;
    date: string;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
  }>;
  appointmentStatus: {
    scheduled: number;
    completed: number;
    cancelled: number;
  };
  planDistribution: Array<{
    name: string;
    value: number;
  }>;
}

interface AdminState {
  stats: AdminStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  stats: null,
  loading: false,
  error: null,
};

export const fetchAdminStats = createAsyncThunk(
  'admin/fetchAdminStats',
  async (_, { rejectWithValue }) => {
    try {
      // Fetch users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users: FirestoreUser[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch appointments
      const appointmentsRef = collection(db, 'appointments');
      const appointmentsSnapshot = await getDocs(appointmentsRef);
      const appointments = appointmentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as FirestoreAppointment;
      });

      // Fetch payments
      const paymentsRef = collection(db, 'payments');
      const paymentsSnapshot = await getDocs(paymentsRef);
      const payments = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as FirestorePayment;
      });

      // Calculate appointment status distribution
      const appointmentStatus = {
        scheduled: appointments.filter(apt => apt.status === 'scheduled').length,
        completed: appointments.filter(apt => apt.status === 'completed').length,
        cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
      };

      // Calculate plan distribution
      const planDistribution = [
        { name: 'Free', value: users.filter(u => u.plan === 'free').length },
        { name: 'Basic', value: users.filter(u => u.plan === 'basic').length },
        { name: 'Premium', value: users.filter(u => u.plan === 'premium').length },
        { name: 'Pay-per-call', value: users.filter(u => u.plan === 'pay-per-call').length },
      ];

      // Get recent users (last 5)
      const recentUsers = users
        .slice(0, 5)
        .map(user => ({
          id: user.id,
          name: user.displayName || 'Unknown',
          email: user.email || 'No email',
          plan: user.plan || 'Free',
        }));

      // Get recent appointments (last 5)
      const recentAppointments = appointments
        .slice(-5)
        .map(apt => ({
          id: apt.id,
          userName: apt.displayName || 'Unknown User',
          notes: apt.notes || 'No notes',
          expertName: apt.expertName || 'Unknown Expert',
          expertSpecialization: apt.expertSpecialization || 'Not specified',
          date: apt.date || 'Not available',
          time: apt.time || 'Not available',
          status: apt.status || 'scheduled'
        }));

      // Get recent payments (last 5)
      const recentPayments = payments
        .slice(0, 5)
        .map(payment => ({
          id: payment.id,
          user: users.find(u => u.id === payment.userId)?.displayName || 'Unknown',
          plan: payment.planId,
          amount: payment.amount,
          date: new Date().toISOString().split('T')[0], // Use current date as fallback
          status: payment.status,
        }));

      // Calculate total stats
      const totalUsers = users.length;
      const totalAppointments = appointments.length;
      const totalRevenue = payments
        .filter(payment => payment.status === 'completed')
        .reduce((sum, payment) => sum + payment.amount, 0);

      return {
        totalUsers,
        totalAppointments,
        totalRevenue,
        recentUsers,
        recentAppointments,
        recentPayments,
        appointmentStatus,
        planDistribution,
      };
    } catch (error: any) {
      console.error('Error in fetchAdminStats:', error);
      return rejectWithValue(error.message);
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default adminSlice.reducer; 