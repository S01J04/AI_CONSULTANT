import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { isSubscriptionExpired, isSubscriptionExpiredIgnoringGracePeriod } from '../utils/planAccess';
import { UserData } from '../redux/slices/authSlice';

// Track users currently processing payments to avoid race conditions
const usersProcessingPayments = new Set<string>();

/**
 * Mark a user as currently processing a payment
 * @param userId The user ID
 */
export const markUserProcessingPayment = (userId: string) => {
  usersProcessingPayments.add(userId);
  console.log(`🔒 Marked user ${userId} as processing payment - subscription checks disabled`);

  // Auto-remove after 2 minutes as a safety measure
  setTimeout(() => {
    usersProcessingPayments.delete(userId);
    console.log(`🔓 Auto-removed payment processing lock for user ${userId}`);
  }, 2 * 60 * 1000);
};

/**
 * Mark a user as finished processing payment
 * @param userId The user ID
 */
export const unmarkUserProcessingPayment = (userId: string) => {
  usersProcessingPayments.delete(userId);
  console.log(`🔓 Removed payment processing lock for user ${userId}`);
};

/**
 * Check if a user's subscription has expired and reset it if needed
 * @param user The user to check
 * @param forceCheck If true, bypasses protection mechanisms (used by timer)
 * @returns True if the subscription was reset, false otherwise
 */
export const checkAndResetExpiredSubscription = async (user: UserData | null, forceCheck: boolean = false): Promise<boolean> => {
  if (!user || !user.uid) {
    console.log('No user provided to check subscription');
    return false;
  }

  // Skip if user is currently processing a payment (unless forced by timer)
  if (!forceCheck && usersProcessingPayments.has(user.uid)) {
    console.log(`⏸️ Skipping subscription check for user ${user.uid} - payment in progress`);
    return false;
  }

  try {
    // Don't check subscriptions that were recently purchased (within 10 minutes) unless forced
    if (!forceCheck) {
      const recentPurchaseThreshold = 10 * 60 * 1000; // 10 minutes in milliseconds
      const timeSincePurchase = user.planUpdatedAt ? Date.now() - user.planUpdatedAt : Infinity;

      if (timeSincePurchase < recentPurchaseThreshold) {
        console.log(`⏸️ Skipping expiry check for recently purchased subscription (${Math.floor(timeSincePurchase / 1000)}s ago)`);
        return false;
      }
    }

    // Check if the subscription is expired
    // For timer-triggered checks, we need to bypass the grace period
    const isExpired = forceCheck ? isSubscriptionExpiredIgnoringGracePeriod(user) : isSubscriptionExpired(user);

    if (isExpired) {
      console.log(`⚠️ Subscription expired for user ${user.uid}, resetting plan ${forceCheck ? '(forced by timer)' : ''}`);

      // Get the latest user data from Firestore to double-check
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error('User document not found in Firestore');
        return false;
      }

      const latestUserData = userDoc.data() as UserData;

      // Double-check with latest data (or skip double-check if forced by timer)
      if (forceCheck || isSubscriptionExpired(latestUserData)) {
        console.log(`🔄 Updating Firestore to reset subscription for user ${user.uid}`);

        // Update the user document to remove the plan
        await updateDoc(userRef, {
          plan: null,
          planName: null,
          planUpdatedAt: null,
          planExpiryDate: null,
          hadSubscriptionBefore: true // Mark that they had a subscription before
        });

        console.log(`✅ Successfully reset subscription for user ${user.uid} ${forceCheck ? '(forced by timer)' : ''}`);
        console.log(`📝 Updated fields: plan=null, planName=null, planUpdatedAt=null, planExpiryDate=null`);
        return true;
      } else {
        console.log(`🔄 Subscription is actually valid based on latest data for user ${user.uid}`);
        return false;
      }
    } else {
      console.log(`ℹ️ Subscription is not expired for user ${user.uid}, no reset needed`);
      if (forceCheck) {
        console.log(`🔍 Force check details: user.plan=${user.plan}, user.planExpiryDate=${user.planExpiryDate}`);
        if (user.planExpiryDate) {
          const expiryDate = new Date(user.planExpiryDate);
          const now = new Date();
          console.log(`🔍 Expiry: ${expiryDate.toISOString()}, Now: ${now.toISOString()}, Expired: ${now > expiryDate}`);
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking and resetting subscription:', error);
    return false;
  }
};

/**
 * Initialize the subscription service
 * This should be called when the app starts
 * @param user The current user
 */
export const initSubscriptionService = (user: UserData | null) => {
  if (!user) return;

  // Check for expired subscriptions immediately
  checkAndResetExpiredSubscription(user)
    .then(wasReset => {
      if (wasReset) {
        console.log('Subscription was reset due to expiration');
        // You could dispatch an action here to update the UI
        // or show a notification to the user
      }
    })
    .catch(error => {
      console.error('Error in subscription service initialization:', error);
    });

  // You could also set up a periodic check here if needed
  // For example, check every hour while the app is running
  /*
  setInterval(() => {
    checkAndResetExpiredSubscription(user)
      .then(wasReset => {
        if (wasReset) {
          console.log('Subscription was reset due to expiration');
          // Update UI or show notification
        }
      })
      .catch(error => {
        console.error('Error in periodic subscription check:', error);
      });
  }, 60 * 60 * 1000); // Check every hour
  */
};
