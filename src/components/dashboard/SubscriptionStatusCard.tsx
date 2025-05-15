import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, AlertCircle, Clock, Check, X } from 'lucide-react';
import usePlanAccess from '../../hooks/usePlanAccess';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

interface SubscriptionStatusCardProps {
  className?: string;
}

const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({ className = '' }) => {
  const { user } = useSelector((state: RootState) => state.auth);

  const {
    isExpired,
    formattedExpiryDate,
    daysRemaining,
    hasActivePlan,
    planFeatures,
    userPlan,
    userPlanName,
    remainingAppointments,
    expiryDate
  } = usePlanAccess();

  // State for countdown timer
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Memoize the calculateTimeLeft function to prevent unnecessary recreations
  const calculateTimeLeft = useCallback(() => {
    if (!hasActivePlan || isExpired || !expiryDate) return null;

    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();

    if (diff <= 0) {
      // Subscription has expired, refresh the page to update UI
      // Use a timeout to avoid immediate reload which can cause infinite loops
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return null;
    }

    // Calculate hours, minutes and seconds
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds };
  }, [hasActivePlan, isExpired, expiryDate]); // Only recreate when these dependencies change

  // Update countdown timer every second
  useEffect(() => {
    // Initial calculation - only if we don't already have a value
    if (!timeLeft) {
      setTimeLeft(calculateTimeLeft());
    }

    // Only set up the interval if we have an active plan with a valid expiry date
    if (!hasActivePlan || isExpired || !expiryDate) return;

    // Set up interval to update every second
    const timerId = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();

      // Only update state if the value has changed to avoid unnecessary renders
      if (!newTimeLeft ||
          !timeLeft ||
          newTimeLeft.hours !== timeLeft.hours ||
          newTimeLeft.minutes !== timeLeft.minutes ||
          newTimeLeft.seconds !== timeLeft.seconds) {
        setTimeLeft(newTimeLeft);
      }

      // If time is up, clear the interval
      if (!newTimeLeft) {
        clearInterval(timerId);
      }
    }, 1000);

    // Clean up interval on unmount
    return () => clearInterval(timerId);
  }, [hasActivePlan, isExpired, expiryDate, timeLeft, calculateTimeLeft]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Subscription Status</h3>

          <div className="flex items-center mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Current Plan:</span>
            {hasActivePlan ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {userPlanName || userPlan || 'Active Plan'}
              </span>
            ) : isExpired && userPlan ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                Expired
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                No Active Plan
              </span>
            )}
          </div>

          {/* Show purchase and expiry dates for active plans */}
          {hasActivePlan && (
            <div className="space-y-1">
              {/* Show purchase date if available */}
              {user?.planPurchasedAt && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Purchased On:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-green-500" />
                    {new Date(user.planPurchasedAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Show expiry date */}
              {formattedExpiryDate && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Valid Until:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-indigo-500" />
                    {formattedExpiryDate}
                    {daysRemaining <= 5 && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Live Countdown Timer */}
              {timeLeft && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Expires in:</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {timeLeft.hours > 0 ? `${timeLeft.hours.toString().padStart(2, '0')}:` : ''}
                    {timeLeft.minutes.toString().padStart(2, '0')}:{timeLeft.seconds.toString().padStart(2, '0')}
                  </span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    (Testing mode: 2-minute expiration)
                  </span>
                </div>
              )}


            </div>
          )}

          {/* No more trial access */}

          {isExpired && userPlan && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              Your {userPlanName || userPlan} subscription has expired
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Link
            to="/pricing"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {hasActivePlan ? 'Upgrade Plan' :
              (isExpired && userPlan ? 'Renew Subscription' : 'Get Subscription')}
          </Link>


        </div>
      </div>

      {/* No subscription message */}
      {!hasActivePlan && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">No Active Subscription</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <p>
                  You currently don't have an active subscription. All features require a subscription plan.
                  Please purchase a subscription to access the application features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Access Section */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Features Access</h4>

        {/* Add Reset Appointments Button for Premium Users */}
        {hasActivePlan && userPlan === 'premium' && user?.appointmentsTotal !== undefined && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-200 dark:border-indigo-800">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 text-indigo-500 mr-2" />
                <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                  Premium Plan Appointments
                </h3>
              </div>
              <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-3">
                Your premium plan includes 2 appointments per month.
                <br />
                <span className="font-medium">Current status:</span> {remainingAppointments} remaining of {user.appointmentsTotal} total ({user?.appointmentsUsed || 0} used)
              </p>

            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start">
            <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${planFeatures.canUseChat ? 'text-green-500' : 'text-red-500'}`}>
              {planFeatures.canUseChat ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </div>
            <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              AI Chat Access
              {!hasActivePlan && !planFeatures.canUseChat && (
                <span className="ml-1 text-xs text-red-500">(Subscription required)</span>
              )}
            </p>
          </div>

          <div className="flex items-start">
            <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${planFeatures.canUseVoice ? 'text-green-500' : 'text-red-500'}`}>
              {planFeatures.canUseVoice ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </div>
            <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              Voice Call Access
              {!hasActivePlan && !planFeatures.canUseVoice && (
                <span className="ml-1 text-xs text-red-500">(Subscription required)</span>
              )}
            </p>
          </div>

          <div className="flex items-start">
            <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${planFeatures.canBookAppointments ? 'text-green-500' : 'text-red-500'}`}>
              {planFeatures.canBookAppointments ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </div>
            <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              Appointment Booking
              {planFeatures.canBookAppointments && remainingAppointments !== undefined ? (
                <span className="text-xs ml-1 text-green-600">({remainingAppointments} left)</span>
              ) : !hasActivePlan && !planFeatures.canBookAppointments && (
                <span className="ml-1 text-xs text-red-500">(Subscription required)</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatusCard;
