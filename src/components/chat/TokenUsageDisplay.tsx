// 5. Token display component (create components/TokenUsageDisplay.jsx)
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

const TokenUsageDisplay = () => {
  const [tokenData, setTokenData] = useState({ used: 0, limit: 0, planExpiry: 0 });

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, "users", userId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTokenData({
          used: data.tokensUsed || 0,
          limit: data.tokenLimit || 0,
          planExpiry: data.planExpiryDate || 0
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const percentage = tokenData.limit > 0 ? (tokenData.used / tokenData.limit) * 100 : 0;
  const isNearLimit = percentage > 80;
  const isExpired = tokenData.planExpiry < Date.now();
  const remaining = Math.max(0, tokenData.limit - tokenData.used);

 setTimeout(() => {
   if (isExpired) {
    return (
      <div className="p-3 rounded-lg border bg-red-50 border-red-200">
        <div className="flex items-center gap-2">
          <span className="text-red-600">⚠️</span>
          <span className="text-sm font-medium text-red-700">Plan Expired</span>
        </div>
        <p className="text-xs text-red-600 mt-1">
          Please renew your subscription to continue using AI chat.
        </p>
      </div>
    );
  }
 }, 3000);

  return (
    <div className={` rounded-lg border ${isNearLimit ? 'border-red-200' : ''}`}>
      
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>Used: {tokenData.used.toLocaleString()}</span>
        <span>Limit: {tokenData.limit.toLocaleString()}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all ${isNearLimit ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isNearLimit && (
        <p className="text-xs text-red-600 mt-1">
          ⚠️ {remaining} tokens remaining. Consider upgrading your plan.
        </p>
      )}
    </div>
  );
};

export default TokenUsageDisplay;
