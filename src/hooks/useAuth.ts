import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { setUser } from '../redux/slices/authSlice';
import { RootState } from '../redux/store';
import { fetchUserSessions } from '../redux/slices/chatSlice';
import { fetchUserAppointments } from '../redux/slices/appointmentSlice';
import { fetchUserPayments } from '../redux/slices/paymentSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state: RootState) => state.auth);
  const[authloading,setauthloading]=useState(true)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      dispatch(setUser(JSON.parse(storedUser)));
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log(firebaseUser)
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            dispatch(setUser(userDoc.data() as any));
          } else {
            // Create a new user document if it doesn't exist
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'user',
              createdAt: Date.now(),
            };
            localStorage.setItem("user", JSON.stringify(userData));
            dispatch(setUser(userData as any) );
            
          }
          dispatch(fetchUserSessions(firebaseUser.uid)as any);
          dispatch(fetchUserAppointments(firebaseUser.uid)as any);
          dispatch(fetchUserPayments(firebaseUser.uid)as any);
          setauthloading(false)
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        localStorage.removeItem("user");
        dispatch(setUser(null));
        setauthloading(false)
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return { user, authloading,loading, error, isAuthenticated: !!user };
};