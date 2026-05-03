const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

/**
 * POST /api/payments/create-order
 * Creates a Stripe PaymentIntent for the frontend to initiate checkout
 */
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'usd', tokenId, tokenName, tenantId, quantity, pricePerToken, buyerId, walletAddress } = req.body;

    if (amount === undefined || amount === null || !tokenId || !buyerId) {
      return res.status(400).json({ error: 'Missing required purchase data' });
    }

    if (amount < 0.50) {
      return res.status(400).json({ error: 'Amount must be at least 0.50 for Stripe' });
    }

    // Stripe expects amount in smallest currency unit (cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), 
      currency: currency.toLowerCase(),
      description: `Investment in ${tokenName || 'Digital Token'} - Quantity: ${quantity}`,
      shipping: {
        name: buyerId, // Using buyerId as a placeholder name
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'MH',
          postal_code: '400001',
          country: 'IN',
        },
      },
      metadata: {
        tokenId,
        tokenName: tokenName || '',
        tenantId: tenantId || '',
        quantity: quantity.toString(),
        pricePerToken: pricePerToken.toString(),
        buyerId,
        walletAddress
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe PaymentIntent Error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * POST /api/payments/verify-payment
 * Verifies the payment intent status after checkout
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const { 
      paymentIntentId,
      meta 
    } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const db = admin.firestore();
      
      const orderRef = db.collection('orders').doc(paymentIntentId);
      
      const orderData = {
        orderId: paymentIntentId,
        paymentId: paymentIntentId,
        tokenId: meta?.tokenId || paymentIntent.metadata.tokenId || '',
        tokenName: meta?.tokenName || paymentIntent.metadata.tokenName || '',
        tenantId: meta?.tenantId || paymentIntent.metadata.tenantId || '',
        quantity: parseInt(meta?.quantity || paymentIntent.metadata.quantity) || 0,
        pricePerToken: parseFloat(meta?.pricePerToken || paymentIntent.metadata.pricePerToken) || 0,
        totalPrice: paymentIntent.amount / 100,
        status: 'paid',
        buyerId: meta?.buyerId || paymentIntent.metadata.buyerId || '',
        walletAddress: meta?.walletAddress || paymentIntent.metadata.walletAddress || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await orderRef.set(orderData, { merge: true });

      return res.status(200).json({ success: true, message: "Payment verified and order saved" });
    } else {
      return res.status(400).json({ error: "Payment not successful" });
    }
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * POST /api/payments/webhook
 * Stripe Webhook Handler for redundancy
 */
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.id;
    
    const db = admin.firestore();
    await db.collection('orders').doc(orderId).set({
        status: 'completed',
        paymentId: paymentIntent.id,
        totalPrice: paymentIntent.amount / 100,
        webhookUpdated: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  res.json({ received: true });
});

/**
 * GET /api/payments/orders/:tenantId
 * Fetches all orders for a specific tenant
 */
router.get('/orders/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const db = admin.firestore();
    
    const ordersSnap = await db.collection('orders')
      .where('tenantId', '==', tenantId)
      .get();
      
    let orders = ordersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort descending in memory to avoid requiring a Firebase composite index
    orders.sort((a, b) => {
      const aTime = a.createdAt?._seconds || 0;
      const bTime = b.createdAt?._seconds || 0;
      return bTime - aTime;
    });
    
    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch Orders Error:', error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * PATCH /api/payments/orders/:orderId/fulfill
 * Marks an order as fulfilled (tokens minted)
 */
router.patch('/orders/:orderId/fulfill', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { txHash } = req.body;
    
    // In production, we'd verify the auth token and ensure the user owns the tenant.
    // For now, we update the order directly.
    const db = admin.firestore();
    const orderRef = db.collection('orders').doc(orderId);
    
    await orderRef.update({
      status: 'minted',
      mintTxHash: txHash,
      fulfilledAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(200).json({ success: true, status: 'minted' });
  } catch (error) {
    console.error('Fulfill Order Error:', error);
    res.status(500).json({ error: "Failed to fulfill order" });
  }
});

module.exports = router;
