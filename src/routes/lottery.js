const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { validateLotteryType, verifyToken } = require('../middleware/auth');
const dataService = require('../services/dataService');

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

      res.json(draws);
    } catch (error) {
      console.error('Error retrieving lottery draws:', error);
      res.status(500).json({ error: 'Failed to retrieve lottery draws' });
    }
});

// Search for lottery draws
router.post('/search', 
  verifyToken,
  validateLotteryType,
  [
    body('numbers')
      .optional()
      .isArray()
      .withMessage('Numbers must be an array')
      .custom((numbers, { req }) => {
        const { type } = req.body;
        const maxNumber = type === 'mega-millions' ? 70 : 69;
        
        if (numbers && numbers.length > 0) {
          if (!numbers.every(num => Number.isInteger(num) && num > 0 && num <= maxNumber)) {
            throw new Error(`Numbers must be integers between 1 and ${maxNumber}`);
          }
        }
        return true;
      }),
    body('specialBall')
      .optional()
      .isInt()
      .withMessage('Special ball must be an integer')
      .custom((specialBall, { req }) => {
        const { type } = req.body;
        const maxSpecialBall = type === 'mega-millions' ? 25 : 26;
        
        if (specialBall !== undefined && specialBall !== null) {
          if (!Number.isInteger(specialBall) || specialBall <= 0 || specialBall > maxSpecialBall) {
            throw new Error(`Special ball must be between 1 and ${maxSpecialBall}`);
          }
        }
        return true;
      })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { type, numbers = [], specialBall = null } = req.body;

      // Search in JSON files
      const results = await dataService.searchLotteryDraws(type, numbers, specialBall);

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