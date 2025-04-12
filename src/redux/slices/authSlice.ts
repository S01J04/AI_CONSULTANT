import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { toast } from 'react-toastify';

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'superadmin';
  createdAt: number;
  emailVerified?: boolean;
  lastLogin?: number;
  plan?: string; // Add plan field to track user's subscription
  planName?: string; // Add planName field to display the plan name
  planUpdatedAt?: number; // Track when the plan was last updated
  planPurchasedAt?: number; // Track when the plan was purchased
  planExpiryDate?: number; // Track when the plan expires
  appointmentsUsed?: number; // Track how many appointments have been used in the current billing cycle
  appointmentsTotal?: number; // Track how many total appointments the user has available
  additionalAppointments?: number; // Track additional appointments purchased via pay-per-service
  appointmentsResetDate?: number; // Track when appointments should reset (for subscription plans)
  hadSubscriptionBefore?: boolean; // Flag to track if user ever had a subscription that was removed
}

// Helper function to get user-friendly auth error messages
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please use a different email or try logging in.';
    case 'auth/invalid-email':
      return 'The email address is not valid. Please check and try again.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use a stronger password.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful login attempts. Please try again later or reset your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support for assistance.';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    default:
      return '';
  }
};

// New consultant profile type
interface ConsultantProfile {
  uid: string;
  fullName: string;
  title: string;
  phoneNumber: string;
  specializations: string[];
  yearsOfExperience: number;
  bio: string;
  availability: {
    days: string[];
    hours: {
      from: number;
      to: number;
    };
    duration: number;
  };
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface AuthState {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  users: UserData[];
  usersLoading: boolean;
  consultantProfile: ConsultantProfile | null;
  consultantProfileLoading: boolean;
  allConsultantProfiles: ConsultantProfile[];
  allConsultantProfilesLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  users: [],
  usersLoading: false,
  consultantProfile: null,
  consultantProfileLoading: false,
  allConsultantProfiles: [],
  allConsultantProfilesLoading: false,
};

// Fetch all users (for admin management)
export const fetchUsers = createAsyncThunk(
  'auth/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users = usersSnapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserData[];
      return users;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Update user role
export const updateUserRole = createAsyncThunk(
  'auth/updateUserRole',
  async ({ uid, role }: { uid: string; role: 'user' | 'admin' | 'superadmin' }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const currentUser = state.auth.user;

      // Only superadmins can change roles
      if (currentUser?.role !== 'superadmin') {
        return rejectWithValue('Only super admins can change user roles');
      }

      // Prevent regular admins from setting superadmin role
      // SuperAdmin must be set directly in Firebase
      if (role === 'superadmin' && currentUser.uid !== uid) {
        return rejectWithValue('Superadmin role can only be set directly in Firebase');
      }

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { role });

      // If user is being demoted from admin to user, update consultant profile visibility
      if (role === 'user') {
        // Check if user has a consultant profile
        const profileRef = doc(db, 'consultantProfiles', uid);
        const profileSnapshot = await getDoc(profileRef);

        if (profileSnapshot.exists()) {
          // Update isActive to false instead of deleting
          await updateDoc(profileRef, {
            isActive: false,
            updatedAt: Date.now()
          });
        }
      }

      return { uid, role };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return email;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);


export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ email, password, displayName }: { email: string; password: string; displayName: string }, { rejectWithValue }) => {
    try {
      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return rejectWithValue('Password must be at least 8 characters and include uppercase, lowercase, number and special character');
      }

      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, { displayName });

      // Send email verification
      await sendEmailVerification(user);

      // Create user document in Firestore with secure defaults
      const userData: UserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user',
        createdAt: Date.now(),
        emailVerified: false,
        lastLogin: Date.now(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // Create a notification about email verification
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title: 'Verify Your Email',
        message: 'Please check your email and verify your account for full access.',
        type: 'security',
        read: false,
        createdAt: new Date(),
      });

      return userData;
    } catch (error: any) {
      // Enhanced error handling with user-friendly messages
      const errorMessage = getAuthErrorMessage(error.code) || error.message;
      return rejectWithValue(errorMessage);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue, dispatch }) => {
    try {
      // Implement rate limiting for login attempts (in a real app, this would be server-side)
      const loginAttemptKey = `login_attempt_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const loginAttempts = parseInt(localStorage.getItem(loginAttemptKey) || '0');

      if (loginAttempts >= 5) {
        const lastAttemptTime = parseInt(localStorage.getItem(`${loginAttemptKey}_time`) || '0');
        const currentTime = Date.now();

        // If last attempt was less than 15 minutes ago, block the login
        if (currentTime - lastAttemptTime < 15 * 60 * 1000) {
          return rejectWithValue('Too many login attempts. Please try again later or reset your password.');
        } else {
          // Reset counter after 15 minutes
          localStorage.setItem(loginAttemptKey, '0');
        }
      }

      // Attempt to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Reset login attempts on successful login
      localStorage.setItem(loginAttemptKey, '0');

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      let userData: UserData;

      if (userDoc.exists()) {
        userData = userDoc.data() as UserData;
      } else {
        // Create user document if it doesn't exist
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          emailVerified: user.emailVerified,
        };

        await setDoc(doc(db, 'users', user.uid), userData);
      }

      // Update last login time
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: Date.now(),
        emailVerified: user.emailVerified, // Update email verification status
      });

      // If email is not verified, remind the user
      if (!user.emailVerified) {
        // Create a notification about email verification
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title: 'Verify Your Email',
          message: 'Please check your email and verify your account for full access.',
          type: 'security',
          read: false,
          createdAt: new Date(),
        });
      }

      // Don't store sensitive user data in localStorage
      // Instead, only store minimal information needed for UI
      const minimalUserData = {
        uid: userData.uid,
        role: userData.role,
        isAuthenticated: true
      };
      localStorage.setItem("user", JSON.stringify(minimalUserData));

      // Validate user role from server
      await dispatch(validateUserRole(userData));

      return userData;
    } catch (error: any) {
      // Track failed login attempts
      const loginAttemptKey = `login_attempt_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const loginAttempts = parseInt(localStorage.getItem(loginAttemptKey) || '0');
      localStorage.setItem(loginAttemptKey, (loginAttempts + 1).toString());
      localStorage.setItem(`${loginAttemptKey}_time`, Date.now().toString());

      // Return user-friendly error message
      const errorMessage = getAuthErrorMessage(error.code) || error.message;
      return rejectWithValue(errorMessage);
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // Configure Google provider with additional security scopes
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        'prompt': 'select_account' // Force account selection to prevent automatic login
      });

      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      let userData: UserData;

      if (userDoc.exists()) {
        userData = userDoc.data() as UserData;
      } else {
        // Create user document if it doesn't exist
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          emailVerified: user.emailVerified,
        };

        await setDoc(doc(db, 'users', user.uid), userData);
      }

      // Update last login time
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: Date.now(),
        emailVerified: user.emailVerified, // Update email verification status
      });

      // Don't store sensitive user data in localStorage
      // Instead, only store minimal information needed for UI
      const minimalUserData = {
        uid: userData.uid,
        role: userData.role,
        isAuthenticated: true
      };
      localStorage.setItem("user", JSON.stringify(minimalUserData));

      // Validate user role from server
      await dispatch(validateUserRole(userData));

      return userData;
    } catch (error: any) {
      // Return user-friendly error message
      const errorMessage = getAuthErrorMessage(error.code) || error.message;
      return rejectWithValue(errorMessage);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      // Sign out from Firebase
      await firebaseSignOut(auth);

      // Clear all authentication data from localStorage
      localStorage.removeItem("user");

      // Clear any persisted session data
      sessionStorage.clear();

      // Clear any login attempt counters
      const loginKeys = Object.keys(localStorage).filter(key => key.startsWith('login_attempt_'));
      loginKeys.forEach(key => localStorage.removeItem(key));

      return null;
    } catch (error: any) {
      // Even if there's an error, still try to clean up local storage
      try {
        localStorage.removeItem("user");
        sessionStorage.clear();
      } catch (e) {
        console.error('Error clearing storage during sign out:', e);
      }

      const errorMessage = getAuthErrorMessage(error.code) || error.message;
      return rejectWithValue(errorMessage);
    }
  }
);

