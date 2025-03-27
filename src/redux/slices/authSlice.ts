import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  User,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'superadmin';
  createdAt: number;
}

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName });
      
      const userData: UserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user',
        createdAt: Date.now(),
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      
      return userData;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue, dispatch }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      let userData: UserData;
      
      if (userDoc.exists()) {
        userData = userDoc.data() as UserData;
      } else {
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: Date.now(),
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
      }
      
      localStorage.setItem("user", JSON.stringify(userData));
      
      // Validate user role
      await dispatch(validateUserRole(userData));
      
      return userData;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      let userData: UserData;
      
      if (userDoc.exists()) {
        userData = userDoc.data() as UserData;
      } else {
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: Date.now(),
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
      }
      
      localStorage.setItem("user", JSON.stringify(userData));
      
      // Validate user role
      await dispatch(validateUserRole(userData));
      
      return userData;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem("user");

      return null;
    } catch (error: any) {
      return rejectWithValue(error.message);
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

// Validate and update user role on login
export const validateUserRole = createAsyncThunk(
  'auth/validateUserRole',
  async (user: UserData, { rejectWithValue, dispatch }) => {
    try {
      // Check if the user has a consultant profile
      if (user.role === 'user') {
        const profileRef = doc(db, 'consultantProfiles', user.uid);
        const profileSnapshot = await getDoc(profileRef);
        
        // If a regular user has a consultant profile, mark it as inactive
        if (profileSnapshot.exists()) {
          await updateDoc(profileRef, { 
            isActive: false,
            updatedAt: Date.now()
          });
        }
      }
      
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message);
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
      .addCase(validateUserRole.fulfilled, (state, action) => {
        // No state changes needed, as this is just validation
      });
  },
});

export const { setUser, clearError, updateLocalUserRole } = authSlice.actions;
export default authSlice.reducer;