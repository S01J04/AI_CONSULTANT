import { UserData } from '../redux/slices/authSlice';
import { PaymentPlan } from '../redux/slices/paymentSlice';

// TESTING MODE CONFIGURATION
export const TESTING_MODE = true; // Set to false to use actual expiration dates
<<<<<<< HEAD
export const TEST_EXPIRY_MINUTES = 2; // 2 minutes for subscription expiry (consistent with UI)
=======
export const TEST_EXPIRY_MINUTES = 30; // 30 minutes for subscription expiry
>>>>>>> 013afc75f9d7db8ae7e78bce4b94e1ebf1bf2ff8

// Get subscription expiry date
export const getSubscriptionExpiryDate = (user: UserData | null): Date | null => {
  if (!user || !user.plan) {
    return null;
  }

  // If the user has a planExpiryDate field, use that directly
  // This is the primary source of truth for expiry date
  if (user.planExpiryDate) {
    return new Date(user.planExpiryDate);
  }

  // If no planExpiryDate but we have planUpdatedAt, calculate based on that
  // This is for backward compatibility with older user records
  if (user.planUpdatedAt) {
    // TESTING MODE: For testing, we'll use a short expiration time
    if (TESTING_MODE) {
      // Calculate a test expiry date (2 minutes after purchase)
      return new Date(user.planUpdatedAt + (TEST_EXPIRY_MINUTES * 60 * 1000));
    }

    // NORMAL MODE: Calculate based on the actual plan duration
    // Get plan duration in days
    let planDuration = 30; // Default to 30 days

    if (user.plan === 'basic' || user.plan === 'premium') {
      planDuration = 30; // Monthly plans
    } else if (user.plan === 'pay-per-call') {
      planDuration = 7; // Pay-per-call valid for 7 days
    }

    // Calculate expiry date
    return new Date(user.planUpdatedAt + (planDuration * 24 * 60 * 60 * 1000));
  }

  // If we have neither planExpiryDate nor planUpdatedAt, return null
  return null;
};

// Check if a subscription is expired
export const isSubscriptionExpired = (user: UserData | null): boolean => {
  // If no user, they don't have a subscription at all
  if (!user) {
    // console.log('No user provided to isSubscriptionExpired');
    return false;
  }

  // If user has no plan, they don't have an active subscription
  // This is the most important check - if plan is null, they have no subscription
  if (user.plan === null || user.plan === undefined) {
    // console.log('User has no plan (null/undefined), checking if they had one before');
    // Check if they had a plan before that was removed/deleted
    const hadPlanBefore = user.hadSubscriptionBefore === true;

    // If they never had a plan, it's not expired
    // If they had a plan before that was removed, it's considered expired
    if (hadPlanBefore) {
      // console.log('User had a plan before, considering it expired');
    } else {
      // console.log('User never had a plan, not considering it expired');
    }
    return hadPlanBefore;
  }

  // If user has a plan but no planUpdatedAt, something is wrong with the data
  // Consider it expired for safety
  if (!user.planUpdatedAt) {
    // console.log('User has a plan but no planUpdatedAt timestamp, considering it expired');
    return true;
  }

<<<<<<< HEAD
  // Add grace period for newly purchased subscriptions (5 minutes)
  const gracePeriod = 5 * 60 * 1000; // 5 minutes in milliseconds
  const timeSincePurchase = Date.now() - user.planUpdatedAt;

  if (timeSincePurchase < gracePeriod) {
    // console.log('Subscription is within grace period, not considering it expired');
    return false;
  }

=======
>>>>>>> 013afc75f9d7db8ae7e78bce4b94e1ebf1bf2ff8
  // Get the expiry date (will use planExpiryDate if available, or calculate based on testing mode)
  const expiryDate = getSubscriptionExpiryDate(user);
  const now = new Date();

  if (!expiryDate) {
    // console.log('Could not determine expiry date, considering subscription expired');
    return true;
  }

  // Commented out to reduce console logs
  // if (TESTING_MODE) {
  //   // Log information about the test expiration
  //   const timeLeft = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000));
  //   console.log(`TESTING MODE: Subscription will expire in ${timeLeft} seconds`);
  //   console.log(`TESTING MODE: Subscription purchase time: ${new Date(user.planUpdatedAt).toLocaleTimeString()}`);
  //   console.log(`TESTING MODE: Subscription expiry time: ${expiryDate.toLocaleTimeString()}`);
  // }

  // Check if current time is past expiry date
  const isExpired = now > expiryDate;
  if (isExpired) {
    // console.log(`Subscription expired on ${expiryDate.toLocaleString()}`);
  } else {
    // console.log(`Subscription valid until ${expiryDate.toLocaleString()}`);
  }
  return isExpired;
};

