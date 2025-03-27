import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number; // in days
  features: string[];
}

export interface Payment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId: string;
  createdAt: number;
}

interface PaymentState {
  plans: PaymentPlan[];
  userPayments: Payment[];
  currentPlan: PaymentPlan | null;
  loading: boolean;
  error: string | null;
}

const initialState: PaymentState = {
  plans: [
    {
      id: 'basic',
      name: 'Basic Plan',
      description: 'Access to AI consultation with limited features',
      price: 499,
      currency: 'INR',
      duration: 30,
      features: [
        'Unlimited text consultations',
        'Basic voice responses',
        'Chat history for 30 days',
      ],
    },
    {
      id: 'premium',
      name: 'Premium Plan',
      description: 'Full access to AI consultation with premium features',
      price: 999,
      currency: 'INR',
      duration: 30,
      features: [
        'Unlimited text consultations',
        'Advanced voice responses',
        'Chat history for 90 days',
        '2 expert calls per month',
        'Priority support',
      ],
    },
    {
      id: 'pay-per-call',
      name: 'Pay Per Call',
      description: 'Pay only for expert calls when you need them',
      price: 299,
      currency: 'INR',
      duration: 1,
      features: [
        '1 expert call (30 minutes)',
        'Access to specialist network',
        'Call recording and summary',
      ],
    },
  ],
  userPayments: [],
  currentPlan: null,
  loading: false,
  error: null,
};

export const fetchUserPayments = createAsyncThunk(
  'payment/fetchUserPayments',
  async (userId: string, { rejectWithValue }) => {
    try {
      const paymentsRef = collection(db, 'payments');
      const q = query(
        paymentsRef,
        where('userId', '==', userId),
        // orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const payments: Payment[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          userId: data.userId,
          planId: data.planId,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          createdAt: data.createdAt.toMillis(),
        });
      });
      
      return payments;
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const processPayment = createAsyncThunk(
  'payment/processPayment',
  async ({ 
    userId, 
    planId, 
    amount, 
    currency, 
    paymentMethod 
  }: { 
    userId: string; 
    planId: string; 
    amount: number; 
    currency: string; 
    paymentMethod: string 
  }, { rejectWithValue }) => {
    try {
      // In a real app, this would integrate with Razorpay or another payment gateway
      // For now, we'll simulate a successful payment
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a fake transaction ID
      const transactionId = 'txn_' + Math.random().toString(36).substring(2, 15);
      
      // Create a payment record
      const paymentData = {
        userId,
        planId,
        amount,
        currency,
        status: 'completed',
        paymentMethod,
        transactionId,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      
      return {
        id: docRef.id,
        ...paymentData,
        createdAt: Date.now(),
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setCurrentPlan: (state, action: PayloadAction<string>) => {
      const planId = action.payload;
      state.currentPlan = state.plans.find(plan => plan.id === planId) || null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.userPayments = action.payload;
        
        // Determine current plan based on most recent completed payment
        const latestPayment = action.payload.find(p => p.status === 'completed');
        
        if (latestPayment) {
          state.currentPlan = state.plans.find(plan => plan.id === latestPayment.planId) || null;
        }
      })
      .addCase(fetchUserPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.userPayments.unshift(action.payload as Payment);
        
        // Update current plan if payment was successful
        if (action.payload.status === 'completed') {
          state.currentPlan = state.plans.find(plan => plan.id === action.payload.planId) || null;
        }
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentPlan, clearError } = paymentSlice.actions;
export default paymentSlice.reducer;