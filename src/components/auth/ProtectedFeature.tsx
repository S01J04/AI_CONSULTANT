import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { canAccessFeature, PlanFeatures, getUpgradeMessage } from '../../utils/planAccess';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

interface ProtectedFeatureProps {
  feature: keyof PlanFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ProtectedFeature: React.FC<ProtectedFeatureProps> = ({
  feature,
  children,
  fallback
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentPlan } = useSelector((state: RootState) => state.payment);

  const hasAccess = canAccessFeature(feature, user, currentPlan);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback UI - more prominent red message
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
            Subscription Required
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-200">
            <p>This feature requires an active subscription. All features in this application require a subscription plan.</p>
            <p className="mt-1">{getUpgradeMessage(feature, user, currentPlan)}</p>
          </div>
          <div className="mt-4">
            <Link
              to="/pricing"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              View Subscription Plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectedFeature;
