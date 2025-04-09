const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { validateLotteryType, verifyToken } = require('../middleware/auth');
const dataService = require('../services/dataService');
const { getCacheDuration, getETag } = require('../utils/timeUtils');

// Helper function to set cache headers based on time of day
const setCacheHeaders = (res, defaultMaxAge = 300, contentType = 'data') => {
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

// Get latest lottery draws
router.get('/', 
  verifyToken,
  validateLotteryType,
  async (req, res) => {
    try {
      const { type } = req.query;
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;

      // Retrieve draws from JSON files
      const draws = await dataService.getLotteryDraws(type, limit, offset);
      
      // Set cache headers - use 10 minutes as the default for this endpoint
      setCacheHeaders(res, 10 * 60, 'data');

      res.json(draws);
    } catch (error) {
      console.error('Error retrieving lottery draws:', error);
      res.status(500).json({ error: 'Failed to retrieve lottery draws' });
    }
  });

// Search for lottery draws by numbers and/or specialBall
router.get('/search',
  verifyToken,
  validateLotteryType,
  [
    query('numbers').optional().isString(),
    query('specialBall').optional().isInt({ min: 1 }).toInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { type } = req.query;
      const numbersParam = req.query.numbers;
      const specialBall = req.query.specialBall || null;

      // Parse numbers from comma-separated string, filter out non-numbers
      const numbers = numbersParam ? 
        numbersParam.split(',')
          .map(n => parseInt(n.trim()))
          .filter(n => !isNaN(n)) : [];

      // Search for draws matching the criteria
      const results = await dataService.searchLotteryDraws(type, numbers, specialBall);
      
      // Search results can be cached longer - use 20 minutes as default
      setCacheHeaders(res, 20 * 60, 'data');

      res.json(results);
    } catch (error) {
      console.error('Error searching lottery draws:', error);
      res.status(500).json({ error: 'Failed to search lottery draws' });
    }
  });

// Generate random numbers
router.get('/generate-random',
  verifyToken,
  validateLotteryType,
  async (req, res) => {
    try {
      const { type } = req.query;
      const maxNumber = type === 'mega-millions' ? 70 : 69;
      const maxSpecialBall = type === 'mega-millions' ? 25 : 26;
      
      // Generate 5 unique random numbers between 1 and max
      const numbers = [];
      while (numbers.length < 5) {
        const randomNum = Math.floor(Math.random() * maxNumber) + 1;
        if (!numbers.includes(randomNum)) {
          numbers.push(randomNum);
        }
      }
      
      // Sort the numbers
      numbers.sort((a, b) => a - b);
      
      // Generate 1 random special ball
      const specialBall = Math.floor(Math.random() * maxSpecialBall) + 1;
      
      res.json({
        type,
        numbers,
        specialBall
      });
    } catch (error) {
      console.error('Error generating random numbers:', error);
      res.status(500).json({ error: 'Failed to generate random numbers' });
    }
});

module.exports = router; 