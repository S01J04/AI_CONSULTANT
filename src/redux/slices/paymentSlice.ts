import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
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
  planName?: string; // Added planName field
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId: string;
  orderId?: string; // Added orderId field
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
    // {
    //   id: 'basic',
    //   name: 'Basic Plan',
    //   description: 'Access to AI chat with limited features',
    //   price: 499,
    //   currency: 'INR',
    //   duration: 30,
    //   features: [
    //     'Unlimited text chat with AI',
    //     'Chat history for 30 days',
    //     'No voice calls',
    //     'No appointments',
    //   ],
    // },
    {
      id: 'premium',
      name: 'Premium Plan',
      description: 'Full access to AI consultation with premium features',
      price: 999,
      currency: 'INR',
      duration: 30,
      features: [
        'Unlimited text chat with AI',
        'Voice calls with AI',
        'Chat history for 90 days',
        '2 expert appointments per month',
        'Priority support',
      ],
    },
    {
      id: 'pay-per-call',
      name: 'Pay Per Call',
      description: 'Book a single appointment with an expert',
      price: 299,
      currency: 'INR',
      duration: 1,
      features: [
        '1 expert appointment (30 minutes)',
        'Access to specialist network',
        'No AI chat access',
        'No voice call access',
        'Valid for 7 days',
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
  async (userId: string | undefined, { rejectWithValue }) => {
    // If userId is undefined, return empty array instead of error
    if (!userId) {
      console.log("User ID not provided, skipping payment fetch");
      return [];
    }
    try {
      // First try to get payments from Firestore
      let payments: Payment[] = [];
      let firestoreSuccess = false;

      try {
        const paymentsRef = collection(db, 'payments');
        const q = query(paymentsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          try {
            // Handle different timestamp formats
            let createdAtTimestamp = Date.now();
            if (data.createdAt?.toMillis) {
              createdAtTimestamp = data.createdAt.toMillis();
            } else if (data.timestamp) {
              createdAtTimestamp = data.timestamp;
            }

            payments.push({
              id: doc.id,
              userId: data.userId || '',
              planId: data.planId || '',
              planName: data.planName || 'Unknown Plan',
              amount: Number(data.amount) || 0,
              currency: data.currency || 'USD',
              status: data.status || 'completed',
              paymentMethod: data.paymentMethod || 'card',
              transactionId: data.transactionId || '',
              createdAt: createdAtTimestamp,
            });
          } catch (parseError) {
            console.error('Error parsing payment document:', parseError, data);
          }
        });

        console.log(`Successfully fetched ${payments.length} payments from Firestore`);

        firestoreSuccess = true;
        console.log(`Found ${payments.length} payments in Firestore for user ${userId}`);
      } catch (firestoreError) {
        console.error('Error fetching payments from Firestore:', firestoreError);
        firestoreSuccess = false;
      }

      // If Firestore failed or returned no payments, try localStorage as fallback
      if (!firestoreSuccess || payments.length === 0) {
        try {
          const paymentsFromStorage = localStorage.getItem('payments');

          if (paymentsFromStorage) {
            const allPayments = JSON.parse(paymentsFromStorage);
            // Filter payments for this user
            const localPayments = allPayments.filter((payment: any) => payment.userId === userId);

            if (localPayments.length > 0) {
              console.log(`Found ${localPayments.length} payments in localStorage for user ${userId}`);
              payments = [...payments, ...localPayments];
            }
          }
        } catch (parseError) {
          console.error('Error parsing payments from localStorage:', parseError);
        }
      }

      return payments;
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      return rejectWithValue(error.message);
    }
  }
);


export const processPayment = createAsyncThunk(
  'payment/processPayment',
  async (
    {
      userId,
      planId,
      amount,
      currency,
      paymentMethod,
    }: {
      userId: string;
      planId: string;
      amount: number;
      currency: string;
      paymentMethod: string;
    },
    { rejectWithValue }
  ) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');
      if (!planId) return rejectWithValue('Plan ID is required');
      if (!amount || amount <= 0) return rejectWithValue('Invalid payment amount');

      const transactionId = 'txn_' + Math.random().toString(36).slice(2);
      const orderId = 'order_' + Math.random().toString(36).slice(2);

      const paymentRecord = {
        userId,
        planId,
        amount,
        currency,
        paymentMethod,
        status: 'completed',
        transactionId,
        orderId,
        createdAt: serverTimestamp(),
      };

      console.log('📌 Saving local payment record:', paymentRecord);

      const paymentRef = await addDoc(collection(db, 'payments'), paymentRecord);

      return {
        ...paymentRecord,
        id: paymentRef.id,
      };
    } catch (err: any) {
      console.error('❌ Error saving payment record:', err);
      return rejectWithValue(err.message || 'Unknown error');
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