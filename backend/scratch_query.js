const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function runQuery() {
  const db = admin.firestore();
  try {
    const ordersSnap = await db.collection('orders')
      .where('tenantId', '==', 'acme-po')
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log(`Found ${ordersSnap.docs.length} orders`);
  } catch (err) {
    console.error("QUERY FAILED:", err.message);
  }
}

runQuery().catch(console.error);
