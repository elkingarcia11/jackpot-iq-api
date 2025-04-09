const express = require('express');
const router = express.Router();
const { verifyToken, validateLotteryType } = require('../middleware/auth');
const dataService = require('../services/dataService');
const { getCacheDuration, getETag } = require('../utils/timeUtils');

// Helper function to set cache headers based on time of day
const setCacheHeaders = (res, defaultMaxAge = 300, contentType = 'stats') => {
  // Get appropriate cache duration based on time of day and content type
  const maxAge = getCacheDuration(contentType, defaultMaxAge);
  
  // Set cache headers with the computed max age
  res.set('Cache-Control', `public, max-age=${maxAge}`);
  res.set('Surrogate-Control', `max-age=${maxAge}`);
  
  // Add Vary header to ensure CDNs respect user-specific data
  res.set('Vary', 'Authorization');
  
  // Set ETag based on time of day
  res.set('ETag', getETag());
};

// Get lottery statistics
router.get('/', verifyToken, validateLotteryType, async (req, res) => {
  try {
    const { type } = req.query;
    
    // Get statistics from local JSON file
    const stats = await dataService.getStatistics(type);
    
    if (!stats || !stats.frequency) {
      return res.status(404).json({ error: 'Statistics not found' });
    }
    
    // Set cache headers - stats can be cached longer, 1 hour default
    setCacheHeaders(res, 60 * 60, 'stats');
    
    res.json(stats);
  } catch (error) {
    console.error('Error retrieving statistics:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

module.exports = router; 