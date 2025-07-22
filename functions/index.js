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
  console.log('user',userId)
  const userRef = db.collection('users').doc(userId); // ✅ FIXED: use admin.firestore()
  const userDoc = await userRef.get(); // ✅ FIXED
  if (!userDoc.exists) throw new Error("User not found");

  const currentUserData = userDoc.data();

  let appointmentsTotal = 0;
  if (planId === 'premium') appointmentsTotal = 2;
  else if (planId === 'pay-per-call') appointmentsTotal = 1;

  const planDurationDays = planId === 'pay-per-call' ? 7 : 30;

  // const now = Date.now();
  // const expiryDate = now + planDurationDays * 24 * 60 * 60 * 1000;
const now = Date.now();
const expiryDate = now + 2 * 60 * 1000;

  const isRenewal = currentUserData.plan === planId;

  let finalExpiryDate = expiryDate;
  if (isRenewal && currentUserData.planExpiryDate && currentUserData.planExpiryDate > now) {
    finalExpiryDate = currentUserData.planExpiryDate + planDurationDays * 24 * 60 * 60 * 1000;
  }

  const baseAppointments = appointmentsTotal;
  const currentAdditionalAppointments = currentUserData.additionalAppointments || 0;
  const newAppointmentsTotal = baseAppointments + currentAdditionalAppointments;

  const newAppointmentsResetDate = now + 30 * 24 * 60 * 60 * 1000;

  const updateData = {
    plan: planId,
    planName,
    planUpdatedAt: now,
    planPurchasedAt: isRenewal ? (currentUserData.planPurchasedAt || now) : now,
    planExpiryDate: finalExpiryDate,
    hadSubscriptionBefore: true,
    appointmentsTotal: newAppointmentsTotal,
    appointmentsResetDate: newAppointmentsResetDate,
    appointmentsUsed: 0,
  };

  await userRef.update(updateData); // ✅ FIXED

  console.log(`User ${userId} plan updated to ${planId} with expiry ${new Date(finalExpiryDate).toLocaleString()}`);
}
