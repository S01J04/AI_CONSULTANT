import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { RootState } from '../redux/store';
import {
  canAccessFeature,
  getUserPlanFeatures,
  PlanFeatures,
  getUpgradeMessage,
  canBookMoreAppointments,
  getRemainingAppointments,
  isSubscriptionExpired,
  getSubscriptionExpiryDate
} from '../utils/planAccess';

export const usePlanAccess = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentPlan } = useSelector((state: RootState) => state.payment);
  const { userAppointments } = useSelector((state: RootState) => state.appointment);

  // console.log('Current user data:', user);
  // console.log('Current plan from payment state:', currentPlan);

  // Get appointments used count from user data
  const appointmentsUsed = user?.appointmentsUsed || 0;

  // For backward compatibility, also calculate active appointments
  const activeAppointmentsCount = userAppointments.filter(
    app => app.status !== 'cancelled' && app.status !== 'completed'
  ).length;

  // Use memoization to prevent unnecessary recalculations
  const {
    isExpired,
    expiryDate,
    formattedExpiryDate,
    daysRemaining,
    planFeatures
  } = useMemo(() => {
    // Check if subscription is expired
    const isExpired = isSubscriptionExpired(user);

    // Get subscription expiry date
    const expiryDate = getSubscriptionExpiryDate(user);

    // Format expiry date for display
    const formattedExpiryDate = expiryDate ? expiryDate.toLocaleDateString() : null;

    // Calculate days remaining until expiry
    const daysRemaining = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

    // Get the plan features
    const planFeatures = getUserPlanFeatures(user, currentPlan);

    return {
      isExpired,
      expiryDate,
      formattedExpiryDate,
      daysRemaining,
      planFeatures
    };
  }, [user, currentPlan]); // Only recalculate when user or currentPlan changes

  // No more trial period for new users
  const isTrialUser = false;
  const trialDaysRemaining = 0;

  // Determine if user has an active plan - MUST check user.plan directly
  const hasActivePlan = !!user?.plan && !isExpired;

  return {
    // Get all plan features
    planFeatures,

    // Check if user can access a specific feature
    canAccess: (feature: keyof PlanFeatures) =>
      canAccessFeature(feature, user, currentPlan),

    // Get upgrade message for a feature
    getUpgradeMessage: (feature: keyof PlanFeatures) =>
      getUpgradeMessage(feature, user, currentPlan),

    // Check if user can book more appointments based on appointmentsUsed
    canBookMoreAppointments: () =>
      canBookMoreAppointments(user, currentPlan, appointmentsUsed),

    // Get remaining appointments based on appointmentsUsed
    remainingAppointments: getRemainingAppointments(user, currentPlan, appointmentsUsed),

    // Current plan info
    currentPlan,

    // User's plan from profile
    userPlan: user?.plan,

    // User's plan name from profile
    userPlanName: user?.planName,

    // Check if user has any plan - no more trial access
    hasActivePlan,

    // Active appointments count
    activeAppointmentsCount,

    // Subscription expiry information
    isExpired,
    expiryDate,
    formattedExpiryDate,
    daysRemaining,

    // Trial information
    isTrialUser,
    trialDaysRemaining,

    // For testing purposes - expose the raw expiry date
    rawExpiryDate: expiryDate
  };
};

export default usePlanAccess;
