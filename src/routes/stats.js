const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { verifyToken, validateLotteryType } = require('../middleware/auth');

const db = getFirestore();

// Get stats for a specific lottery type
router.get('/:type', verifyToken, validateLotteryType, async (req, res) => {
  const { type } = req.params;

  try {
    const statsRef = db.collection('stats').doc(type);
    const statsDoc = await statsRef.get();

    if (!statsDoc.exists) {
      return res.status(404).json({ error: 'Stats not found' });
    }

    const stats = statsDoc.data();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router; 