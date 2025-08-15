// 2. Token validation and update functions (create utils/tokenManager.js)
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { toast } from 'react-toastify';
import { estimateTokens } from './tokenCounter';

export const validateAndUpdateTokens = async (messageText) => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const inputTokens = estimateTokens(messageText);
  const estimatedOutputTokens = Math.min(inputTokens * 2, 1000); // Conservative estimate
  const totalTokens = inputTokens + estimatedOutputTokens;

  try {
    const userRef = doc(db, "users", userId);
    
    // Use transaction for atomic read+write
    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userDoc.data();
      const currentUsed = userData.tokensUsed || 0;
      const tokenLimit = userData.tokenLimit || 0;
      const planExpiryDate = userData.planExpiryDate || 0;
      
      // Check if plan is expired
      if (planExpiryDate < Date.now()) {
        throw new Error("PLAN_EXPIRED");
      }
      
      // Check if adding new tokens would exceed limit
      if (currentUsed + totalTokens > tokenLimit) {
        const remaining = Math.max(0, tokenLimit - currentUsed);
        throw new Error(`TOKEN_LIMIT_EXCEEDED:${remaining}`);
      }
      
      // Pre-increment tokens (we'll adjust later with actual response tokens)
      transaction.update(userRef, {
        tokensUsed: currentUsed + totalTokens,
        lastTokenUpdate: Date.now()
      });
      
      return { 
        success: true, 
        estimatedTokens: totalTokens,
        newUsage: currentUsed + totalTokens,
        limit: tokenLimit
      };
    });

    return result;
    
  } catch (error) {
    if (error.message === "PLAN_EXPIRED") {
      toast.error("Your subscription has expired. Please renew to continue.", {
        position: "top-right",
        autoClose: 5000
      });
    } else if (error.message.startsWith("TOKEN_LIMIT_EXCEEDED")) {
      const remaining = error.message.split(":")[1];
      toast.error(`Token limit reached! You have ${remaining} tokens remaining. Upgrade your plan to continue.`, {
        position: "top-right",
        autoClose: 7000
      });
    } else {
      toast.error("Failed to validate token limit. Please try again.");
    }
    throw error;
  }
};
export const adjustTokenUsage = async (actualResponseText, estimatedTokens) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  try {
    const actualResponseTokens = estimateTokens(actualResponseText);
    const actualTotal = estimatedTokens - Math.min(estimatedTokens * 2, 1000) + actualResponseTokens;
    
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentUsed = userDoc.data().tokensUsed || 0;
      const adjustment = actualTotal - estimatedTokens;
      
      await updateDoc(userRef, {
        tokensUsed: Math.max(0, currentUsed + adjustment),
        lastTokenUpdate: Date.now()
      });
      
      console.log(`✅ Adjusted token usage by ${adjustment} tokens`);
    }
  } catch (error) {
    console.error("❌ Failed to adjust token usage:", error);
  }
};