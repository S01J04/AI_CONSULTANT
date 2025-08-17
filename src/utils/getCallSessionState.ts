import { getAuth } from "firebase/auth";

export const getCallSessionState = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const token = await user.getIdToken();
    const response = await fetch(`https://us-central1-rewiree-4ff17.cloudfunctions.net/getCallSessionState?token=${encodeURIComponent(token)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error('Error getting call session state:', error);
    throw error;
  }
};
