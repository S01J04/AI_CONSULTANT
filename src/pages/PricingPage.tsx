import React from 'react';
import PricingPlans from '../components/payment/PricingPlans';

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <PricingPlans />
    </div>
  );
};

export default PricingPage;