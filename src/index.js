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

// Verify data directory and files exist
const verifyDataFiles = async () => {
  try {
    await dataService.ensureDataDir();
    
    // Check if required files exist
    const lotteryTypes = ['mega-millions', 'powerball'];
    const filesToCheck = [];
    
    for (const type of lotteryTypes) {
      // Add main data files
      filesToCheck.push(type);
      filesToCheck.push(`${type}-stats`);
    }
    
    // Check if the files exist
    for (const file of filesToCheck) {
      try {
        const filePath = dataService.getFilePath(file);
        await fs.access(filePath);
        console.log(`Found data file: ${path.basename(filePath)}`);
      } catch (error) {
        console.warn(`Warning: Data file ${file} not found in data directory`);
      }
    }
    
    // Check or create verified devices file
    try {
      const devicesPath = dataService.getFilePath('verified-devices');
      await fs.access(devicesPath);
      console.log('Found verified-devices.json file');
    } catch (error) {
      // Create empty verified devices file if it doesn't exist
      await dataService.writeData('verified-devices', {});
      console.log('Created empty verified-devices.json file');
    }
    
    console.log('Data files check completed');
  } catch (error) {
    console.error('Error checking data files:', error);
  }
};

// Initialize the application
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

// Routes
const lotteryRoutes = require('./routes/lottery');
const statsRoutes = require('./routes/stats');
const authRoutes = require('./routes/auth');

app.use('/api/lottery', lotteryRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 3000;

// Check data files before starting the server
verifyDataFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to verify data files:', error);
  process.exit(1);
}); 