const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const verifyAuthToken = require('../middleware/authMiddleware');

/**
 * POST /api/users/profile
 * Gets the profile for the authenticated user, or creates one if it doesn't exist.
 */
router.post('/profile', verifyAuthToken, async (req, res) => {
  try {
    const { name } = req.body;
    const uid = req.user.uid;
    const email = req.user.email;
    const db = admin.firestore();

    const userRef = db.collection('tenant_users').doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      return res.status(200).json(userSnap.data());
    }

    const newProfile = {
      id: uid,
      name: name || req.user.name || '',
      email: email || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await userRef.set(newProfile);
    
    // Convert serverTimestamp to Date object string since client expects some value
    const responseProfile = { ...newProfile, createdAt: new Date() };

    res.status(201).json(responseProfile);
  } catch (error) {
    console.error("Error in POST /api/users/profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/users/:userId
 * Fetches a user profile by ID.
 */
router.get('/:userId', verifyAuthToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userRef = db.collection('tenant_users').doc(req.params.userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(userSnap.data());
  } catch (error) {
    console.error("Error in GET /api/users/:userId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