// Fetch consultant profile
export const fetchConsultantProfile = createAsyncThunk(
  'auth/fetchConsultantProfile',
  async (uid: string, { rejectWithValue }) => {
    try {
      const profileRef = doc(db, 'consultantProfiles', uid);
      const profileSnapshot = await getDoc(profileRef);

      if (profileSnapshot.exists()) {
        return profileSnapshot.data() as ConsultantProfile;
      } else {
        return null;
      }
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Save consultant profile
export const saveConsultantProfile = createAsyncThunk(
  'auth/saveConsultantProfile',
  async (profileData: Omit<ConsultantProfile, 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const { uid } = profileData;
      const profileRef = doc(db, 'consultantProfiles', uid);
      const profileSnapshot = await getDoc(profileRef);

      const now = Date.now();
      let updatedProfile: ConsultantProfile;

      if (profileSnapshot.exists()) {
        // Update existing profile
        updatedProfile = {
          ...profileData,
          createdAt: profileSnapshot.data().createdAt,
          updatedAt: now
        } as ConsultantProfile;
      } else {
        // Create new profile
        updatedProfile = {
          ...profileData,
          createdAt: now,
          updatedAt: now
        } as ConsultantProfile;
      }

      await setDoc(profileRef, updatedProfile);
      return updatedProfile;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Validate and update user role on login - enhanced for security
export const validateUserRole = createAsyncThunk(
  'auth/validateUserRole',
  async (user: UserData, { rejectWithValue }) => {
    try {
      // Get the latest user data from Firestore to ensure we have the correct role
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        return rejectWithValue('User document not found');
      }

      const userData = userDoc.data() as UserData;

      // Return the latest user data from Firestore
      return userData;
    } catch (error: any) {
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Decrement user's available appointments when scheduling
export const incrementAppointmentsUsed = createAsyncThunk(
  'auth/incrementAppointmentsUsed',
  async (userId: string, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');

      // Get the user document from Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return rejectWithValue('User not found');
      }

      const userData = userDoc.data() as UserData;

      // Check if we need to reset appointments based on reset date
      const now = Date.now();
      const resetDate = userData.appointmentsResetDate || 0;

      // Get the current values
      const currentAdditionalAppointments = userData.additionalAppointments || 0;
      const baseAppointments = userData.plan === 'premium' ? 2 : (userData.plan === 'pay-per-call' ? 1 : 0);

      // If we've passed the reset date and the user has a premium plan, reset the counts
      if (now > resetDate && userData.plan === 'premium') {
        // Reset appointments for premium users
        await updateDoc(userRef, {
          appointmentsUsed: 0,
          appointmentsTotal: baseAppointments + currentAdditionalAppointments, // Base + additional
          appointmentsResetDate: now + (30 * 24 * 60 * 60 * 1000) // Next reset in 30 days
        });

        console.log(`Reset appointments for premium user ${userId} due to reset date passing`);
        console.log(`Keeping additionalAppointments at ${currentAdditionalAppointments}`);
      }

      // Get the updated user data after potential reset
      const refreshedUserDoc = await getDoc(userRef);
      const refreshedUserData = refreshedUserDoc.data() as UserData;

      // For premium plans, we don't decrement anything when scheduling
      if (refreshedUserData.plan === 'premium') {
        console.log(`Premium user ${userId} - not decrementing anything when scheduling`);

        // Ensure the total is correct
        const currentAdditionalAppointments = refreshedUserData.additionalAppointments || 0;
        const correctTotal = baseAppointments + currentAdditionalAppointments;

        if (refreshedUserData.appointmentsTotal !== correctTotal) {
          await updateDoc(userRef, {
            appointmentsTotal: correctTotal
          });
          console.log(`Fixed appointmentsTotal for premium user ${userId} (set to ${correctTotal})`);

          // Get the updated user data
          const fixedUserDoc = await getDoc(userRef);
          return fixedUserDoc.data() as UserData;
        }

        return refreshedUserData;
      }

      // For non-premium plans, check if we have additional appointments
      if (refreshedUserData.additionalAppointments && refreshedUserData.additionalAppointments > 0) {
        // If user has additional appointments, decrement one
        const newAdditionalAppointments = refreshedUserData.additionalAppointments - 1;
        await updateDoc(userRef, {
          additionalAppointments: newAdditionalAppointments
        });
        console.log(`Decremented additionalAppointments from ${refreshedUserData.additionalAppointments} to ${newAdditionalAppointments}`);
      } else {
        // No additional appointments, decrement the total
        const currentAppointmentsTotal = refreshedUserData.appointmentsTotal || 0;
        const newAppointmentsTotal = Math.max(0, currentAppointmentsTotal - 1); // Ensure it doesn't go below 0

        await updateDoc(userRef, {
          appointmentsTotal: newAppointmentsTotal
        });
        console.log(`Decremented appointmentsTotal from ${currentAppointmentsTotal} to ${newAppointmentsTotal}`);
      }

      // Get the updated user data
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data() as UserData;

      console.log(`Updated appointments for user ${userId}:`);
      console.log(`- Appointments total: ${userData.appointmentsTotal || 0} -> ${updatedUserData.appointmentsTotal || 0}`);
      console.log(`- Additional appointments: ${userData.additionalAppointments || 0} -> ${updatedUserData.additionalAppointments || 0}`);

      return updatedUserData;
    } catch (error: any) {
      console.error('Error updating available appointments:', error);
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Reset subscription expiry date for testing
export const resetSubscriptionExpiryDate = createAsyncThunk(
  'auth/resetSubscriptionExpiryDate',
  async (userId: string, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');

      // Get the user document from Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return rejectWithValue('User not found');
      }

      const userData = userDoc.data() as UserData;

      // Only reset for users with an active plan
      if (!userData.plan) {
        return rejectWithValue('User does not have an active plan');
      }

      const now = Date.now();
      const newExpiryDate = now + (2 * 60 * 1000); // 2 minutes from now
      const newResetDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days from now

      // Update the user document with the new expiry date and reset date
      await updateDoc(userRef, {
        planExpiryDate: newExpiryDate,
        appointmentsResetDate: newResetDate
      });

      console.log(`Reset subscription expiry date to ${new Date(newExpiryDate).toLocaleString()} (2 minutes from now)`);
      console.log(`Reset appointments reset date to ${new Date(newResetDate).toLocaleString()} (30 days from now)`);

      // Get the updated user data
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data() as UserData;

      console.log(`Reset subscription expiry date for user ${userId}:`);
      console.log(`- New expiry date: ${new Date(newExpiryDate).toLocaleString()}`);
      console.log(`- New appointments reset date: ${new Date(newResetDate).toLocaleString()}`);

      // Update the user in localStorage to ensure UI reflects the changes
      if (updatedUserData) {
        localStorage.setItem('user', JSON.stringify(updatedUserData));

        // Show a toast notification to inform the user
        toast.success('Subscription expiry date reset to 2 minutes from now', {
          position: "top-center",
          autoClose: 3000,
        });
      }

      return updatedUserData;
    } catch (error: any) {
      console.error('Error resetting subscription expiry date:', error);
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Fix appointment counts for any user
export const fixAppointmentCounts = createAsyncThunk(
  'auth/fixAppointmentCounts',
  async (userId: string, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');

      // Get the user document from Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return rejectWithValue('User not found');
      }

      const userData = userDoc.data() as UserData;

      // Calculate the correct appointments total
      let baseAppointments = 0;
      if (userData.plan === 'premium') {
        baseAppointments = 2; // Premium plan includes 2 appointments
      } else if (userData.plan === 'pay-per-call') {
        baseAppointments = 1; // Pay-per-call includes 1 appointment
      }

      const additionalAppointments = userData.additionalAppointments || 0;
      const correctTotal = baseAppointments + additionalAppointments;

      // Reset the appointments used count if it's greater than the total
      const currentUsed = userData.appointmentsUsed || 0;
      const newUsed = currentUsed > correctTotal ? 0 : currentUsed;

      // Update the user document
      await updateDoc(userRef, {
        appointmentsTotal: correctTotal,
        appointmentsUsed: newUsed,
        // Set a new reset date for premium users
        ...(userData.plan === 'premium' ? { appointmentsResetDate: Date.now() + (30 * 24 * 60 * 60 * 1000) } : {})
      });

      // Get the updated user data
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data() as UserData;

      console.log(`Fixed appointment counts for user ${userId}:`);
      console.log(`- Appointments total: set to ${correctTotal}`);
      console.log(`- Appointments used: ${currentUsed} -> ${newUsed}`);
      console.log(`- Additional appointments: ${additionalAppointments}`);

      // Update the user in localStorage to ensure UI reflects the changes
      if (updatedUserData) {
        localStorage.setItem('user', JSON.stringify(updatedUserData));

        // Show a toast notification to inform the user
        toast.success('Appointment counts fixed successfully', {
          position: "top-center",
          autoClose: 3000,
        });
      }

      return updatedUserData;
    } catch (error: any) {
      console.error('Error fixing appointment counts:', error);
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Reset appointment counts for premium users
export const resetPremiumAppointments = createAsyncThunk(
  'auth/resetPremiumAppointments',
  async (userId: string, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');

      // Get the user document from Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return rejectWithValue('User not found');
      }

      const userData = userDoc.data() as UserData;

      // Only reset for premium users
      if (userData.plan !== 'premium') {
        return rejectWithValue('Only premium users can have their appointments reset');
      }

      const now = Date.now();

      // Get the current values
      const currentAdditionalAppointments = userData.additionalAppointments || 0;
      const baseAppointments = 2; // Premium plan gets 2 base appointments
      const newTotal = baseAppointments + currentAdditionalAppointments;

      console.log(`Resetting appointments for premium user ${userId}:`);
      console.log(`- Base appointments: ${baseAppointments}`);
      console.log(`- Additional appointments: ${currentAdditionalAppointments}`);
      console.log(`- New total: ${newTotal}`);

      // Reset the appointments for premium users
      await updateDoc(userRef, {
        appointmentsUsed: 0,
        appointmentsTotal: newTotal, // Base + additional appointments
        appointmentsResetDate: now + (30 * 24 * 60 * 60 * 1000) // Next reset in 30 days
      });

      // Get the updated user data
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data() as UserData;

      console.log(`Manually reset appointments for premium user ${userId}`);
      console.log(`- Appointments used: reset to 0`);
      console.log(`- Appointments total: set to 2`);
      console.log(`- Next reset date: ${new Date(updatedUserData.appointmentsResetDate || 0).toLocaleString()}`);

      // Update the user in localStorage to ensure UI reflects the changes
      if (updatedUserData) {
        localStorage.setItem('user', JSON.stringify(updatedUserData));

        // Show a toast notification to inform the user
        toast.success('Appointments reset successfully', {
          position: "top-center",
          autoClose: 3000,
        });
      }

      return updatedUserData;
    } catch (error: any) {
      console.error('Error resetting premium appointments:', error);
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Update appointment counts when an appointment is completed by an admin
export const updateAppointmentCounts = createAsyncThunk(
  'auth/updateAppointmentCounts',
  async (userId: string, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');

      // Get the user document from Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return rejectWithValue('User not found');
      }

      const userData = userDoc.data() as UserData;

      // Get the current values
      const currentAppointmentsUsed = userData.appointmentsUsed || 0;
      const currentAdditionalAppointments = userData.additionalAppointments || 0;
      const baseAppointments = userData.plan === 'premium' ? 2 : (userData.plan === 'pay-per-call' ? 1 : 0);

      // Check if we need to reset appointments based on reset date
      const now = Date.now();
      const resetDate = userData.appointmentsResetDate || 0;

      // If we've passed the reset date and the user has a premium plan, reset the counts
      if (now > resetDate && userData.plan === 'premium') {
        // Reset appointments for premium users
        // Keep additionalAppointments as is
        await updateDoc(userRef, {
          appointmentsUsed: 0, // Reset to 0
          appointmentsTotal: baseAppointments + currentAdditionalAppointments, // Base + additional
          appointmentsResetDate: now + (30 * 24 * 60 * 60 * 1000) // Next reset in 30 days
        });

        console.log(`Reset appointments for premium user ${userId} due to reset date passing`);
        console.log(`Keeping additionalAppointments at ${currentAdditionalAppointments}`);

        // Now handle the current appointment completion
        if (currentAdditionalAppointments > 0) {
          // If user has additional appointments, decrement one
          const newAdditionalAppointments = currentAdditionalAppointments - 1;
          await updateDoc(userRef, {
            additionalAppointments: newAdditionalAppointments,
            appointmentsUsed: 1 // Set to 1 for this completion
          });
          console.log(`Decremented additionalAppointments from ${currentAdditionalAppointments} to ${newAdditionalAppointments}`);
        } else {
          // No additional appointments, just increment used
          await updateDoc(userRef, {
            appointmentsUsed: 1 // Set to 1 for this completion
          });
          console.log(`Set appointmentsUsed to 1 for the current completion`);
        }
      } else {
        // Normal case (no reset needed)
        if (currentAdditionalAppointments > 0) {
          // If user has additional appointments, decrement one
          const newAdditionalAppointments = currentAdditionalAppointments - 1;
          await updateDoc(userRef, {
            additionalAppointments: newAdditionalAppointments
          });
          console.log(`Decremented additionalAppointments from ${currentAdditionalAppointments} to ${newAdditionalAppointments}`);
        } else {
          // No additional appointments, increment the used count
          const newAppointmentsUsed = currentAppointmentsUsed + 1;
          await updateDoc(userRef, {
            appointmentsUsed: newAppointmentsUsed
          });
          console.log(`Incremented appointmentsUsed to ${newAppointmentsUsed}`);
        }

        // For premium plans, ensure the total is correct
        if (userData.plan === 'premium') {
          const correctTotal = baseAppointments + currentAdditionalAppointments;
          const currentTotal = userData.appointmentsTotal || 0;

          if (currentTotal !== correctTotal) {
            // Fix the total if it's incorrect
            await updateDoc(userRef, {
              appointmentsTotal: correctTotal
            });
            console.log(`Fixed appointmentsTotal for premium user ${userId} (set to ${correctTotal})`);
          }
        }
      }

      // Get the updated user data
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data() as UserData;

      console.log(`Updated appointments for user ${userId}:`);
      console.log(`- Appointments used: ${currentAppointmentsUsed} -> ${updatedUserData.appointmentsUsed || 0}`);
      console.log(`- Additional appointments: ${currentAdditionalAppointments} -> ${updatedUserData.additionalAppointments || 0}`);

      // Update the user in localStorage to ensure UI reflects the changes
      if (updatedUserData) {
        localStorage.setItem('user', JSON.stringify(updatedUserData));

        // Show a toast notification to inform the user
        toast.success('Appointment completed successfully', {
          position: "top-center",
          autoClose: 3000,
        });
      }

      return updatedUserData;
    } catch (error: any) {
      console.error('Error updating appointments used count:', error);
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Add additional appointments to a user (for pay-per-service)
export const addAdditionalAppointments = createAsyncThunk(
  'auth/addAdditionalAppointments',
  async ({ userId, count = 1 }: { userId: string; count?: number }, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');

      // Get the user document from Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return rejectWithValue('User not found');
      }

      const userData = userDoc.data() as UserData;

      // Get the current values
      const currentAppointmentsTotal = userData.appointmentsTotal || 0;
      const currentAdditionalAppointments = userData.additionalAppointments || 0;
      const currentAppointmentsUsed = userData.appointmentsUsed || 0;

      // Increment the additional appointments count
      const newAdditionalAppointments = currentAdditionalAppointments + count;

      // Calculate the base appointments based on the user's plan
      let baseAppointments = 0;
      if (userData.plan === 'premium') {
        baseAppointments = 2; // Premium plan includes 2 appointments
      } else if (userData.plan === 'pay-per-call') {
        baseAppointments = 1; // Pay-per-call includes 1 appointment
      }

      // Calculate the new total appointments
      const newAppointmentsTotal = baseAppointments + newAdditionalAppointments;

      console.log(`Adding ${count} additional appointment(s) for user ${userId}:`);
      console.log(`- Current state: baseAppointments=${baseAppointments}, additionalAppointments=${currentAdditionalAppointments}, appointmentsUsed=${currentAppointmentsUsed}`);
      console.log(`- New state: additionalAppointments=${newAdditionalAppointments}, appointmentsTotal=${newAppointmentsTotal}`);

      // Prepare the update data
      const updateData: Record<string, any> = {
        appointmentsTotal: newAppointmentsTotal,
        additionalAppointments: newAdditionalAppointments
      };

      // Keep the current appointmentsUsed count when adding additional appointments
      // This allows users to add appointments without resetting their usage
      console.log(`Keeping appointmentsUsed at ${currentAppointmentsUsed} for user ${userId}`);

      // Update the user document
      await updateDoc(userRef, updateData);

      // Get the updated user data
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data() as UserData;

      console.log(`Added ${count} additional appointment(s) for user ${userId}:`);
      console.log(`- Appointments total: ${currentAppointmentsTotal} -> ${newAppointmentsTotal}`);
      console.log(`- Additional appointments: ${currentAdditionalAppointments} -> ${newAdditionalAppointments}`);
      console.log(`- Appointments used: ${currentAppointmentsUsed} -> ${updatedUserData.appointmentsUsed || 0}`);
      console.log(`- Remaining appointments: ${Math.max(0, newAppointmentsTotal - (updatedUserData.appointmentsUsed || 0))}`);

      // Show a toast notification to inform the user
      toast.success(`Added ${count} appointment(s) to your account!`, {
        position: "top-center",
        autoClose: 3000,
      });

      return updatedUserData;
    } catch (error: any) {
      console.error('Error adding additional appointments:', error);
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Remove user's subscription plan
export const removeUserPlan = createAsyncThunk(
  'auth/removeUserPlan',
  async (userId: string, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');

      // Update the user document in Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return rejectWithValue('User not found');
      }

      // Get the current user data
      const currentUserData = userDoc.data() as UserData;

      // Keep any additional appointments the user has purchased
      const additionalAppointments = currentUserData.additionalAppointments || 0;

      // Remove the plan but keep the hadSubscriptionBefore flag
      await updateDoc(userRef, {
        plan: null,
        planName: null,
        planUpdatedAt: null,
        planExpiryDate: null, // Clear the expiry date
        hadSubscriptionBefore: true, // Indicate that they had a plan before
        appointmentsTotal: additionalAppointments, // Reset to only additional appointments
        appointmentsResetDate: null // Clear the reset date
      });

      // Get the updated user data
      const updatedUserDoc = await getDoc(userRef);
      const userData = updatedUserDoc.data() as UserData;

      console.log('User plan removed successfully');

      return userData;
    } catch (error: any) {
      console.error('Error removing user plan:', error);
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Update user's subscription plan
export const updateUserPlan = createAsyncThunk(
  'auth/updateUserPlan',
  async ({ userId, planId, planName }: { userId: string; planId: string; planName: string }, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required');
      if (!planId) return rejectWithValue('Plan ID is required');

      // Update the user document in Firestore
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return rejectWithValue('User not found');
      }

      // Get the current user data
      const currentUserData = userDoc.data() as UserData;

      // Determine the number of appointments based on the plan
      let appointmentsTotal = 0;
      if (planId === 'premium') {
        appointmentsTotal = 2; // Premium plan includes 2 appointments
      } else if (planId === 'pay-per-call') {
        appointmentsTotal = 1; // Pay-per-call includes 1 appointment
      }

      // We'll use the current additional appointments later in the function

      // Import the testing mode configuration from planAccess.ts
      const TESTING_MODE = true; // Match the setting in planAccess.ts
      const TEST_EXPIRY_MINUTES = 2; // Match the setting in planAccess.ts

      // Calculate plan duration and expiry date
      let planDuration = 30; // Default to 30 days
      if (planId === 'basic' || planId === 'premium') {
        planDuration = 30; // Monthly plans
      } else if (planId === 'pay-per-call') {
        planDuration = 7; // Pay-per-call valid for 7 days
      }

      const now = Date.now();

      // Use test expiry time if in testing mode
      const expiryDate = TESTING_MODE
        ? now + (TEST_EXPIRY_MINUTES * 60 * 1000) // 2 minutes for testing
        : now + (planDuration * 24 * 60 * 60 * 1000); // Real duration

      // Check if this is a renewal (same plan)
      const isRenewal = currentUserData.plan === planId;

      // If it's a renewal and the current plan hasn't expired yet, extend the expiry date
      let finalExpiryDate = expiryDate;
      if (isRenewal && currentUserData.planExpiryDate && currentUserData.planExpiryDate > now) {
        // Add the appropriate duration based on testing mode
        const extensionTime = TESTING_MODE
          ? TEST_EXPIRY_MINUTES * 60 * 1000 // 2 minutes for testing
          : planDuration * 24 * 60 * 60 * 1000; // Real duration

        finalExpiryDate = currentUserData.planExpiryDate + extensionTime;
        console.log(`Extending subscription expiry date from ${new Date(currentUserData.planExpiryDate).toLocaleString()} to ${new Date(finalExpiryDate).toLocaleString()}`);
      }

      // Get the base appointments for the plan (2 for premium, 1 for pay-per-call)
      const baseAppointments = appointmentsTotal;

      // Get the current additional appointments - we keep these as is
      const currentAdditionalAppointments = currentUserData.additionalAppointments || 0;

      // Calculate the correct appointments total
      // For both new subscriptions and renewals, we use base + additional
      const newAppointmentsTotal = baseAppointments + currentAdditionalAppointments;

      if (isRenewal) {
        console.log(`Renewal detected for ${planId} plan.`);
        console.log(`Setting total to ${newAppointmentsTotal} (base ${baseAppointments} + additional ${currentAdditionalAppointments}).`);
        console.log(`Setting appointmentsUsed to 0.`);
      } else {
        console.log(`New subscription for ${planId} plan.`);
        console.log(`Setting total to ${newAppointmentsTotal} (base ${baseAppointments} + additional ${currentAdditionalAppointments}).`);
        console.log(`Setting appointmentsUsed to 0.`);
      }

      // Calculate the new appointments reset date
      // For both new subscriptions and renewals, we want to set this to 30 days from now
      const newAppointmentsResetDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days from now

      // Prepare update data
      const updateData: Record<string, any> = {
        plan: planId,
        planName: planName,
        planUpdatedAt: now,
        planPurchasedAt: isRenewal ? (currentUserData.planPurchasedAt || now) : now, // Keep original purchase date for renewals
        planExpiryDate: finalExpiryDate,
        hadSubscriptionBefore: true, // Set this flag to true when a user gets a subscription
        appointmentsTotal: newAppointmentsTotal,
        appointmentsResetDate: newAppointmentsResetDate // Reset date in 30 days
      };

      console.log(`DEBUGGING UPDATE DATA: appointmentsTotal=${newAppointmentsTotal}`);

      console.log(`Setting appointmentsResetDate to ${new Date(newAppointmentsResetDate).toLocaleString()} (30 days from now)`);

      // Always reset the appointments used count for both new subscriptions and renewals
      // This ensures users start with a clean slate when they get a new subscription
      updateData.appointmentsUsed = 0;
      console.log(`Setting appointmentsUsed to 0 for ${isRenewal ? 'renewal' : 'new subscription'}.`);

      // Update the user document
      console.log(`DEBUGGING BEFORE UPDATE: updateData=`, updateData);
      await updateDoc(userRef, updateData);
      console.log(`DEBUGGING AFTER UPDATE: Document updated`);

      // Get the updated user data
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data() as UserData;
      console.log(`DEBUGGING AFTER UPDATE: updatedUserData=`, updatedUserData);

      // Log detailed information about the update
      console.log('User plan updated successfully:', {
        planId,
        planName,
        isRenewal,
        appointmentsTotal: updatedUserData.appointmentsTotal,
        appointmentsUsed: updatedUserData.appointmentsUsed,
        additionalAppointments: currentUserData.additionalAppointments || 0,
        expiryDate: new Date(finalExpiryDate).toLocaleString(),
        appointmentsResetDate: updatedUserData.appointmentsResetDate ? new Date(updatedUserData.appointmentsResetDate).toLocaleString() : 'Not set',
        remainingAppointments: Math.max(0, (updatedUserData.appointmentsTotal || 0) - (updatedUserData.appointmentsUsed || 0))
      });

      // Log a summary for easier debugging
      console.log(`SUMMARY: User now has ${updatedUserData.appointmentsTotal} total appointments with ${updatedUserData.appointmentsUsed || 0} used.`);
      console.log(`SUMMARY: Remaining appointments: ${Math.max(0, (updatedUserData.appointmentsTotal || 0) - (updatedUserData.appointmentsUsed || 0))}.`);
      console.log(`SUMMARY: Appointments will reset on ${updatedUserData.appointmentsResetDate ? new Date(updatedUserData.appointmentsResetDate).toLocaleString() : 'Not set'}.`);
      console.log(`SUMMARY: Appointments used count was reset to ${updatedUserData.appointmentsUsed || 0}.`);

      return updatedUserData;
    } catch (error: any) {
      console.error('Error updating user plan:', error);
      return rejectWithValue(getAuthErrorMessage(error.code) || error.message);
    }
  }
);

// Fetch all consultant profiles for superadmin
export const fetchAllConsultantProfiles = createAsyncThunk(
  'auth/fetchAllConsultantProfiles',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const currentUser = state.auth.user;

      // Only superadmins can fetch all consultant profiles
      if (currentUser?.role !== 'superadmin') {
        return rejectWithValue('Only super admins can view all consultant profiles');
      }

      const profilesRef = collection(db, 'consultantProfiles');
      const profilesSnapshot = await getDocs(profilesRef);

      const profiles = profilesSnapshot.docs.map(doc => ({
        ...doc.data()
      })) as ConsultantProfile[];

      return profiles;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserData | null>) => {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem("user", JSON.stringify(action.payload));
      } else {
        localStorage.removeItem("user");
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    updateLocalUserRole: (state, action: PayloadAction<{ uid: string; role: 'user' | 'admin' | 'superadmin' }>) => {
      const { uid, role } = action.payload;
      // Update the current user if it's the same
      if (state.user && state.user.uid === uid) {
        state.user.role = role;
        localStorage.setItem("user", JSON.stringify(state.user));
      }
      // Update in the users list
      const userIndex = state.users.findIndex(user => user.uid === uid);
      if (userIndex !== -1) {
        state.users[userIndex].role = role;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchConsultantProfile.pending, (state) => {
        state.consultantProfileLoading = true;
        state.error = null;
      })
      .addCase(fetchConsultantProfile.fulfilled, (state, action) => {
        state.consultantProfileLoading = false;
        state.consultantProfile = action.payload;
      })
      .addCase(fetchConsultantProfile.rejected, (state, action) => {
        state.consultantProfileLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveConsultantProfile.pending, (state) => {
        state.consultantProfileLoading = true;
        state.error = null;
      })
      .addCase(saveConsultantProfile.fulfilled, (state, action) => {
        state.consultantProfileLoading = false;
        state.consultantProfile = action.payload;
      })
      .addCase(saveConsultantProfile.rejected, (state, action) => {
        state.consultantProfileLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAllConsultantProfiles.pending, (state) => {
        state.allConsultantProfilesLoading = true;
        state.error = null;
      })
      .addCase(fetchAllConsultantProfiles.fulfilled, (state, action) => {
        state.allConsultantProfilesLoading = false;
        state.allConsultantProfiles = action.payload;
      })
      .addCase(fetchAllConsultantProfiles.rejected, (state, action) => {
        state.allConsultantProfilesLoading = false;
        state.error = action.payload as string;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(signOut.pending, (state) => {
        state.loading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUsers.pending, (state) => {
        state.usersLoading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.usersLoading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const { uid, role } = action.payload;
        // Update in users list
        const userIndex = state.users.findIndex(user => user.uid === uid);
        if (userIndex !== -1) {
          state.users[userIndex].role = role;
        }
        // Update current user if it's the same
        if (state.user && state.user.uid === uid) {
          state.user.role = role;
          localStorage.setItem("user", JSON.stringify(state.user));
        }
      })
      .addCase(validateUserRole.fulfilled, () => {
        // No state changes needed, as this is just validation
      })
      .addCase(updateUserPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Update localStorage with the updated user data
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(updateUserPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(removeUserPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeUserPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Update localStorage with the updated user data
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(removeUserPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(incrementAppointmentsUsed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(incrementAppointmentsUsed.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Update localStorage with the updated user data
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(incrementAppointmentsUsed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateAppointmentCounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAppointmentCounts.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Update localStorage with the updated user data
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(updateAppointmentCounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(resetPremiumAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPremiumAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Update localStorage with the updated user data
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(resetPremiumAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fixAppointmentCounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fixAppointmentCounts.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Update localStorage with the updated user data
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(fixAppointmentCounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(resetSubscriptionExpiryDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetSubscriptionExpiryDate.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Update localStorage with the updated user data
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(resetSubscriptionExpiryDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(addAdditionalAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addAdditionalAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Update localStorage with the updated user data
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(addAdditionalAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUser, clearError, updateLocalUserRole } = authSlice.actions;
export default authSlice.reducer;