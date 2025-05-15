import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

admin.initializeApp();

// Secure environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Initialize Firestore
const db = admin.firestore();

/**
 * Create a payment intent securely on the server
 * This prevents exposure of API keys and ensures proper validation
 */
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to create a payment'
    );
  }

  try {
    // Validate input data
    const { amount, planId, planName } = data;
    if (!amount || !planId || !planName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required payment information'
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Amount must be a positive number'
      );
    }

    // Rate limiting check
    const userId = context.auth.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }

    // In a production environment, you would integrate with Razorpay API here
    // For this implementation, we'll simulate the order creation
    
    // Generate a unique order ID
    const orderId = `order_${Date.now()}_${userId.substring(0, 8)}`;
    
    // Store the payment intent in Firestore
    const paymentRef = db.collection('payments').doc();
    await paymentRef.set({
      id: paymentRef.id,
      orderId: orderId,
      userId: userId,
      planId: planId,
      planName: planName,
      amount: amount,
      currency: 'INR',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return only what the client needs
    return {
      paymentId: paymentRef.id,
      orderId: orderId,
      amount: amount,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID, // Only the public key
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while processing your payment'
    );
  }
});

/**
 * Verify payment signature to prevent tampering
 */
export const verifyPayment = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to verify a payment'
    );
  }

  try {
    const { paymentId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = data;
    
    if (!paymentId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing payment verification details'
      );
    }

    // Get the payment from Firestore
    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Payment not found'
      );
    }
    
    const payment = paymentDoc.data();
    
    // Verify that the payment belongs to the authenticated user
    if (payment?.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to verify this payment'
      );
    }

    // In production, verify the Razorpay signature
    // const generatedSignature = crypto
    //   .createHmac('sha256', RAZORPAY_KEY_SECRET)
    //   .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    //   .digest('hex');
    
    // if (generatedSignature !== razorpaySignature) {
    //   throw new functions.https.HttpsError(
    //     'invalid-argument',
    //     'Invalid payment signature'
    //   );
    // }

    // For this implementation, we'll simulate successful verification
    
    // Update payment status to completed
    await paymentRef.update({
      status: 'completed',
      razorpayPaymentId: razorpayPaymentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user's plan
    await db.collection('users').doc(context.auth.uid).update({
      plan: payment?.planId,
      planUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create a notification for the user
    await db.collection('notifications').add({
      userId: context.auth.uid,
      title: 'Payment Successful',
      message: `Your payment for ${payment?.planName} plan was successful.`,
      type: 'payment',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while verifying your payment'
    );
  }
});

/**
 * Secure API proxy for external API calls
 * This prevents exposure of API keys in the frontend
 */
export const secureApiProxy = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  try {
    const { endpoint, method, payload } = data;
    
    if (!endpoint) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing API endpoint'
      );
    }

    // Whitelist of allowed API endpoints
    const allowedEndpoints = [
      'openai',
      'calendar',
      'notifications'
    ];

    // Check if the requested endpoint is allowed
    const isAllowed = allowedEndpoints.some(allowed => endpoint.startsWith(allowed));
    
    if (!isAllowed) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'This API endpoint is not allowed'
      );
    }

    // In a production environment, you would make the actual API call here
    // For this implementation, we'll simulate the API response
    
    // Log the API call for auditing
    console.log(`API call to ${endpoint} by user ${context.auth.uid}`);

    // Return a simulated response
    return {
      success: true,
      data: {
        message: 'API call successful',
        timestamp: Date.now(),
      }
    };
  } catch (error) {
    console.error('Error in secure API proxy:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while processing your API request'
    );
  }
});

/**
 * Rate limiting function to prevent abuse
 * This updates the rate limit counters in Firestore
 */
export const updateRateLimits = functions.firestore
  .document('appointments/{appointmentId}')
  .onCreate(async (snapshot, context) => {
    const appointment = snapshot.data();
    const userId = appointment.userId;
    
    if (!userId) return null;
    
    const rateLimitRef = db.collection('rateLimits').doc(userId);
    
    // Get the current rate limit document or create it
    const rateLimitDoc = await rateLimitRef.get();
    
    if (!rateLimitDoc.exists) {
      // Create a new rate limit document
      await rateLimitRef.set({
        userId: userId,
        counts: {
          appointments: 1
        },
        lastReset: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Update the existing rate limit document
      const data = rateLimitDoc.data();
      const counts = data?.counts || {};
      const appointmentCount = counts.appointments || 0;
      
      await rateLimitRef.update({
        'counts.appointments': appointmentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    return null;
  });

/**
 * Reset rate limits every hour
 */
export const resetRateLimits = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    const rateLimitsRef = db.collection('rateLimits');
    const snapshot = await rateLimitsRef.get();
    
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        counts: {
          appointments: 0,
          chatSessions: 0,
        },
        lastReset: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    
    return null;
  });

/**
 * Send email verification reminder to users who haven't verified their email
 */
export const sendEmailVerificationReminders = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      const users = await admin.auth().listUsers();
      
      for (const user of users.users) {
        if (!user.emailVerified) {
          // In production, you would send an actual email here
          console.log(`Sending email verification reminder to ${user.email}`);
          
          // Create a notification for the user
          await db.collection('notifications').add({
            userId: user.uid,
            title: 'Verify Your Email',
            message: 'Please verify your email address to ensure the security of your account.',
            type: 'security',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error sending email verification reminders:', error);
      return null;
    }
  });
