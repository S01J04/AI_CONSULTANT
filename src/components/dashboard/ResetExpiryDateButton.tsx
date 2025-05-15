import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { resetSubscriptionExpiryDate } from '../../redux/slices/authSlice';
import { toast } from 'react-toastify';

const ResetExpiryDateButton: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.auth);
  const [isResetting, setIsResetting] = useState(false);

  // Only show if user has an active plan
  if (!user || !user.plan) {
    return null;
  }

  const handleResetExpiryDate = async () => {
    if (!user) return;

    setIsResetting(true);
    try {
      const result = await dispatch(resetSubscriptionExpiryDate(user.uid));

      if (resetSubscriptionExpiryDate.fulfilled.match(result)) {
        toast.success('Subscription expiry date and appointments reset date updated!', {
          position: "top-center",
          autoClose: 3000,
        });

        // Force refresh to update UI
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Failed to reset expiry date. Please try again.', {
          position: "top-center",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error resetting expiry date:', error);
      toast.error('An error occurred while resetting the expiry date.', {
        position: "top-center",
        autoClose: 3000,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleResetExpiryDate}
        disabled={isResetting || loading}
        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isResetting ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Resetting...
          </span>
        ) : (
          'Reset Expiry Date (2 min)'
        )}
      </button>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        This will reset your subscription expiry date to 2 minutes from now for testing purposes.
      </p>
    </div>
  );
};

export default ResetExpiryDateButton;
