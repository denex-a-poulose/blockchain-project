const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const verifyAuthToken = require('../middleware/authMiddleware');

// Helper to check membership
async function checkMembership(db, userId, tenantId) {
  const snapshot = await db.collection('user_tenants')
    .where('userId', '==', userId)
    .where('tenantId', '==', tenantId)
    .get();
  return !snapshot.empty;
}

// 1. CREATE TENANT
router.post('/', verifyAuthToken, async (req, res) => {
  try {
    const { id, name, description, currency, country, language } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    const formattedId = id?.trim();
    if (!name || !name.trim()) return res.status(400).json({ error: "Tenant name required." });
    if (!formattedId) return res.status(400).json({ error: "Organization ID required." });
    if (!/^[a-zA-Z0-9-]+$/.test(formattedId)) return res.status(400).json({ error: "Organization ID can only contain letters, numbers, and hyphens." });

    const tenantRef = db.collection('tenants').doc(formattedId);
    const tenantSnap = await tenantRef.get();
    if (tenantSnap.exists) {
      return res.status(400).json({ error: "This organization ID is already taken. Please choose another one." });
    }

    const tenantData = {
      id: formattedId,
      name: name.trim(),
      description: description?.trim() || "",
      currency: currency || "USD",
      country: country || "",
      language: language || "en",
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await tenantRef.set(tenantData);

    const memberRef = db.collection('user_tenants').doc();
    await memberRef.set({
      id: memberRef.id,
      userId: uid,
      tenantId: formattedId,
      role: 'admin',
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ ...tenantData, createdAt: new Date() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. GET USER TENANTS
router.get('/', verifyAuthToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const db = admin.firestore();
    const membershipSnap = await db.collection('user_tenants').where('userId', '==', uid).get();
    
    if (membershipSnap.empty) return res.status(200).json([]);

    const tenants = await Promise.all(
      membershipSnap.docs.map(async (doc) => {
        const data = doc.data();
        const tenantSnap = await db.collection('tenants').doc(data.tenantId).get();
        if (!tenantSnap.exists) return null;
        return {
          id: tenantSnap.id,
          ...tenantSnap.data(),
          role: data.role,
        };
      })
    );

    res.status(200).json(tenants.filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. PROCESS PENDING INVITATIONS ON SIGNUP
router.post('/invitations/process', verifyAuthToken, async (req, res) => {
  try {
    const email = req.user.email;
    const uid = req.user.uid;
    if (!email) return res.status(200).json({ processed: 0 });

    const db = admin.firestore();
    const inviteSnap = await db.collection('pending_invitations').where('email', '==', email).get();

    if (inviteSnap.empty) return res.status(200).json({ processed: 0 });

    let processed = 0;
    const batch = db.batch();

    for (const docSnap of inviteSnap.docs) {
      const { tenantId, role, invitedBy } = docSnap.data();

      const existing = await checkMembership(db, uid, tenantId);
      if (!existing) {
        const memberRef = db.collection('user_tenants').doc();
        batch.set(memberRef, {
          id: memberRef.id,
          userId: uid,
          tenantId,
          role,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          invitedBy
        });
        processed++;
      }
      batch.delete(docSnap.ref);
    }

    await batch.commit();
    res.status(200).json({ processed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. GET TENANT MEMBERS
router.get('/:id/members', verifyAuthToken, async (req, res) => {
  try {
    const tenantId = req.params.id;
    const db = admin.firestore();

    const memberSnap = await db.collection('user_tenants').where('tenantId', '==', tenantId).get();
    if (memberSnap.empty) return res.status(200).json([]);

    const members = await Promise.all(
      memberSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const userSnap = await db.collection('tenant_users').doc(data.userId).get();
        const userData = userSnap.exists ? userSnap.data() : {};
        return {
          membershipId: docSnap.id,
          userId: data.userId,
          role: data.role,
          joinedAt: data.joinedAt,
          email: userData.email || 'Unknown',
          name: userData.name || 'Unknown'
        };
      })
    );
    res.status(200).json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. INVITE USER (Auto-join if exists)
router.post('/:id/invite', verifyAuthToken, async (req, res) => {
  try {
    const tenantId = req.params.id;
    const { email, role = 'member' } = req.body;
    const uid = req.user.uid;
    const db = admin.firestore();

    if (!email) return res.status(400).json({ error: 'Email required' });

    // 1. Check if user already exists
    const usersSnap = await db.collection('tenant_users').where('email', '==', email.trim()).get();
    
    if (!usersSnap.empty) {
      const targetUserId = usersSnap.docs[0].id;
      const existing = await checkMembership(db, targetUserId, tenantId);
      if (existing) return res.status(400).json({ error: 'User is already a member of this tenant.' });

      // User exists, add them directly
      const memberRef = db.collection('user_tenants').doc();
      await memberRef.set({
        id: memberRef.id,
        userId: targetUserId,
        tenantId,
        role,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        invitedBy: uid
      });

      return res.status(200).json({ status: 'joined', email: email.trim() });
    }

    // 2. User does NOT exist, create pending invitation
    const pendingSnap = await db.collection('pending_invitations')
      .where('email', '==', email.trim())
      .where('tenantId', '==', tenantId)
      .get();
    
    if (!pendingSnap.empty) return res.status(400).json({ error: 'An invitation has already been sent to this email.' });

    const inviteRef = db.collection('pending_invitations').doc();
    await inviteRef.set({
      id: inviteRef.id,
      email: email.trim(),
      tenantId,
      role,
      invitedBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ status: 'pending', email: email.trim() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. REMOVE MEMBER
router.delete('/membership/:id', verifyAuthToken, async (req, res) => {
  try {
    const db = admin.firestore();
    await db.collection('user_tenants').doc(req.params.id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 9. GET TENANT INVESTORS
router.get('/:id/investors', verifyAuthToken, async (req, res) => {
  try {
    const tenantId = req.params.id;
    const db = admin.firestore();
    
    // Get all orders for this tenant
    const ordersSnap = await db.collection('orders').where('tenantId', '==', tenantId).get();
    const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Group by buyerId
    const investorsMap = {};
    for (const order of orders) {
       const buyerId = order.buyerId;
       if (!buyerId) continue;
       if (!investorsMap[buyerId]) {
         investorsMap[buyerId] = {
           id: buyerId,
           orders: [],
           totalInvested: 0,
           totalTokens: 0,
           latestInvestment: null
         };
       }
       investorsMap[buyerId].orders.push(order);
       investorsMap[buyerId].totalInvested += Number(order.totalPrice || 0);
       investorsMap[buyerId].totalTokens += Number(order.quantity || 0);
       
       const orderTime = order.createdAt?._seconds || 0;
       if (!investorsMap[buyerId].latestInvestment || orderTime > investorsMap[buyerId].latestInvestment) {
           investorsMap[buyerId].latestInvestment = orderTime;
       }
    }
    
    // Fetch user details
    const investors = await Promise.all(Object.values(investorsMap).map(async (inv) => {
       const userSnap = await db.collection('tenant_users').doc(inv.id).get();
       const userData = userSnap.exists ? userSnap.data() : {};
       return {
          ...inv,
          name: userData.name || 'Unknown Investor',
          email: userData.email || 'No Email provided'
       };
    }));
    
    investors.sort((a,b) => b.latestInvestment - a.latestInvestment);
    
    res.status(200).json(investors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
