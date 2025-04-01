/**
 * Authentication middleware for the lottery API
 * Handles Apple App Attest validation, JWT verification, and lottery type validation
 */

const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

/**
 * Validates the Apple App Attest request body
 * Ensures all required fields are present and properly formatted
 * Used in the /api/auth/verify endpoint
 */
const validateAppAttest = [
  body('attestation').isString().notEmpty(),
  body('challenge').isString().notEmpty(),
  body('keyId').isString().notEmpty(),
];

/**
 * Middleware to verify JWT tokens in request headers
 * Extracts token from Authorization header and verifies it using JWT_SECRET
 * Adds decoded user information to the request object
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} 401 response if token is missing or invalid
 */
const verifyToken = (req, res, next) => {
  // Extract token from Authorization header (format: "Bearer <token>")
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Add decoded user information to request object
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to validate lottery type parameter
 * Ensures the lottery type is either 'megamillion' or 'powerball'
 * Checks type in params, query, or body
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} 400 response if lottery type is invalid
 */
const validateLotteryType = (req, res, next) => {
  const validTypes = ['megamillion', 'powerball'];
  // Check type in params, query, or body (in order of precedence)
  const type = req.params.type || req.query.type || req.body.type;

  if (!validTypes.includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid lottery type',
      validTypes 
    });
  }

  next();
};

module.exports = {
  validateAppAttest,
  verifyToken,
  validateLotteryType
}; 