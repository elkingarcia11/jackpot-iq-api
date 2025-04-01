const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const { verifyToken, validateLotteryType } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

const db = getFirestore();

// Validation middleware
const validateSearch = [
  body('type').isIn(['megamillion', 'powerball']),
  body('numbers').isArray().withMessage('Numbers must be an array'),
  body('numbers.*').custom((value, { req }) => {
    const maxNumber = req.body.type === 'megamillion' ? 70 : 69;
    if (value < 1 || value > maxNumber) {
      throw new Error(`Numbers must be between 1 and ${maxNumber}`);
    }
    return true;
  }),
  body('specialBall').optional().custom((value, { req }) => {
    const maxSpecialBall = req.body.type === 'megamillion' ? 25 : 26;
    if (value < 1 || value > maxSpecialBall) {
      throw new Error(`Special ball must be between 1 and ${maxSpecialBall}`);
    }
    return true;
  })
];

const validatePagination = [
  query('offset').optional().isInt({ min: 0 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

// Get latest lottery draws
router.get('/', verifyToken, validateLotteryType, validatePagination, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { type } = req.query;
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const drawsRef = db.collection('lotteryDraws');
    const snapshot = await drawsRef
      .where('type', '==', type)
      .limit(limit)
      .offset(offset)
      .get();

    const draws = [];
    snapshot.forEach(doc => {
      draws.push({ id: doc.id, ...doc.data() });
    });

    res.json(draws);
  } catch (error) {
    console.error('Error fetching draws:', error);
    res.status(500).json({ error: 'Failed to fetch draws' });
  }
});

// Search for specific lottery draw
router.post('/search', verifyToken, validateSearch, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { type, numbers, specialBall } = req.body;

  try {
    const drawsRef = db.collection('lotteryDraws');
    let query = drawsRef.where('type', '==', type);

    // If special ball is provided, filter by it first for better performance
    if (specialBall) {
      query = query.where('specialBall', '==', specialBall);
    }

    const snapshot = await query.get();
    const matchingDraws = [];

    // Check numbers against the filtered results
    snapshot.forEach(doc => {
      const drawData = doc.data();
      if (JSON.stringify(drawData.numbers) === JSON.stringify(numbers)) {
        matchingDraws.push({ id: doc.id, ...drawData });
      }
    });

    res.json(matchingDraws);
  } catch (error) {
    console.error('Error searching draws:', error);
    res.status(500).json({ error: 'Failed to search draws' });
  }
});

// Generate random numbers
router.get('/generate-random', verifyToken, validateLotteryType, async (req, res) => {
  const { type } = req.query;
  const maxNumber = type === 'megamillion' ? 70 : 69;
  const maxSpecialBall = type === 'megamillion' ? 25 : 26;

  try {
    const drawsRef = db.collection('lotteryDraws');
    const snapshot = await drawsRef
      .where('type', '==', type)
      .get();

    const existingDraws = new Set();
    snapshot.forEach(doc => {
      existingDraws.add(doc.data().numbers.join(','));
    });

    let newDraw;
    do {
      const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * maxNumber) + 1);
      numbers.sort((a, b) => a - b);
      const specialBall = Math.floor(Math.random() * maxSpecialBall) + 1;
      newDraw = { numbers, specialBall };
    } while (existingDraws.has(newDraw.numbers.join(',')));

    res.json(newDraw);
  } catch (error) {
    console.error('Error generating random numbers:', error);
    res.status(500).json({ error: 'Failed to generate numbers' });
  }
});

// Generate optimized numbers
router.get('/generate-optimized', verifyToken, validateLotteryType, async (req, res) => {
  const { type } = req.query;

  try {
    const statsRef = db.collection('stats').doc(type);
    const statsDoc = await statsRef.get();
    const stats = statsDoc.data();

    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }

    const { frequencyAtPosition, specialBallFrequency } = stats;
    const existingDraws = new Set();

    // Get existing draws
    const drawsRef = db.collection('lotteryDraws');
    const snapshot = await drawsRef
      .where('type', '==', type)
      .get();

    snapshot.forEach(doc => {
      existingDraws.add(doc.data().numbers.join(','));
    });

    // Generate optimized numbers
    let newDraw;
    do {
      const numbers = [];
      for (let i = 0; i < 5; i++) {
        const positionFreq = frequencyAtPosition[i];
        const candidates = Object.entries(positionFreq)
          .map(([num, freq]) => ({ num: parseInt(num), freq }))
          .sort((a, b) => b.freq - a.freq);

        // Select from top 5 most frequent numbers for this position
        const topCandidates = candidates.slice(0, 5);
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)].num;
        numbers.push(selected);
      }
      numbers.sort((a, b) => a - b);

      // Select special ball based on frequency
      const specialBallCandidates = Object.entries(specialBallFrequency)
        .map(([num, freq]) => ({ num: parseInt(num), freq }))
        .sort((a, b) => b.freq - a.freq);
      const specialBall = specialBallCandidates[Math.floor(Math.random() * Math.min(5, specialBallCandidates.length))].num;

      newDraw = { numbers, specialBall };
    } while (existingDraws.has(newDraw.numbers.join(',')));

    res.json(newDraw);
  } catch (error) {
    console.error('Error generating optimized numbers:', error);
    res.status(500).json({ error: 'Failed to generate optimized numbers' });
  }
});

module.exports = router; 