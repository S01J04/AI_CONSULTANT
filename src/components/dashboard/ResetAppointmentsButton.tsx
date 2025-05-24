import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { resetPremiumAppointments } from '../../redux/slices/authSlice';
import { toast } from 'react-toastify';

const ResetAppointmentsButton: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.auth);
  const [isResetting, setIsResetting] = useState(false);

  // Only show for premium users
  if (!user || user.plan !== 'premium') {
    return null;
  }

  const handleResetAppointments = async () => {
    if (!user) return;
    
    setIsResetting(true);
    try {
      const result = await dispatch(resetPremiumAppointments(user.uid));
      
      if (resetPremiumAppointments.fulfilled.match(result)) {
        toast.success('Appointments reset successfully!', {
          position: "top-center",
          autoClose: 3000,
        });
        
        // Force refresh to update UI
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Failed to reset appointments. Please try again.', {
          position: "top-center",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error resetting appointments:', error);
      toast.error('An error occurred while resetting appointments.', {
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
        onClick={handleResetAppointments}
        disabled={isResetting || loading}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
          'Reset Appointments'
        )}
      </button>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        This will reset your appointments to 2 (premium plan default) and clear your used appointments count.
      </p>
    </div>
  );
};

export default ResetAppointmentsButton;
