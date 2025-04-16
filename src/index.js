require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
const dataService = require('./services/dataService');
const { getCacheDuration, getETag } = require('./utils/timeUtils');

// Verify data directory and files exist
const verifyDataFiles = async () => {
  try {
    // Check if required files exist in GCS
    const lotteryTypes = ['mega-millions', 'powerball'];
    const filesToCheck = [];
    
    for (const type of lotteryTypes) {
      // Add main data files
      filesToCheck.push(type);
      filesToCheck.push(`${type}-stats`);
    }
    
    // Check if the files exist in GCS
    for (const file of filesToCheck) {
      try {
        const filePath = dataService.getGCSFilePath(file);
        const exists = await dataService.bucket.file(filePath).exists();
        if (exists[0]) {
          console.log(`Found GCS file: ${filePath}`);
        }
      } catch (error) {
        console.warn(`Warning: File ${file} not found in GCS`);
      }
    }
    
    // Check or create verified devices file
    try {
      const devicesPath = dataService.getGCSFilePath('verified-devices');
      const exists = await dataService.bucket.file(devicesPath).exists();
      if (exists[0]) {
        console.log('Found verified-devices.json in GCS');
      } else {
        // Create empty verified devices file if it doesn't exist
        await dataService.writeData('verified-devices', {});
        console.log('Created empty verified-devices.json in GCS');
      }
    } catch (error) {
      console.error('Error checking verified-devices.json:', error);
    }
    
    console.log('GCS files check completed');
  } catch (error) {
    console.error('Error checking GCS files:', error);
  }
};

// Initialize the application
const app = express();

// Trust proxy for correct IP detection when behind a proxy
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Use appropriate morgan logging format based on environment
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // More detailed logs for production
} else {
  app.use(morgan('dev')); // Concise colored logs for development
}

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

// Global default cache control for static resources
app.use((req, res, next) => {
  // Skip for dynamic API endpoints that set their own cache headers
  if (!req.path.startsWith('/api/')) {
    // Get appropriate cache duration for static content
    const maxAge = getCacheDuration('static');
    
    // Set cache headers
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    
    // Add an appropriate ETag
    res.set('ETag', getETag());
  }
  next();
});

// Routes
const lotteryRoutes = require('./routes/lottery');
const statsRoutes = require('./routes/stats');
const authRoutes = require('./routes/auth');

app.use('/api/lottery', lotteryRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    name: 'Jackpot IQ API',
    description: 'API for lottery data and statistics',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error'
  });
});

const PORT = 3000;

// Check data files before starting the server
verifyDataFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to verify data files:', error);
  process.exit(1);
}); 