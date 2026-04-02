const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const verifyAuthToken = require('../middleware/authMiddleware');
const crypto = require('crypto');

async function checkMembership(db, userId, tenantId) {
  const snapshot = await db.collection('user_tenants')
    .where('userId', '==', userId)
    .where('tenantId', '==', tenantId)
    .get();
  return !snapshot.empty;
}

router.get('/:tenantId', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const snap = await db.collection('tenant_tokens')
      .where('tenantId', '==', tenantId)
      .get();

    const tokens = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: data.id || doc.id,
        tokenId: data.tokenId || doc.id,
      };
    });

    tokens.sort((a, b) => {
      const ta = a.createdAt?._seconds || 0;
      const tb = b.createdAt?._seconds || 0;
      return tb - ta;
    });

    res.status(200).json(tokens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:tenantId', verifyAuthToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { name, symbol, decimals, totalSupply, description } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Token name is required.' });
    }
    if (!symbol || typeof symbol !== 'string' || !symbol.trim()) {
      return res.status(400).json({ error: 'Token symbol is required.' });
    }

    const dec = decimals === undefined || decimals === '' ? 18 : Number(decimals);
    if (!Number.isInteger(dec) || dec < 0 || dec > 30) {
      return res.status(400).json({ error: 'Decimals must be an integer between 0 and 30.' });
    }

    const tokenId = crypto.randomUUID();
    const docRef = db.collection('tenant_tokens').doc();

    const payload = {
      id: docRef.id,
      tokenId,
      tenantId,
      name: name.trim().slice(0, 120),
      symbol: symbol.trim().toUpperCase().slice(0, 12),
      decimals: dec,
      totalSupply: typeof totalSupply === 'string' ? totalSupply.trim().slice(0, 64) : String(totalSupply ?? ''),
      description: typeof description === 'string' ? description.trim().slice(0, 2000) : '',
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);
    res.status(201).json({
      id: docRef.id,
      tokenId,
      tenantId,
      name: payload.name,
      symbol: payload.symbol,
      decimals: payload.decimals,
      totalSupply: payload.totalSupply,
      description: payload.description,
      createdBy: uid,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
