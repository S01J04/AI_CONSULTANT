import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { updateUserPlan } from '../../redux/slices/authSlice';
import { processPayment } from '../../redux/slices/paymentSlice';
import { markUserProcessingPayment, unmarkUserProcessingPayment } from '../../services/subscriptionService';

const PaymentSuccess: React.FC = () => {
  // Local lock to prevent expiry checks during payment processing
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { plans } = useSelector((state: RootState) => state.payment);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false); // NEW: track if payment is verified

  const hasProcessedPayment = useRef(false); // prevent duplicate processing

  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');
  const planId = queryParams.get('plan_id');
  const planName = queryParams.get('plan') || 'Premium';
useEffect(() => {
  console.log('Redux user updated:', user);
}, [user]);
  // 1️⃣ Verify payment status from backend function
useEffect(() => {
  if (!sessionId) {
    setError('Missing session ID');
    setLoading(false);
    return;
  }

  async function verifyPayment() {
    try {
      setLoading(true);
      setIsProcessingPayment(true); // Lock: start processing
      if (user?.uid) {
        markUserProcessingPayment(user.uid);
      }
      const res = await fetch(
        `https://us-central1-rewiree-4ff17.cloudfunctions.net/verifyPaymentStatus?session_id=${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',            
          },
        }
      );
      const data = await res.json();
      console.log('Payment verification response:', data);
      if (data.success && data.paymentStatus === 'completed') {
        setVerified(true);
        dispatch(updateUserPlan(data.user));
        console.log('Updated user data in redux:', user);
      } else {
        setError('Payment verification failed. Redirecting...');
        setTimeout(() => navigate('/pricing'), 3000);
      }
    } catch {
      setError('Error verifying payment. Redirecting...');
      setTimeout(() => navigate('/pricing'), 3000);
    } finally {
      setLoading(false);
      // Unlock after a short delay to allow Redux/Firestore sync
      setTimeout(() => setIsProcessingPayment(false), 2000);
    }
  }

  verifyPayment();
}, [sessionId, navigate, dispatch]);


  // 2️⃣ Process payment only after verification
useEffect(() => {
  if (!verified || isProcessingPayment) return;
  if (hasProcessedPayment.current) return;

  const processSuccessfulPayment = async () => {
    if (!user) {
      setError('User not logged in');
      setLoading(false);
      return;
    }

    try {
      console.log('🔒 Locking payment processing...');
      hasProcessedPayment.current = true;

      const plan = plans.find(p => p.id === planId) || plans.find(p => p.name === planName);

      if (!plan) {
        console.error('Plan not found, cannot record payment');
        setError('Plan not found');
        setLoading(false);
        return;
      }

      // ✅ The actual plan was already updated in Firestore in the Cloud Function!
      // Here you only record a local app payment record for history/analytics
      const resultAction = await dispatch(processPayment({
        userId: user.uid,
        planId: plan.id,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod: 'card',
      }));

      if (processPayment.fulfilled.match(resultAction)) {
        console.log('Payment record saved successfully:', resultAction.payload);
      } else {
        console.warn('Failed to save local payment record.');
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error in post-payment recording:', error);
      setError('Could not finalize payment record.');
      setLoading(false);
    } finally {
      unmarkUserProcessingPayment(user.uid);
    }
  };

  processSuccessfulPayment();
}, [verified, isProcessingPayment, user, planId, planName, plans, dispatch]);

  // Redirect to dashboard after 10 seconds if no error
  useEffect(() => {
    if (!loading && !error) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 5000);

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
