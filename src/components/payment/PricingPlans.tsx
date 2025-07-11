import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../../redux/store';
import { setCurrentPlan, processPayment } from '../../redux/slices/paymentSlice';
import { updateUserPlan } from '../../redux/slices/authSlice';
import { Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { stripe_call } from './cloudefunctions/stripefunction';

const PricingPlans: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { plans, loading } = useSelector((state: RootState) => state.payment);
  const { user } = useSelector((state: RootState) => state.auth);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
useEffect(() => {
    // Scroll to the top when the component mounts
    window.scrollTo(0, 0);
  }, []);
  // Function to handle payment processing
  const handlePayment = async (plan: any) => {
    if (!user) return;

    try {
      // In a real app, this would open the Razorpay payment flow
      // For now, we'll simulate a successful payment
      const resultAction = await dispatch(processPayment({
        userId: user.uid,
        planId: plan.id,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod: 'card',
      }));

      // Check if the payment was successful
      if (processPayment.fulfilled.match(resultAction)) {
        console.log('Payment successful:', resultAction.payload);

        // Update the user's plan in Firestore
        if (user) {
          try {
            await dispatch(updateUserPlan({
              userId: user.uid,
              planId: plan.id,
              planName: plan.name
            }));
            console.log('User plan updated successfully');

            // Show a success toast notification
            toast.success(`Payment successful! You are now subscribed to the ${plan.name} plan.`, {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          } catch (updateError) {
            console.error('Error updating user plan:', updateError);
            // Continue anyway - the payment was successful
          }
        }

        // Navigate to dashboard after successful payment
        // navigate('/dashboard');
      } else {
        // Payment failed
        console.error('Payment failed:', resultAction.payload);

        // Get a more detailed error message
        let errorMessage = 'Unknown error';
        const errorPayload = resultAction.payload;

        if (typeof errorPayload === 'string') {
          errorMessage = errorPayload;
        } else if (errorPayload && typeof errorPayload === 'object') {
          errorMessage = (errorPayload as any).message || 'Payment processing error';
        }

        toast.error(`Payment failed: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Payment processing failed:', error);

      // Get a more detailed error message
      let errorMessage = 'Unknown error';

      if (error.code) {
        // Firebase error codes
        switch (error.code) {
          case 'permission-denied':
            errorMessage = 'You do not have permission to make payments';
            break;
          case 'resource-exhausted':
            errorMessage = 'Payment service is currently unavailable';
            break;
          case 'unauthenticated':
            errorMessage = 'Please log in to make a payment';
            break;
          default:
            errorMessage = `Error: ${error.code}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(`Payment failed: ${errorMessage}`);
    } finally {
      // Reset processing state
      setProcessingPayment(null);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast.info('Please login to continue');
      navigate('/login?redirect=pricing');
      return;
    }

    const plan = plans.find(p => p.id === planId);

    if (!plan) {
      toast.error('Selected plan not found');
      return;
    }

    // Check if user already has an active subscription
    if (user.plan) {
      // Get the expiry date - prefer planExpiryDate if available, otherwise calculate from planUpdatedAt
      const planExpiryDate = user.planExpiryDate
        ? new Date(user.planExpiryDate)
        : (user.planUpdatedAt
            ? new Date(user.planUpdatedAt + (plan.duration * 24 * 60 * 60 * 1000))
            : null);

      const now = new Date();

      // If the current plan is still active
      if (planExpiryDate && now < planExpiryDate) {
        // If trying to purchase the same plan
        if (user.plan === planId) {
          // Check if we're in testing mode (expiry date is very close)
          const isTestingMode = (planExpiryDate.getTime() - now.getTime()) < (24 * 60 * 60 * 1000); // Less than 1 day

          if (isTestingMode) {
            // Show a simple toast message
            toast.info(
              `You already have an active ${plan.name} subscription.`,
              { autoClose: 5000, closeButton: true }
            );
          } else {
            // Normal message for production
            toast.info(
              `You already have an active ${plan.name} subscription valid until ${planExpiryDate.toLocaleDateString()}.`,
              { autoClose: 5000, closeButton: true }
            );
          }
          return;
        }

        // If trying to downgrade from premium to basic
        if (user.plan === 'premium' && planId === 'basic') {
          toast.warning('You cannot downgrade from Premium to Basic while your Premium subscription is active');
          return;
        }

        // If trying to purchase pay-per-call while having a premium plan
        if (user.plan === 'premium' && planId === 'pay-per-call') {
          toast.info('You already have appointment booking with your Premium plan');
          return;
        }

        // Allow upgrading from basic to premium
        if (user.plan === 'basic' && planId === 'premium') {
          // Continue with upgrade
          toast.info('Upgrading your subscription from Basic to Premium');
        }

        // Allow adding pay-per-call to basic plan
        if (user.plan === 'basic' && planId === 'pay-per-call') {
          // Continue with purchase
          toast.info('Adding a single appointment booking to your Basic plan');
        }
      }
    }

    // Set the processing state to show loading UI
    setProcessingPayment(planId);
    dispatch(setCurrentPlan(planId));
    toast.info(`Processing payment for ${plan.name} plan...`, {
      position: "top-center",
      autoClose: 2000,
    });
    try {
      // Import the stripe_call function
      const { stripe_call } = await import('./cloudefunctions/stripefunction.tsx');
      
      // Call the function with plan details
      const result = await stripe_call({
        userId: user.uid,
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        currency: plan.currency || 'inr'
      });
      
      // Redirect to Stripe Checkout
      const redirectResult = await result.redirect();
      
      if (redirectResult.error) {
        throw new Error(redirectResult.error);
      }
      // console.log("stripe done")
      // // In a real app, this would open the Razorpay payment flow
      // // For now, we'll simulate a successful payment
      // const resultAction = await dispatch(processPayment({
      //   userId: user.uid,
      //   planId: plan.id,
      //   amount: plan.price,
      //   currency: plan.currency,
      //   paymentMethod: 'card',
      // }));

      // // Check if the payment was successful
      // if (processPayment.fulfilled.match(resultAction)) {
      //   console.log('Payment successful:', resultAction.payload);
        
      //   // Update the user's plan in Firestore
      //   if (user) {
      //     try {
      //       await dispatch(updateUserPlan({
      //         userId: user.uid,
      //         planId: plan.id,
      //         planName: plan.name
      //       }));
      //       console.log('User plan updated successfully');

      //       // Show a success toast notification with reset information
      //       toast.success(`Payment successful! `, {
      //         position: "top-center",
      //         autoClose: 5000,
      //         hideProgressBar: false,
      //         closeOnClick: true,
      //         pauseOnHover: true,
      //         draggable: true,
      //       });
      //     } catch (updateError) {
      //       console.error('Error updating user plan:', updateError);
      //       // Continue anyway - the payment was successful

      //       // Still show a success toast for the payment with reset information
      //       toast.success(`Payment successful! You are now subscribed to the ${plan.name} plan. Your appointments used count has been reset to 0 and any unused appointments have been added to your total.`, {
      //         position: "top-center",
      //         autoClose: 5000,
      //       });
      //     }
      //   } else {
      //     // Show a success toast even if we couldn't update the user plan
      //     toast.success(`Payment successful! You are now subscribed to the ${plan.name} plan. Your appointments used count has been reset to 0 and any unused appointments have been added to your total.`, {
      //       position: "top-center",
      //       autoClose: 5000,
      //     });
      //   }

      //   // Navigate to the payment success page with the plan name
      //   navigate(`/payment/success?plan=${encodeURIComponent(plan.name)}`);
      // } else {
      //   // If the payment failed, show an error message
      //   console.error('Payment failed:', resultAction);
      //   const errorPayload = resultAction.payload;
      //   let errorMessage = 'Unknown error';

      //   // Try to extract the error message
      //   if (typeof errorPayload === 'string') {
      //     errorMessage = errorPayload;
      //   } else if (errorPayload && typeof errorPayload === 'object') {
      //     errorMessage = (errorPayload as any).message || 'Payment processing error';
      //   }

      //   toast.error(`Payment failed: ${errorMessage}`);
      //   // Reset processing state
      //   setProcessingPayment(null);
      // }
    } catch (error: any) {
      console.error('Payment processing failed:', error);

      // Get a more detailed error message
      let errorMessage = 'Unknown error';

      if (error.code) {
        // Firebase error codes
        switch (error.code) {
          case 'permission-denied':
            errorMessage = 'You do not have permission to make payments';
            break;
          case 'resource-exhausted':
            errorMessage = 'Payment service is currently unavailable';
            break;
          case 'unauthenticated':
            errorMessage = 'Please log in to make a payment';
            break;
          default:
            errorMessage = `Error: ${error.code}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(`Payment failed: ${errorMessage}`);
      // Reset processing state
      setProcessingPayment(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Choose the Right Plan for You
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
            Get expert consultations and AI-powered advice with our flexible pricing options
          </p>
        </div>

        <div className="mt-12 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-x-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="relative p-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex flex-col"
            >
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                {plan.id === 'premium' && (
                  <p className="absolute top-0 -translate-y-1/2 bg-indigo-600 text-white px-3 py-0.5 text-sm font-semibold rounded-full">
                    Popular
                  </p>
                )}
                <p className="mt-4 flex items-baseline text-gray-900 dark:text-white">
                  <span className="text-5xl font-extrabold tracking-tight">₹{plan.price}</span>
                  <span className="ml-1 text-xl font-semibold">/{plan.id === 'pay-per-call' ? 'call' : 'mo'}</span>
                </p>
                <p className="mt-6 text-gray-500 dark:text-gray-300">{plan.description}</p>

                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => {
                    const isNegative = feature.startsWith('No ');
                    return (
                      <li key={feature} className="flex items-start">
                        <div className="flex-shrink-0">
                          {isNegative ? (
                            <X className="h-6 w-6 text-red-500" />
                          ) : (
                            <Check className="h-6 w-6 text-green-500" />
                          )}
                        </div>
                        <p className={`ml-3 text-base ${isNegative ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {feature}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading || processingPayment !== null}
                className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium ${
                  plan.id === 'premium'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800'
                } ${processingPayment === plan.id ? 'opacity-70 cursor-wait' : ''}`}
              >
                {processingPayment === plan.id ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Payment...
                  </span>
                ) : loading ? 'Processing...' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Frequently Asked Questions</h3>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white">
                What payment methods do you accept?
              </h4>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                We accept all major credit cards, debit cards, UPI, and digital wallets through our secure payment gateway.
              </p>
            </div>
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white">
                Can I cancel my subscription?
              </h4>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
               No, once a subscription is purchased, it cannot be cancelled. Please review our <a href="/cancellationandnorefundpolicy" className="text-indigo-600 hover:underline">Cancellation and No Refund Policy</a> for more details.
                 </p>
            </div>
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white">
                How do expert calls work?
              </h4>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                After payment, you'll be able to schedule a call with one of our experts at a time that works for you. You'll receive a secure link to join the call.
              </p>
            </div>
            <div>
              <h4 className="text-base font-medium text-gray-900 dark:text-white">
                Is my data secure?
              </h4>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Yes, we take data security seriously. All conversations are encrypted and we comply with HIPAA, GDPR, and other relevant regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;