<<<<<<< HEAD
// Check if subscription is expired, ignoring grace period (used by timer)
export const isSubscriptionExpiredIgnoringGracePeriod = (user: UserData | null): boolean => {
  console.log('🔍 Checking expiry ignoring grace period for timer');

  if (!user) {
    console.log('🔍 No user provided');
    return false;
  }

  // If user has no plan, they don't have an active subscription
  if (user.plan === null || user.plan === undefined) {
    console.log(`🔍 User has no plan (${user.plan})`);
    const hadPlanBefore = user.hadSubscriptionBefore === true;
    console.log(`🔍 Had plan before: ${hadPlanBefore}`);
    return hadPlanBefore;
  }

  // If user has a plan but no planUpdatedAt, something is wrong with the data
  if (!user.planUpdatedAt) {
    console.log('🔍 User has plan but no planUpdatedAt timestamp, considering it expired');
    return true;
  }

  // Skip grace period check - go directly to expiry date check
  console.log('🔍 Skipping grace period for timer check');

  // Get the expiry date
  const expiryDate = getSubscriptionExpiryDate(user);
  const now = new Date();

  if (!expiryDate) {
    console.log('🔍 Could not determine expiry date, considering subscription expired');
    return true;
  }

  const isExpired = now > expiryDate;
  console.log(`🔍 Timer expiry check: now=${now.toISOString()}, expiry=${expiryDate.toISOString()}, expired=${isExpired}`);

  return isExpired;
};

=======
>>>>>>> 013afc75f9d7db8ae7e78bce4b94e1ebf1bf2ff8
// Define feature access by plan
export const PLAN_FEATURES = {
  // No plan / Free - No access to any features
  none: {
    canUseChat: true, // No chat access without a plan
    canUseVoice: false,
    canBookAppointments: false,
    maxAppointments: 0,
    description: 'No subscription - No access'
  },
  // New user trial - No access (removed free trial)
  trial: {
    canUseChat: true,
    canUseVoice: false,
    canBookAppointments: false,
    maxAppointments: 0,
    description: 'No subscription - No access'
  },
  // Basic plan - Chat only
  basic: {
    canUseChat: true,
    canUseVoice: false,
    canBookAppointments: false,
    maxAppointments: 0,
    description: 'Chat with AI'
  },
  // Premium plan - Chat + Voice
  premium: {
    canUseChat: true,
    canUseVoice: true,
    canBookAppointments: true,
    maxAppointments: 2,
    description: 'Chat with AI, Voice calls, and 2 appointments per month'
  },
  // Pay per call - 1 appointment
  'pay-per-call': {
    canUseChat: true,
    canUseVoice: false,
    canBookAppointments: true,
    maxAppointments: 1,
    description: '1 appointment only'
  }
};

export type PlanFeatures = typeof PLAN_FEATURES.basic;

// Get user's current plan features
export const getUserPlanFeatures = (user: UserData | null, currentPlan: PaymentPlan | null): PlanFeatures => {
  // If no user, return the free tier features
  if (!user) {
    // console.log('No user found, returning no access features');
    return PLAN_FEATURES.none;
  }

  // Log user plan information for debugging - commented out to reduce console noise
  // console.log('User plan info:', {
  //   uid: user.uid,
  //   plan: user.plan,
  //   planName: user.planName,
  //   planUpdatedAt: user.planUpdatedAt,
  //   appointmentsTotal: user.appointmentsTotal,
  //   appointmentsUsed: user.appointmentsUsed
  // });

  // IMPORTANT: First check if user has a plan in their user document
  // This is the source of truth for user's plan
  if (user.plan) {
    // Check if subscription is expired
    if (isSubscriptionExpired(user)) {
      // console.log('Subscription expired for user:', user.uid);
      // Return no access for expired subscriptions
      return PLAN_FEATURES.none;
    }

    // If not expired, return the plan features
    if (PLAN_FEATURES[user.plan as keyof typeof PLAN_FEATURES]) {
      // console.log(`User has active plan: ${user.plan}`);
      return PLAN_FEATURES[user.plan as keyof typeof PLAN_FEATURES];
    }
  } else {
    // If user.plan is null or undefined, they don't have an active plan
    // console.log('User has no active plan in user document');
    return PLAN_FEATURES.none;
  }

  // We should not reach here if user.plan is properly checked
  // But as a fallback, check currentPlan from payment state
  if (currentPlan && PLAN_FEATURES[currentPlan.id as keyof typeof PLAN_FEATURES]) {
    // console.log(`Fallback to payment state plan: ${currentPlan.id}`);
    return PLAN_FEATURES[currentPlan.id as keyof typeof PLAN_FEATURES];
  }

  // Default to no access
  // console.log('No valid plan found, returning no access features');
  return PLAN_FEATURES.none;
};

