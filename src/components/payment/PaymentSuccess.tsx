import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { doc, updateDoc, getDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { updateUserPlan } from '../../redux/slices/authSlice';
import { processPayment } from '../../redux/slices/paymentSlice';
import { toast } from 'react-toastify';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { plans } = useSelector((state: RootState) => state.payment);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasProcessedPayment = useRef(false); // Add this to prevent multiple processing
  
  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');
  const planId = queryParams.get('plan_id');
  const planName = queryParams.get('plan') || 'Premium';

  useEffect(() => {
    // Only process payment once
    if (hasProcessedPayment.current) {
      return;
    }

    const processSuccessfulPayment = async () => {
      if (!user) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      try {
        console.log('Processing successful payment');
        hasProcessedPayment.current = true; // Mark as processed to prevent duplicates
        
        // Find the plan details
        const plan = plans.find(p => p.id === planId);
        if (!plan) {
          console.log('Plan not found, using fallback plan name:', planName);
          // Try to find by name if ID is not available
          const planByName = plans.find(p => p.name === planName);
          if (!planByName) {
            setError('Plan not found');
            setLoading(false);
            return;
          }
        }

        const selectedPlan = plan || plans.find(p => p.name === planName);
        if (!selectedPlan) {
          setError('Plan not found');
          setLoading(false);
          return;
        }

        console.log('Selected plan:', selectedPlan);

        // 1. Process the payment in Redux
        console.log('Processing payment in Redux');
        const resultAction = await dispatch(processPayment({
          userId: user.uid,
          planId: selectedPlan.id,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          paymentMethod: 'card',
        }));

        // Check if the payment was successful
        if (processPayment.fulfilled.match(resultAction)) {
          console.log('Payment successful:', resultAction.payload);
          
          // Update the user's plan in Firestore
          try {
            await dispatch(updateUserPlan({
              userId: user.uid,
              planId: selectedPlan.id,
              planName: selectedPlan.name
            }));
            console.log('User plan updated successfully');

            // Show a success toast notification with reset information
            // Disable this toast to prevent duplicates - the updateUserPlan action will show its own toast
            // toast.success(`Payment successful!`, {
            //   position: "top-center",
            //   autoClose: 5000,
            //   hideProgressBar: false,
            //   closeOnClick: true,
            //   pauseOnHover: true,
            //   draggable: true,
            // });
            
            setLoading(false);
          } catch (error: any) {
            console.error('Error processing payment:', error);
            setError('Failed to process payment. Please contact support.');
            setLoading(false);
          }
        } else {
          console.error('Payment failed:', resultAction.error);
          setError('Payment failed. Please try again.');
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Error processing payment:', error);
        setError('Failed to process payment. Please contact support.');
        setLoading(false);
      }
    };

    if (user) {
      console.log('Starting payment processing with session:', sessionId, 'plan:', planId || planName);
      processSuccessfulPayment();
    } else {
      console.log('User not logged in yet, waiting...');
      // If user isn't loaded yet, we'll wait
      const timer = setTimeout(() => {
        if (user) {
          processSuccessfulPayment();
        } else {
          setError('User not logged in');
          setLoading(false);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user, planId, planName, sessionId, plans, dispatch]);

  // Add a redirect to dashboard after 10 seconds
  useEffect(() => {
    if (!loading && !error) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, error, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Processing Payment</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Please wait while we activate your subscription...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Error</h1>
            <p className="mt-2 text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
          >
            Return to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful!</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Thank you for your payment. Your subscription to the {planName} plan has been activated.
          </p>
        </div>

        <div className="space-y-4 mt-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="font-medium text-green-800 dark:text-green-300">What's next?</h3>
            <ul className="mt-2 text-sm text-green-700 dark:text-green-400 list-disc list-inside">
              <li>Your account has been upgraded</li>
              <li>You now have access to all premium features</li>
              <li>You'll be redirected to your dashboard shortly</li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
          >
            Go to Dashboard
          </button>
        </div>

        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">
          You will be automatically redirected to your dashboard in a few seconds.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;