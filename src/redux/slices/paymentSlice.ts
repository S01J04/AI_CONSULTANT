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
    {
      id: 'basic',
      name: 'Basic Plan',
      description: 'Access to AI chat with limited features',
      price: 499,
      currency: 'INR',
      duration: 30,
      features: [
        'Unlimited text chat with AI',
        'Chat history for 30 days',
        'No voice calls',
        'No appointments',
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
      // Validate inputs
      if (!userId) return rejectWithValue('User ID is required');
      if (!planId) return rejectWithValue('Plan ID is required');
      if (!amount || amount <= 0) return rejectWithValue('Invalid payment amount');

      // Get the plan details
      const plan = initialState.plans.find(p => p.id === planId);
      if (!plan) return rejectWithValue('Invalid plan selected');

      // Simulate a payment processing UI
      // In a real app, this would open Razorpay or another payment gateway
      console.log('Processing payment for plan:', plan.name);
      console.log('Amount:', amount, currency);
      console.log('Payment method:', paymentMethod);

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate a fake transaction ID and order ID
      const transactionId = 'txn_' + Math.random().toString(36).substring(2, 15);
      const orderId = 'order_' + Math.random().toString(36).substring(2, 15);
      const paymentId = 'pay_' + Math.random().toString(36).substring(2, 15);

      // Create a payment record in Firestore
      let paymentData;
      let paymentDocId;

      try {
        // First, prepare the payment data
        // Make sure all fields are properly formatted and valid
        const firestorePaymentData = {
          userId: userId.toString(), // Ensure userId is a string
          planId: planId.toString(), // Ensure planId is a string
          planName: plan.name || 'Unknown Plan',
          amount: Number(amount) || 0, // Ensure amount is a number
          currency: currency || 'USD',
          status: 'completed',
          paymentMethod: paymentMethod || 'card',
          transactionId: transactionId,
          orderId: orderId,
          createdAt: serverTimestamp(),
          timestamp: Date.now(), // Add a regular timestamp as backup
        };

        console.log('Attempting to save payment to Firestore:', firestorePaymentData);

        // Add to Firestore
        const paymentRef = collection(db, 'payments');
        const paymentDoc = await addDoc(paymentRef, firestorePaymentData);
        paymentDocId = paymentDoc.id;

        console.log('Payment successfully saved to Firestore with ID:', paymentDocId);

        // Create the return data with the Firestore document ID
        // Make sure it matches the format expected by the application
        paymentData = {
          id: paymentDocId,
          userId: userId.toString(),
          planId: planId.toString(),
          planName: plan.name || 'Unknown Plan',
          amount: Number(amount) || 0,
          currency: currency || 'USD',
          status: 'completed',
          paymentMethod: paymentMethod || 'card',
          transactionId: transactionId,
          orderId: orderId,
          createdAt: Date.now(),
        };

        console.log('Payment data created successfully:', paymentData);

        console.log('Payment successfully stored in Firestore with ID:', paymentDocId);
      } catch (firestoreError: any) {
        console.error('Error storing payment in Firestore:', firestoreError);

        // Log detailed error information for debugging
        console.error('Firestore error details:', {
          code: firestoreError.code,
          message: firestoreError.message,
          stack: firestoreError.stack,
        });

        // If Firestore fails, create a local payment record as fallback
        paymentDocId = paymentId;
        paymentData = {
          id: paymentDocId,
          userId: userId.toString(),
          planId: planId.toString(),
          planName: plan.name || 'Unknown Plan',
          amount: Number(amount) || 0,
          currency: currency || 'USD',
          status: 'completed',
          paymentMethod: paymentMethod || 'card',
          transactionId: transactionId,
          orderId: orderId,
          createdAt: Date.now(),
        };

        console.log('Created local payment record as fallback:', paymentData);

        // Store in localStorage as backup
        try {
          const existingPayments = JSON.parse(localStorage.getItem('payments') || '[]');
          existingPayments.push(paymentData);
          localStorage.setItem('payments', JSON.stringify(existingPayments));
          console.log('Payment stored in localStorage as fallback');
        } catch (storageError) {
          console.error('Error storing payment in localStorage:', storageError);
        }
      }

      // Return the payment data
      return paymentData;
    } catch (error: any) {
      console.error('Payment processing error:', error);

      // Get a more detailed error message
      let errorMessage = 'Payment processing failed';

      if (error.code) {
        // Firebase error codes
        switch (error.code) {
          case 'permission-denied':
            errorMessage = 'You do not have permission to make payments';
            break;
          case 'resource-exhausted':
            errorMessage = 'Payment service is currently unavailable. Please try again later.';
            break;
          case 'unauthenticated':
            errorMessage = 'Please log in to make a payment';
            break;
          default:
            errorMessage = `Payment error: ${error.code}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Log detailed error for debugging
      console.log('Detailed payment error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });

      return rejectWithValue(errorMessage);
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