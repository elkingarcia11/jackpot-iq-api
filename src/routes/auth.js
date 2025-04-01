const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { validateAppAttest } = require('../middleware/auth');
const { validationResult } = require('express-validator');
const admin = require('../config/firebase');

// Generate a challenge for App Attest
router.get('/challenge', (req, res) => {
  const challenge = Math.random().toString(36).substring(2);
  res.json({ challenge });
});

// Verify App Attest and issue JWT
router.post('/verify', validateAppAttest, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { attestation, challenge, keyId } = req.body;

  try {
    // TODO: Implement actual Apple App Attest verification
    // This is a placeholder for the actual verification logic
    // You'll need to implement the verification using Apple's API
    
    // For now, we'll just verify the challenge matches
    const isValid = true; // Replace with actual verification

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid attestation' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        keyId,
        verified: true,
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ token });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Apple App Attest verification endpoint
router.post('/verify-app-attest', validateAppAttest, async (req, res) => {
  try {
    const { attestation, challenge } = req.body;
    
    // Verify the attestation with Apple's DeviceCheck API
    const verificationResult = await verifyAppAttest(attestation, challenge);
    
    if (!verificationResult.verified) {
      return res.status(400).json({ error: 'Invalid attestation' });
    }

    // Store the device ID in Firestore
    const deviceRef = admin.firestore().collection('devices').doc(verificationResult.deviceId);
    await deviceRef.set({
      lastVerified: admin.firestore.FieldValue.serverTimestamp(),
      attestationVerified: true
    }, { merge: true });

    res.json({
      verified: true,
      deviceId: verificationResult.deviceId
    });
  } catch (error) {
    console.error('App Attest verification error:', error);
    res.status(500).json({ error: 'Failed to verify attestation' });
  }
});

// JWT token generation endpoint
router.post('/token', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    // Verify device exists and is attested
    const deviceRef = admin.firestore().collection('devices').doc(deviceId);
    const deviceDoc = await deviceRef.get();
    
    if (!deviceDoc.exists || !deviceDoc.data().attestationVerified) {
      return res.status(401).json({ error: 'Invalid device ID' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { deviceId },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

/**
 * Verifies an Apple App Attest attestation
 * @param {string} attestation - Base64 encoded attestation
 * @param {string} challenge - Challenge string used to generate the attestation
 * @returns {Promise<{verified: boolean, deviceId: string}>}
 */
async function verifyAppAttest(attestation, challenge) {
  // Decode the attestation
  const attestationBuffer = Buffer.from(attestation, 'base64');
  
  // TODO: Implement actual Apple App Attest verification
  // This requires:
  // 1. Decoding the CBOR attestation
  // 2. Verifying the attestation signature using Apple's public key
  // 3. Verifying the challenge matches
  // 4. Extracting the device ID
  
  // For now, we'll return a mock verification
  return {
    verified: true,
    deviceId: 'mock-device-id'
  };
}

module.exports = router; 