import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/store';
import { addAdditionalAppointments } from '../../redux/slices/authSlice';
import { processPayment } from '../../redux/slices/paymentSlice';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Calendar, Check, X } from 'lucide-react';

const PayPerServiceOption: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { loading } = useSelector((state: RootState) => state.payment);
  const [processingPayment, setProcessingPayment] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      toast.error('You must be logged in to purchase appointments');
      return;
    }

    setProcessingPayment(true);

    try {
      // Process the payment
      const paymentResult = await dispatch(processPayment({
        userId: user.uid,
        planId: 'pay-per-call', // Use the existing pay-per-call plan
        amount: 299, // Price for a single appointment
        currency: 'INR',
        paymentMethod: 'card',
      }));

      // Check if the payment was successful
      if (processPayment.fulfilled.match(paymentResult)) {
        const paymentData = paymentResult.payload;
        console.log('Payment successful:', paymentData);

        // Add the additional appointment to the user's account
        const appointmentResult = await dispatch(addAdditionalAppointments({
          userId: user.uid,
          count: 1 // Add 1 appointment
        }));

        if (addAdditionalAppointments.fulfilled.match(appointmentResult)) {
          console.log('Appointment added successfully:', appointmentResult.payload);
          toast.success('Payment successful! You have purchased 1 appointment.', {
            position: "top-center",
            autoClose: 5000,
          });

          // Navigate to the payment success page
          navigate(`/payment/success?plan=Pay-Per-Call`);
        } else {
          console.error('Failed to add appointment:', appointmentResult.error);
          toast.error('Payment was processed but failed to add appointment. Please contact support.', {
            position: "top-center",
            autoClose: 5000,
          });
        }
      } else {
        // If the payment failed, show an error message
        console.error('Payment processing failed:', paymentResult.error);
        toast.error('Payment failed. Please try again or contact support.', {
          position: "top-center",
          autoClose: 5000,
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('An error occurred while processing your payment. Please try again.', {
        position: "top-center",
        autoClose: 5000,
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 bg-indigo-600 dark:bg-indigo-700">
        <h3 className="text-xl font-bold text-white">Pay Per Service</h3>
        <p className="mt-1 text-indigo-100">Book a single appointment</p>
        <div className="mt-4 flex items-baseline">
          <span className="text-3xl font-extrabold text-white">₹299</span>
          <span className="ml-1 text-xl font-semibold text-indigo-100">/appointment</span>
        </div>
      </div>
      <div className="p-6 border-t border-gray-200 dark:border-gray-700">
        <ul className="space-y-4">
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <p className="ml-3 text-base text-gray-700 dark:text-gray-300">
              1 expert appointment (30 minutes)
            </p>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <p className="ml-3 text-base text-gray-700 dark:text-gray-300">
              Access to specialist network
            </p>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <Calendar className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="ml-3 text-base text-gray-700 dark:text-gray-300">
              Valid for 30 days
            </p>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-500" />
            </div>
            <p className="ml-3 text-base text-gray-700 dark:text-gray-300">
              No AI chat access
            </p>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-500" />
            </div>
            <p className="ml-3 text-base text-gray-700 dark:text-gray-300">
              No voice call access
            </p>
          </li>
        </ul>
        <div className="mt-8">
          <button
            onClick={handlePurchase}
            disabled={processingPayment || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processingPayment ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Purchase Single Appointment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayPerServiceOption;
