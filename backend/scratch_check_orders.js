const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function checkOrders() {
  const db = admin.firestore();
  const ordersSnap = await db.collection('orders').get();
  const orders = [];
  ordersSnap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
  console.log(JSON.stringify(orders, null, 2));
}

checkOrders().catch(console.error);
