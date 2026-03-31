require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin (requires logic to check for the service account key)
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin Initialized Successfully");
} catch (error) {
  console.error("Failed to initialize Firebase Admin. Please make sure FIREBASE_SERVICE_ACCOUNT is set in .env");
}

const app = express();

app.use(cors());
app.use(express.json());

// Import Routes (we will create these next)
const tenantRoutes = require('./routes/tenants');
const userRoutes = require('./routes/users');

app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);

// Basic health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.status(200).send('Server is awake');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