// Check if user can access a specific feature
export const canAccessFeature = (
  feature: keyof PlanFeatures,
  user: UserData | null,
  currentPlan: PaymentPlan | null
): boolean => {
  const planFeatures = getUserPlanFeatures(user, currentPlan);
  return !!planFeatures[feature];
};

// Get remaining appointments for the user
export const getRemainingAppointments = (
  user: UserData | null,
  currentPlan: PaymentPlan | null,
  _userAppointmentsCount: number // Kept for backward compatibility but not used
): number => {
  const planFeatures = getUserPlanFeatures(user, currentPlan);

  // If user has no plan, they have no appointments
  if (!user?.plan) {
    // console.log('User has no plan, returning 0 remaining appointments');
    return 0;
  }

  // Get the appointments used count
  const appointmentsUsed = user?.appointmentsUsed || 0;
  // console.log(`User has used ${appointmentsUsed} appointments`);

  // First check if user has appointmentsTotal field (this takes precedence)
  if (user.appointmentsTotal !== undefined) {
    const appointmentsTotal = user.appointmentsTotal || 0;
    // Calculate remaining appointments by subtracting used from total
    const remaining = Math.max(0, appointmentsTotal - appointmentsUsed);
    // console.log(`User has ${remaining} remaining appointments (total: ${appointmentsTotal}, used: ${appointmentsUsed})`);
    return remaining; // Return the actual remaining appointments
  }

  // If no appointmentsTotal field, calculate based on plan's max appointments
  const remaining = Math.max(0, planFeatures.maxAppointments - appointmentsUsed);
  // console.log(`User has ${remaining} appointments from plan calculation (max: ${planFeatures.maxAppointments}, used: ${appointmentsUsed})`);

  return remaining;
};

// Check if user can book more appointments
export const canBookMoreAppointments = (
  user: UserData | null,
  currentPlan: PaymentPlan | null,
  userAppointmentsCount: number
): boolean => {
  // First check if user has a plan that allows booking appointments
  if (!canAccessFeature('canBookAppointments', user, currentPlan)) {
    // console.log('User cannot book appointments based on their plan');
    return false;
  }

  // Then check if they have remaining appointments
  const remainingAppointments = getRemainingAppointments(user, currentPlan, userAppointmentsCount);
  // console.log(`User has ${remainingAppointments} remaining appointments`);

  return remainingAppointments > 0;
};

// Get upgrade message based on current plan and requested feature
export const getUpgradeMessage = (
  feature: keyof PlanFeatures,
  user: UserData | null,
  currentPlan: PaymentPlan | null
): string => {
  // Get current plan name for the message
  const planName = user?.planName || currentPlan?.name || 'No plan';
  const hasNoPlan = !user?.plan && !currentPlan;

  // If user has no plan, show a more direct message
  if (hasNoPlan) {
    switch (feature) {
      case 'canUseChat':
        return 'You need a subscription to access AI chat. Please purchase a Basic or Premium plan.';
      case 'canUseVoice':
        return 'You need a subscription to access voice calls. Please purchase a Premium plan.';
      case 'canBookAppointments':
        return 'You need a subscription to book appointments. Please purchase a Premium or Pay-Per-Call plan.';
      default:
        return 'You need a subscription to access this feature. Please purchase a plan to continue.';
    }
  }

  // If user has an expired or incompatible plan
  switch (feature) {
    case 'canUseChat':
      return `Your current plan (${planName}) doesn't include AI chat access. Please upgrade to Basic or Premium plan.`;
    case 'canUseVoice':
      return `Your current plan (${planName}) doesn't include voice call features. Please upgrade to Premium plan.`;
    case 'canBookAppointments':
      return `Your current plan (${planName}) doesn't include appointment booking. Please upgrade to Premium plan or purchase a Pay-Per-Call plan.`;
    default:
      return `Your current plan (${planName}) doesn't include this feature. Please upgrade to access more features.`;
  }
};
