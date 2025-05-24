import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51QMwnLFj2Yn4QHjJXveqHn9S2pBWEYCd65wTuunq1C1vbCSCgFZbfuzStccRzGJSxo7QDmnRcFw0NpNEVp5OkC6z00F3bB8JjM';

// Replace with your actual Stripe secret key (WARNING: This is not secure for production)
// In production, this should be handled by a server-side function
const STRIPE_SECRET_KEY = 'sk_test_51QMwnLFj2Yn4QHjJSdy9xML7uUXvjHGgmEljssIehZIe2URtcMdH2MoqhZ7VB2fmZsOb4nZoDiNuXYKeatsLlrY100ZTt6EK3Q';
<<<<<<< HEAD

=======
// hey 
>>>>>>> 013afc75f9d7db8ae7e78bce4b94e1ebf1bf2ff8
// For direct client-side implementation (not recommended for production)
export const stripe_call = async (data: any) => {
  try {
    // Extract data
    const { planId, userId, planName, price, currency } = data;
    
    // Validate required fields
    if (!userId) throw new Error('User ID is required');
    if (!planId) throw new Error('Plan ID is required');
    if (!price) throw new Error('Price is required');
    
    console.log('Processing payment for:', {
      plan: planName,
      price: price,
      currency: currency || 'inr',
      userId: userId
    });
    
    // Create a Stripe checkout session
    // WARNING: This is not secure for production as it exposes your secret key
    // In production, this should be handled by a server-side function
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
      },
      body: new URLSearchParams({
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': currency || 'inr',
        'line_items[0][price_data][product_data][name]': planName,
        'line_items[0][price_data][product_data][description]': `Subscription to ${planName}`,
        'line_items[0][price_data][unit_amount]': (price * 100).toString(), // Stripe uses cents
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}`,
        'cancel_url': `${window.location.origin}/pricing`,
        'metadata[userId]': userId,
        'metadata[planId]': planId,
        'metadata[planName]': planName
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to create checkout session');
    }
    
    const session = await response.json();
    
    return { 
      sessionId: session.id,
      async redirect() {
        try {
          // Load Stripe
          const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
          if (!stripe) throw new Error('Failed to load Stripe');
          
          // Redirect to Stripe Checkout
          const { error } = await stripe.redirectToCheckout({
            sessionId: session.id
          });
          
          if (error) throw error;
          
          return { error: null };
        } catch (error: any) {
          console.error('Redirect error:', error);
          return { error: error.message };
        }
      }
    };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}