import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../redux/store';
import { setCurrentPlan, processPayment } from '../../redux/slices/paymentSlice';
import { Check, X } from 'lucide-react';

const PricingPlans: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { plans, loading } = useSelector((state: RootState) => state.payment);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      navigate('/login?redirect=pricing');
      return;
    }
    
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) return;
    
    dispatch(setCurrentPlan(planId));
    
    try {
      // In a real app, this would open the Razorpay payment flow
      // For now, we'll simulate a successful payment
      await dispatch(processPayment({
        userId: user.uid,
        planId: plan.id,
        amount: plan.price,
        currency: plan.currency,
        paymentMethod: 'card',
      }));
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Payment processing failed:', error);
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
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className="h-6 w-6 text-green-500" />
                      </div>
                      <p className="ml-3 text-base text-gray-700 dark:text-gray-300">{feature}</p>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading}
                className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium ${
                  plan.id === 'premium'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-800'
                }`}
              >
                {loading ? 'Processing...' : `Get ${plan.name}`}
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
                Yes, you can cancel your subscription at any time. Your benefits will continue until the end of your billing period.
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