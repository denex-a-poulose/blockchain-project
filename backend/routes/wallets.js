const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const verifyAuthToken = require('../middleware/authMiddleware');
const crypto = require('crypto');
const { verifyMessage } = require('viem');

// Helper to verify user is part of the tenant
async function checkMembership(db, userId, tenantId) {
  const snapshot = await db.collection('user_tenants')
    .where('userId', '==', userId)
    .where('tenantId', '==', tenantId)
    .get();
  return !snapshot.empty;
}

// 1. GET ALL WALLETS FOR TENANT
router.get('/:tenantId', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: "Access denied." });

    const walletsSnap = await db.collection('tenant_wallets')
      .where('tenantId', '==', tenantId)
      .get();

    const wallets = walletsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        walletId: data.walletId || doc.id,
        name: data.name ?? 'Unnamed wallet',
      };
    });
    // Filter to wallets belonging to user or just show all organization wallets? The prompt says "contain ID of user, Id of tenant, public address"
    res.status(200).json(wallets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. ADD WALLET (PENDING)
router.post('/:tenantId', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { walletAddress, name } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    if (!walletAddress) return res.status(400).json({ error: "Wallet address is required." });
    const trimmedName =
      typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : 'Unnamed wallet';

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: "Access denied." });

    // Check if wallet already exists
    const existingSnap = await db.collection('tenant_wallets')
      .where('tenantId', '==', tenantId)
      .where('walletAddress', '==', walletAddress.toLowerCase())
      .get();
      
    if (!existingSnap.empty) {
      return res.status(400).json({ error: "This wallet is already registered in this organization." });
    }

    const walletId = crypto.randomUUID();

    const walletData = {
      walletId,
      name: trimmedName,
      userId: uid,
      tenantId,
      walletAddress: walletAddress.toLowerCase(),
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('tenant_wallets').add(walletData);
    
    res.status(201).json({ id: docRef.id, ...walletData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// RENAME / UPDATE WALLET LABEL (Firestore document id)
router.patch('/:tenantId/record/:recordId', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId, recordId } = req.params;
    const { name } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: "Access denied." });

    const ref = db.collection('tenant_wallets').doc(recordId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Wallet not found." });
    const data = snap.data();
    if (data.tenantId !== tenantId) return res.status(403).json({ error: "Access denied." });

    await ref.update({ name: name.trim().slice(0, 120) });
    const updated = await ref.get();
    res.status(200).json({ id: updated.id, walletId: updated.data().walletId || updated.id, ...updated.data() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. GET NONCE FOR SIGNING
router.get('/:tenantId/nonce/:walletAddress', verifyAuthToken, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const db = admin.firestore();

    // Generate random 32-byte string
    const nonce = crypto.randomBytes(32).toString('hex');
    
    // Save nonce temporally mapped to the wallet
    await db.collection('wallet_nonces').doc(walletAddress.toLowerCase()).set({
      nonce,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ nonce });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. VERIFY SIGNATURE
router.post('/:tenantId/verify', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { walletAddress, signature } = req.body;
    const db = admin.firestore();

    if (!walletAddress || !signature) {
      return res.status(400).json({ error: "Wallet address and signature are required." });
    }

    // 1. Get the expected nonce
    const nonceDoc = await db.collection('wallet_nonces').doc(walletAddress.toLowerCase()).get();
    if (!nonceDoc.exists) return res.status(400).json({ error: "Verification session expired. Please try verifying again." });
    
    const { nonce } = nonceDoc.data();

    // 2. Fetch the Tenant to get the name for the exact message matching
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantName = tenantDoc.exists ? tenantDoc.data().name : "this organization";

    const expectedMessage = `Sign this message to link your wallet to ${tenantName}.\n\nNonce: ${nonce}`;

    // 3. Verify signature using viem
    try {
      const isValid = await verifyMessage({
        address: walletAddress,
        message: expectedMessage,
        signature
      });

      if (!isValid) throw new Error("Invalid signature");
    } catch (e) {
      return res.status(401).json({ error: "Signature verification failed." });
    }

    // 4. Clean up nonce
    await db.collection('wallet_nonces').doc(walletAddress.toLowerCase()).delete();

    // 5. Update wallet status to active
    const walletsSnap = await db.collection('tenant_wallets')
      .where('tenantId', '==', tenantId)
      .where('walletAddress', '==', walletAddress.toLowerCase())
      .get();

    if (walletsSnap.empty) return res.status(404).json({ error: "Wallet record not found." });

    const batch = db.batch();
    walletsSnap.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'active' });
    });

    await batch.commit();

    res.status(200).json({ success: true, message: "Wallet successfully verified." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
