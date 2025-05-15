import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase/config';
import { toast } from 'react-toastify';

/**
 * Secure API Service
 * 
 * This service provides a secure way to make API calls without exposing API keys in the frontend.
 * It uses Firebase Functions as a proxy to make the actual API calls.
 */

// Initialize Firebase Functions
const functions = getFunctions();

// Create a secure API proxy function
const secureApiProxy = httpsCallable(functions, 'secureApiProxy');

/**
 * Make a secure API call through Firebase Functions
 * 
 * @param endpoint The API endpoint to call
 * @param method The HTTP method to use
 * @param payload The data to send to the API
 * @returns The API response
 */
export const secureApiCall = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  payload?: any
) => {
  try {
    // Ensure user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to make API calls');
    }

    // Make the API call through Firebase Functions
    const result = await secureApiProxy({
      endpoint,
      method,
      payload
    });

    return result.data;
  } catch (error: any) {
    console.error('Secure API call failed:', error);
    
    // Show error toast
    toast.error(`API call failed: ${error.message || 'Unknown error'}`);
    
    throw error;
  }
};

/**
 * Make a secure AI chat API call
 * 
 * @param userId The user ID
 * @param message The message to send to the AI
 * @returns The AI response
 */
export const secureAiChatCall = async (userId: string, message: string) => {
  try {
    // Validate input
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!message || message.trim().length < 2) {
      throw new Error('Message is too short');
    }
    
    // Make the API call through Firebase Functions
    return await secureApiCall('openai/chat', 'POST', {
      user_id: userId,
      message: message.trim()
    });
  } catch (error: any) {
    console.error('AI chat call failed:', error);
    throw error;
  }
};

/**
 * Make a secure payment API call
 * 
 * @param userId The user ID
 * @param planId The plan ID
 * @param amount The payment amount
 * @returns The payment result
 */
export const securePaymentCall = async (userId: string, planId: string, amount: number) => {
  try {
    // Validate input
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!planId) {
      throw new Error('Plan ID is required');
    }
    
    if (!amount || amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Make the API call through Firebase Functions
    return await secureApiCall('payment/create', 'POST', {
      userId,
      planId,
      amount
    });
  } catch (error: any) {
    console.error('Payment call failed:', error);
    throw error;
  }
};

/**
 * Verify a payment
 * 
 * @param paymentId The payment ID
 * @param razorpayPaymentId The Razorpay payment ID
 * @param razorpayOrderId The Razorpay order ID
 * @param razorpaySignature The Razorpay signature
 * @returns The verification result
 */
export const verifyPayment = async (
  paymentId: string,
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string
) => {
  try {
    // Validate input
    if (!paymentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      throw new Error('Missing payment verification details');
    }
    
    // Make the API call through Firebase Functions
    return await secureApiCall('payment/verify', 'POST', {
      paymentId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    });
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    throw error;
  }
};
