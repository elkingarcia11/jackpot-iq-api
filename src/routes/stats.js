const express = require('express');
const router = express.Router();
const { verifyToken, validateLotteryType } = require('../middleware/auth');
const dataService = require('../services/dataService');

// Get lottery statistics
router.get('/', verifyToken, validateLotteryType, async (req, res) => {
  try {
    const { type } = req.query;
    
    // Get statistics from local JSON file
    const stats = await dataService.getStatistics(type);
    
    if (!stats || !stats.frequency) {
      return res.status(404).json({ error: 'Statistics not found' });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error retrieving statistics:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

module.exports = router; 