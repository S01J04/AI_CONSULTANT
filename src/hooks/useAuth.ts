import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { setUser, updateLocalUserRole } from '../redux/slices/authSlice';
import { RootState, AppDispatch } from '../redux/store';
import { fetchUserSessions } from '../redux/slices/chatSlice';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'superadmin';
  createdAt: number;
  emailVerified?: boolean;
  lastLogin?: number;
}

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading, error } = useSelector((state: RootState) => state.auth);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let userDocUnsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as UserData;
          dispatch(setUser(parsedUser));

          // Set up real-time listener for this user right away
          if (parsedUser && parsedUser.uid) {
            setupUserListener(parsedUser.uid);
          }
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!mounted) return;

          if (firebaseUser) {
            try {
              // Create a basic user object from Firebase Auth data
              // This ensures we have user data even if Firestore is offline
              const basicUserData: UserData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: 'user' as const, // Default role
                createdAt: Date.now(),
                emailVerified: firebaseUser.emailVerified,
              };

              try {
                // Try to get the user document from Firestore
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

                if (userDoc.exists()) {
                  // If the document exists, use that data
                  const userData = userDoc.data() as UserData;
                  if (mounted) {
                    dispatch(setUser(userData));
                    dispatch(fetchUserSessions());

                    // Set up real-time listener for this user
                    setupUserListener(firebaseUser.uid);
                  }
                } else {
                  // If the document doesn't exist, use the basic user data
                  if (mounted) {
                    dispatch(setUser(basicUserData));
                    dispatch(fetchUserSessions());

                    // Set up real-time listener for this user
                    setupUserListener(firebaseUser.uid);
                  }
                }
              } catch (firestoreError) {
                // If Firestore is offline or there's an error, use the basic user data
                console.warn('Firestore error, using basic user data:', firestoreError);
                if (mounted) {
                  dispatch(setUser(basicUserData));
                  // Don't try to fetch sessions if Firestore is offline
                }
              }
            } catch (error) {
              console.error('Error in authentication process:', error);
              if (mounted) {
                dispatch(setUser(null));
              }
            }
          } else {
            if (mounted) {
              dispatch(setUser(null));

              // Clean up any user listener
              if (userDocUnsubscribe) {
                userDocUnsubscribe();
                userDocUnsubscribe = null;
              }
            }
          }
          if (mounted) {
            setAuthLoading(false);
          }
        });

        return () => {
          unsubscribe();
          if (userDocUnsubscribe) {
            userDocUnsubscribe();
          }
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    // Function to set up real-time listener for user document changes
    const setupUserListener = (uid: string) => {
      // Clean up previous listener if exists
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }

      // Set up new listener
      userDocUnsubscribe = onSnapshot(doc(db, 'users', uid), (docSnapshot) => {
        if (!mounted) return;

        if (docSnapshot.exists()) {
          const userData = docSnapshot.data() as UserData;

          // Update role specifically to avoid full user replacement
          dispatch(updateLocalUserRole({ uid, role: userData.role }));

          // Optional: Update full user data if needed
          // dispatch(setUser(userData));
        }
      }, (error) => {
        console.error('Error in user document listener:', error);
      });
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, [dispatch]);

  return {
    user,
    authLoading,
    loading,
    error,
    isAuthenticated: !!user
  };
};