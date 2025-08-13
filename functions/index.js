const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true }); // Allow CORS for all origins
const { v4: uuidv4 } = require("uuid");
const admin = require("firebase-admin");
const { StandardCheckoutClient } = require("pg-sdk-node");

admin.initializeApp();

const db = admin.firestore();

const PHONEPE_BASE_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const PHONEPE_TOKEN_URL = `${PHONEPE_BASE_URL}/v1/oauth/token`;
const PHONEPE_ORDER_STATUS_URL = `${PHONEPE_BASE_URL}/checkout/v2/order/{{merchantOrderId}}/status`;
const PAYMENT_URL = `${PHONEPE_BASE_URL}/checkout/v2/pay`;

const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const CLIENT_VERSION = 1;

// Helper: Get OAuth token from PhonePe
async function getPhonePeOAuthToken() {
  const qs = require('querystring');
  const tokenData = qs.stringify({
    client_id: CLIENT_ID,
    client_version: CLIENT_VERSION,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
  });

  const tokenRes = await axios.post(PHONEPE_TOKEN_URL, tokenData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return tokenRes.data.access_token;
}

exports.initiatePhonePePayment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
  (  async () => {
      try {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Method Not Allowed' });
        }

        const { userId, planId, planName, price } = req.body;

        if (!price || !planId || !userId) {
          return res.status(400).json({ success: false, error: "Missing userId, price, or planId" });
        }

        console.log("✅ Initiating payment for:", { userId, planId, planName, price });

        const merchantOrderId = `TXN_${uuidv4()}`;

        // 1️⃣ Save payment doc first
        await db.collection("payments").doc(merchantOrderId).set({
          userId,
          planId,
          planName,
          amount: price,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Firestore: Payment doc created with ID ${merchantOrderId}`);

        const origin = req.headers.origin || 'http://localhost:5173';
        const redirectUrl = `${origin}/payment/success?plan_id=${encodeURIComponent(planId)}&session_id=${merchantOrderId}`;

        // 2️⃣ Get OAuth token from PhonePe
        const token = await getPhonePeOAuthToken();
        console.log('✅ Access Token retrieved');

        // 3️⃣ Build payment payload
        const paymentBody = {
          merchantOrderId,
          amount: price * 100, // in paise
          expireAfter: 1200,
          paymentFlow: {
            type: 'PG_CHECKOUT',
            message: `Payment for plan: ${planName}`,
            merchantUrls: {
              redirectUrl,
            },
          },
        };

        console.log('✅ Payment payload ready');

        // 4️⃣ Send request to PhonePe
        let payRes;
        try {
          payRes = await axios.post(PAYMENT_URL, paymentBody, {
            headers: {
              Authorization: `O-Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (err) {
          console.error('❌ PhonePe API payment failed:', err?.response?.data || err.message);
          return res.status(500).json({ success: false, error: 'Payment initiation failed', details: err?.response?.data || err.message });
        }

        const phonepeRedirectUrl = payRes?.data?.redirectUrl;
        console.log('✅ PhonePe payment initiated successfully:', payRes);
        if (!phonepeRedirectUrl) {
          console.error('❌ Missing redirect URL in PhonePe response');
          return res.status(500).json({ success: false, error: 'No redirect URL returned from PhonePe' });
        }

        // 5️⃣ Return redirect info
        return res.status(200).json({
          success: true,
          redirectUrl: phonepeRedirectUrl,
          sessionId: merchantOrderId,
        });

      } catch (error) {
        console.error("❌ initiatePhonePePayment error:", error?.response?.data || error.message);
        return res.status(500).json({
          success: false,
          error: error?.response?.data || error.message || "Unknown error",
        });
      }
    })();
  });
});




exports.verifyPaymentStatus = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(204).send('');
    }

    (async () => {
      try {
        const sessionId = req.query.session_id;
        if (!sessionId) {
          return res.status(400).json({ success: false, error: "Missing session_id" });
        }

        const accessToken = await getPhonePeOAuthToken();

        const phonepeRes = await axios.get(
          PHONEPE_ORDER_STATUS_URL.replace('{{merchantOrderId}}', sessionId),
          {
            headers: {
              Authorization: `O-Bearer ${accessToken}`,
            },
          }
        );

        console.log(`📦 PhonePe Response:`, phonepeRes);
        const phonepeData = phonepeRes.data;

        const phonepeStatus = phonepeData?.state;

        if (!phonepeStatus) {
          return res.status(500).json({ success: false, error: "Invalid PhonePe status response" });
        }

        const paymentDocRef = db.collection("payments").doc(sessionId);
        const paymentDoc = await paymentDocRef.get();

        if (!paymentDoc.exists) {
          console.warn(`⚠️ Payment document not found for session: ${sessionId}`);
          return res.status(404).json({ success: false, error: "Payment session not found" });
        }

        const paymentData = paymentDoc.data();
        let currentStatus = paymentData.status || "pending";

        if (phonepeStatus === "COMPLETED" && currentStatus === "pending") {
          await paymentDocRef.update({
            status: "completed",
            phonepeState: phonepeStatus,
            transactionId: phonepeData.paymentDetails?.[0]?.transactionId || null,
            paymentMode: phonepeData.paymentDetails?.[0]?.paymentMode || null,
            paidAmount: phonepeData.paymentDetails?.[0]?.amount || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          await updateUserPlanBackend(paymentData.userId, paymentData.planId, paymentData.planName);
          currentStatus = "completed";

        } else if (["FAILED", "EXPIRED"].includes(phonepeStatus)) {
          await paymentDocRef.update({
            status: "failed",
            phonepeState: phonepeStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          currentStatus = "failed";

        } else if (phonepeStatus === "PENDING") {
          // No DB update needed
          currentStatus = "pending";
        } else {
          currentStatus = phonepeStatus.toLowerCase(); // For unexpected new status values
        }

        const userRef = db.collection("users").doc(paymentData.userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          throw new Error("User not found after update");
        }

        const updatedUser = userDoc.data();

        return res.json({
          success: true,
          phonepeStatus,
          paymentStatus: currentStatus,
          user: updatedUser,
          // orderId: phonepeData.orderId,
          // transactionId: phonepeData.paymentDetails?.[0]?.transactionId || null,
          // amount: phonepeData.paymentDetails?.[0]?.amount || null,
          // paymentMode: phonepeData.paymentDetails?.[0]?.paymentMode || null,
        });

      } catch (error) {
        console.error("❌ verifyPaymentStatus error:", error);
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
          success: false,
          error: error?.response?.data || error.message || "Internal server error",
        });
      }
    })();
  });
});




