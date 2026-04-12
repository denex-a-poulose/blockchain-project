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

    const snap = await db.collection('tokens')
      .where('tenantId', '==', tenantId)
      .get();

    const tokens = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
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
    const { 
      name, symbol, decimals, totalSupply, description, walletId,
      mainCurrency, pricePerToken, softCap, hardCap, minInvestment
    } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    const isMember = await checkMembership(db, uid, tenantId);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const nameStr = typeof name === 'string' ? name.trim() : '';
    if (nameStr.length < 3 || !/^[A-Za-z0-9 ]+$/.test(nameStr)) {
      return res.status(400).json({ error: 'Token name must be at least 3 characters long and alphanumeric.' });
    }

    const symbolStr = typeof symbol === 'string' ? symbol.trim().toUpperCase() : '';
    if (symbolStr.length < 2 || symbolStr.length > 8 || !/^[A-Z0-9]+$/.test(symbolStr)) {
      return res.status(400).json({ error: 'Token symbol must be strictly 2-8 alphanumeric characters.' });
    }

    if (!walletId || typeof walletId !== 'string') {
      return res.status(400).json({ error: 'walletId is required.' });
    }

    // Security Check: Verify wallet actually exists, belongs to THIS tenant, and is active
    const walletDoc = await db.collection('tenant_wallets').doc(walletId).get();
    if (!walletDoc.exists) {
      return res.status(404).json({ error: 'Authorized wallet not found.' });
    }
    const walletData = walletDoc.data();
    if (walletData.tenantId !== tenantId || walletData.status !== 'active') {
      return res.status(403).json({ error: 'The provided wallet is either inactive or does not belong to this organization.' });
    }

    const dec = decimals === undefined || decimals === '' ? 18 : Number(decimals);
    if (!Number.isInteger(dec) || dec < 0 || dec > 18) {
      return res.status(400).json({ error: 'Decimals must be an integer between 0 and 18.' });
    }

    const supplyStr = typeof totalSupply === 'string' ? totalSupply.trim() : String(totalSupply ?? '');
    if (supplyStr !== '' && !/^\d+$/.test(supplyStr)) {
      return res.status(400).json({ error: 'Total supply must only contain digits.' });
    }

    const currencyStr = typeof mainCurrency === 'string' ? mainCurrency.trim().toUpperCase() : '';
    if (!currencyStr) {
      return res.status(400).json({ error: 'Main currency is required for the token market.' });
    }

    const priceStr = typeof pricePerToken === 'string' ? pricePerToken.trim() : String(pricePerToken ?? '');
    if (!priceStr || !/^\d+(\.\d+)?$/.test(priceStr)) {
      return res.status(400).json({ error: 'Price per token is required and must be a valid number.' });
    }

    const softCapStr = typeof softCap === 'string' ? softCap.trim() : String(softCap ?? '');
    if (softCapStr !== '' && !/^\d+(\.\d+)?$/.test(softCapStr)) {
      return res.status(400).json({ error: 'Soft cap must be a valid number.' });
    }

    const hardCapStr = typeof hardCap === 'string' ? hardCap.trim() : String(hardCap ?? '');
    if (hardCapStr !== '' && !/^\d+(\.\d+)?$/.test(hardCapStr)) {
      return res.status(400).json({ error: 'Hard cap must be a valid number.' });
    }

    const minInvStr = typeof minInvestment === 'string' ? minInvestment.trim() : String(minInvestment ?? '');
    if (minInvStr !== '' && !/^\d+(\.\d+)?$/.test(minInvStr)) {
      return res.status(400).json({ error: 'Minimum investment must be a valid number.' });
    }

    // Fetch complete organization (tenant) details
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return res.status(404).json({ error: 'Organization not found.' });
    }
    
    // Construct the embedded organization object
    const tenantData = tenantDoc.data();
    const organization = {
      id: tenantDoc.id,
      name: tenantData.name || 'Unnamed Organization',
      createdAt: tenantData.createdAt || null,
      status: tenantData.status || null,
      ownerId: tenantData.ownerId || null
    };

    const docRef = db.collection('tokens').doc();

    const payload = {
      id: docRef.id,
      tenantId,
      organization,
      walletId,
      name: nameStr,
      symbol: symbolStr,
      decimals: dec,
      totalSupply: supplyStr,
      description: typeof description === 'string' ? description.trim().slice(0, 200) : '',
      mainCurrency: currencyStr,
      pricePerToken: priceStr,
      softCap: softCapStr,
      hardCap: hardCapStr,
      minInvestment: minInvStr,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);
    res.status(201).json({
      id: docRef.id,
      tenantId,
      organization,
      walletId,
      name: payload.name,
      symbol: payload.symbol,
      decimals: payload.decimals,
      totalSupply: payload.totalSupply,
      description: payload.description,
      mainCurrency: payload.mainCurrency,
      pricePerToken: payload.pricePerToken,
      softCap: payload.softCap,
      hardCap: payload.hardCap,
      minInvestment: payload.minInvestment,
      createdBy: uid,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
