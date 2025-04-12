import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const planName = queryParams.get('plan') || 'Premium';

  useEffect(() => {
    // Redirect to dashboard after 5 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

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
