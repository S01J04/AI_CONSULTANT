import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';

interface PayPerServiceCardProps {
  onPurchase?: () => void;
}

const PayPerServiceCard: React.FC<PayPerServiceCardProps> = ({ onPurchase }) => {
  const navigate = useNavigate();

  const handlePurchase = () => {
    if (onPurchase) {
      onPurchase();
    } else {
      navigate('/pricing');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Need More Appointments?</h3>
        <Calendar className="h-6 w-6 text-indigo-500" />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        You've used all your available appointments. Purchase a single appointment without changing your current plan.
      </p>

      <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pay-Per-Service</p>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹299</p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>• 1 expert appointment</p>
          <p>• Valid for 7 days</p>
        </div>
      </div>

      <button
        onClick={handlePurchase}
        className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-150 ease-in-out"
      >
        Purchase Single Appointment
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>
    </div>
  );
};

export default PayPerServiceCard;