async function updateUserPlanBackend(userId, planId, planName) {
  if (!userId || !planId) throw new Error("Missing userId or planId");

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) throw new Error("User not found");

  const now = Date.now();

  // Set plan duration
  const planDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days default
  let finalExpiryDate = now + planDurationMs;

  const currentUserData = userDoc.data();
  const isRenewal = currentUserData.plan === planId;
  if (isRenewal && currentUserData.planExpiryDate > now) {
    finalExpiryDate = currentUserData.planExpiryDate + planDurationMs;
  }

  // ✅ Assign chat retention and voice minutes based on plan
  let chatRetentionDays = 10;
  let voiceMinutesRemaining = 0; // default no calls

  if (planId === "basic") {
    chatRetentionDays = 60;
    voiceMinutesRemaining = 0; // no calls in Basic
  } else if (planId === "premium") {
    chatRetentionDays = 90;
    voiceMinutesRemaining = 120; // example: 120 mins for Premium
  }

  const updateData = {
    plan: planId,
    planName,
    planUpdatedAt: now,
    planPurchasedAt: isRenewal ? (currentUserData.planPurchasedAt || now) : now,
    planExpiryDate: finalExpiryDate,
    hadSubscriptionBefore: true,
    chatRetentionDays,
    voiceMinutesRemaining,
    appointmentsUsed: 0
  };

  await userRef.update(updateData);

  console.log(`✅ User ${userId} upgraded to '${planId}'. Chats kept ${chatRetentionDays} days, Calls: ${voiceMinutesRemaining} mins.`);
}

// exports.cleanupOldChatMessages = functions.pubsub.schedule("every 24 hours").onRun(async () => {
//   const now = Date.now();
//   const usersSnapshot = await db.collection("users").get();

//   if (usersSnapshot.empty) {
//     console.log("✅ No users found for cleanup.");
//     return null;
//   }

//   for (const userDoc of usersSnapshot.docs) {
//     const userId = userDoc.id;
//     const userData = userDoc.data();
//     const retentionDays = userData?.chatRetentionDays || 10; // default 10 days for free
//     const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
//     const cutoffTime = now - retentionMs;

//     console.log(`🧹 Checking chatSessions for ${userId}, retention: ${retentionDays} days`);

//     const chatSessionsRef = db.collection("users").doc(userId).collection("chatSessions");
//     const chatSessionsSnapshot = await chatSessionsRef.get();

//     if (chatSessionsSnapshot.empty) {
//       console.log(`No chat sessions for ${userId}`);
//       continue;
//     }

//     for (const sessionDoc of chatSessionsSnapshot.docs) {
//       const sessionData = sessionDoc.data();

//       if (!Array.isArray(sessionData.messages) || sessionData.messages.length === 0) {
//         continue;
//       }

//       // Filter messages that are within the retention period
//       const updatedMessages = sessionData.messages.filter(msg => {
//         return msg.timeStamp >= cutoffTime;
//       });

//       if (updatedMessages.length !== sessionData.messages.length) {
//         await sessionDoc.ref.update({ messages: updatedMessages });
//         console.log(`✅ Cleaned old messages from session ${sessionDoc.id} for user ${userId}`);
//       }
//     }
//   }

//   return null;
// });


exports.deductVoiceMinutes = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(204).send('');
    }

    try {
      // Read from query params instead of body
      const token = req.query.token;
      const minutesToDeduct = Number(req.query.minutes) || 0;

      console.log("Incoming request:", {
        method: req.method,
        tokenProvided: !!token,
        minutesToDeduct
      });

      if (!token) {
        console.warn("No token provided");
        return res.status(401).send("Missing token");
      }
      if (minutesToDeduct <= 0) {
        console.warn("Invalid minutes:", minutesToDeduct);
        return res.status(400).send("Invalid minutes");
      }

      // Verify token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      console.log("Authenticated user:", userId);

      // Fetch user doc
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        console.warn("User not found:", userId);
        return res.status(404).send("User not found");
      }

      // Deduct minutes
      const userData = userDoc.data();
      let remaining = userData.voiceMinutesRemaining || 0;
      console.log("Current minutes:", remaining);

      if (remaining <= 0) {
        console.warn("No minutes left for user:", userId);
        return res.status(200).json({
          success: false,
          remainingMinutes: 0,
          message: "No minutes left"
        });
      }

      remaining -= minutesToDeduct;
      if (remaining < 0) remaining = 0;

      await userRef.update({ voiceMinutesRemaining: remaining });
      console.log(`Deducted ${minutesToDeduct} minutes, remaining: ${remaining}`);

      return res.status(200).json({
        success: true,
        remainingMinutes: remaining
      });

    } catch (error) {
      console.error("Error in deductVoiceMinutes:", error);
      return res.status(500).send(error.message);
    }
  });
});

