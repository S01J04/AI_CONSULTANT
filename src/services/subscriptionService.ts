import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { isSubscriptionExpired } from '../utils/planAccess';
import { UserData } from '../redux/slices/authSlice';

/**
 * Check if a user's subscription has expired and reset it if needed
 * @param user The user to check
 * @returns True if the subscription was reset, false otherwise
 */
export const checkAndResetExpiredSubscription = async (user: UserData | null): Promise<boolean> => {
  if (!user || !user.uid) {
    console.log('No user provided to check subscription');
    return false;
  }

  try {
    // Check if the subscription is expired
    if (isSubscriptionExpired(user)) {
      console.log(`Subscription expired for user ${user.uid}, resetting plan`);
      
      // Get the latest user data from Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error('User document not found in Firestore');
        return false;
      }
      
      // Update the user document to remove the plan
      await updateDoc(userRef, {
        plan: null,
        planName: null,
        planUpdatedAt: null
      });
      
      console.log(`Successfully reset subscription for user ${user.uid}`);
      return true;
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
