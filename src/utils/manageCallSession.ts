import { getAuth } from "firebase/auth";

export const manageCallSession = async (action: 'start' | 'pause' | 'resume' | 'end', timerSeconds?: number) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const token = await user.getIdToken();
    const response = await fetch('https://us-central1-rewiree-4ff17.cloudfunctions.net/manageCallSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        token,
        timerSeconds
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error(`Error ${action} call session:`, error);
    throw error;
  }
};
