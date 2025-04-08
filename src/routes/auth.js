const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { validateAppAttest } = require('../middleware/auth');
const appAttest = require('../services/appAttest');
const crypto = require('crypto');

// Generate a challenge for App Attest
router.get('/app-attest-challenge', (req, res) => {
  try {
    // Generate a random challenge
    const challenge = crypto.randomBytes(32).toString('base64');
    
    // Return the challenge to the client
    res.json({ challenge });
  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

// App Attest verification endpoint
router.post('/verify-attestation', validateAppAttest, async (req, res) => {
  try {
    const { keyID, attestation, challenge } = req.body;
    
    // Verify the attestation with Apple's DeviceCheck API
    const verificationResult = await appAttest.verifyAttestation(
      Buffer.from(attestation, 'base64'),
      challenge
    );
    
    if (!verificationResult.verified) {
      return res.status(400).json({ error: 'Invalid attestation' });
    }

    // Generate JWT token tied to the device ID and key ID
    const token = jwt.sign(
      { 
        deviceId: verificationResult.deviceId,
        keyId: keyID
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    // Return just the token as expected by the iOS client
    res.json({ token });
  } catch (error) {
    console.error('Attestation verification error:', error);
    res.status(500).json({ error: 'Failed to verify attestation' });
  }
});

module.exports = router;