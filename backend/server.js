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

// Configure strict CORS for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://blockchain-project-cbf20.web.app',
  'https://blockchain-project-cbf20.firebaseapp.com',
  'https://portal-bc.web.app',
  'https://portal-bc.firebaseapp.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true
}));
// Special handling for Stripe Webhook (needs raw body)
const paymentRoutes = require('./routes/payments');
app.use('/api/payments/webhook', paymentRoutes); // Applying the specific file first

app.use(express.json());

// Quick deploy check: GET /api should list modules (use after redeploy to confirm tokens route is live)
app.get('/api', (req, res) => {
  res.status(200).json({
    ok: true,
    modules: ['tenants', 'users', 'wallets', 'tokens'],
  });
});

// Import Routes (we will create these next)
const tenantRoutes = require('./routes/tenants');
const userRoutes = require('./routes/users');
const walletRoutes = require('./routes/wallets');
const tokenRoutes = require('./routes/tokens');

app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/payments', paymentRoutes);

// Health checks — keep body tiny (cron/uptime monitors often cap response size ~8KB;
// Render error HTML when cold/502 can exceed that and fail the job as "output too large").
app.head('/api/health', (req, res) => {
  res.status(200).end();
});
app.get('/api/health', (req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.get('/', (req, res) => {
  res.status(200).send('Server is awake');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
