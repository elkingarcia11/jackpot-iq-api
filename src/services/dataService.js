const fs = require('fs').promises;
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { isInUpdateWindow, getCacheDuration, getSecondsUntilNextUpdate } = require('../utils/timeUtils');

class DataService {
  constructor() {
    this.localDataDir = path.join(process.cwd(), 'data');
    this.lotteryTypes = ['mega-millions', 'powerball'];
    this.fileMap = {
      'mega-millions': 'mm.json',
      'powerball': 'pb.json',
      'mega-millions-stats': 'mm-stats.json',
      'powerball-stats': 'pb-stats.json'
    };
    
    // Google Cloud Storage configuration
    this.useGCS = process.env.USE_GCS === 'true';
    this.gcsBucket = process.env.GCS_BUCKET || 'jackpot-iq';
    
    // In GCS, the files should be in the data/ directory
    this.gcsDataPrefix = process.env.GCS_DATA_PREFIX || 'data/';
    
    // Initialize GCS client if enabled
    if (this.useGCS) {
      try {
        this.storage = new Storage();
        this.bucket = this.storage.bucket(this.gcsBucket);
        console.log(`GCS initialized with bucket: ${this.gcsBucket}`);
      } catch (error) {
        console.error('Error initializing Google Cloud Storage:', error);
        // Fallback to local storage if GCS fails
        this.useGCS = false;
      }
    }
    
    // Memory cache for GCS data with TTL
    this.memoryCache = {};
    
    // Update cache TTL based on time of day
    // Since all data except random numbers only changes once a day during the update window,
    // we can use extremely aggressive caching outside that window
    this.updateCacheTTL();
    
    // Set up cache refresh schedule
    this.setupCacheRefreshSchedule();
    
    // Track whether we're in the update window
    this.isInUpdateWindow = isInUpdateWindow();
  }
  
  /**
   * Update cache TTL based on time of day
   */
  updateCacheTTL() {
    if (isInUpdateWindow()) {
      // Short TTL during update window
      this.cacheTTL = 60 * 1000; // 1 minute
    } else {
      // Outside update window, cache until shortly before the next update
      // Convert seconds to milliseconds and subtract a safety margin
      const safetyMarginMs = 5 * 60 * 1000; // 5 minutes
      this.cacheTTL = (getSecondsUntilNextUpdate() * 1000) - safetyMarginMs;
      
      // Ensure TTL is at least 1 minute
      this.cacheTTL = Math.max(this.cacheTTL, 60 * 1000);
    }
    
    console.log(`Cache TTL set to ${this.cacheTTL/60000} minutes (${isInUpdateWindow() ? 'in update window' : 'until next update window'})`);
    
    return isInUpdateWindow();
  }
  
  /**
   * Set up cache refresh schedule
   * Checks every 5 minutes if we're in/out of the update window
   * and adjusts TTL accordingly
   */
  setupCacheRefreshSchedule() {
    // Schedule cache TTL update every 5 minutes
    setInterval(() => {
      const wasInUpdateWindow = this.isInUpdateWindow;
      this.isInUpdateWindow = isInUpdateWindow();
      this.updateCacheTTL();
      
      // If we just entered the update window, clear the entire cache
      if (!wasInUpdateWindow && this.isInUpdateWindow) {
        console.log('Entering update window, clearing entire cache');
        this.memoryCache = {};
      }
      // If we just exited the update window, proactively refresh cache
      else if (wasInUpdateWindow && !this.isInUpdateWindow) {
        console.log('Exiting update window, proactively refreshing cache');
        this.refreshAllCacheData();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
  
  /**
   * Proactively refresh all cache data after update window
   */
  async refreshAllCacheData() {
    try {
      const typesToRefresh = [...this.lotteryTypes];
      
      // Add stats files
      for (const type of this.lotteryTypes) {
        typesToRefresh.push(`${type}-stats`);
      }
      
      console.log(`Proactively refreshing cache for: ${typesToRefresh.join(', ')}`);
      
      // Fetch all data in parallel without using cache
      const promises = typesToRefresh.map(type => this.fetchFreshData(type));
      await Promise.all(promises);
      
      console.log('Cache refresh completed');
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  }
  
  /**
   * Fetch fresh data without using cache
   * @param {string} type - The type of file
   * @returns {Promise<Object|Array>} The fresh data
   */
  async fetchFreshData(type) {
    try {
      let data;
      if (this.useGCS) {
        data = await this.readDataFromGCS(type, { skipCache: true });
      } else {
        data = await this.readDataFromLocal(type);
      }
      
      // Store in memory cache with a fresh timestamp
      this.storeInCache(type, data);
      
      return data;
    } catch (error) {
      console.error(`Error fetching fresh data (${type}):`, error);
      throw error;
    }
  }

  /**
   * Get cached data if available and not expired
   * @param {string} type - The type of file
   * @returns {Object|Array|null} The cached data or null if not in cache or expired
   */
  getCachedData(type) {
    const cacheEntry = this.memoryCache[type];
    if (!cacheEntry) return null;
    
    const now = Date.now();
    if (now - cacheEntry.timestamp > this.cacheTTL) {
      // Cache expired
      delete this.memoryCache[type];
      return null;
    }
    
    return cacheEntry.data;
  }

  /**
   * Store data in memory cache
   * @param {string} type - The type of file
   * @param {Object|Array} data - The data to cache
   */
  storeInCache(type, data) {
    this.memoryCache[type] = {
      data: data,
      timestamp: Date.now()
    };
  }

  /**
   * Ensure the data directory exists
   * @returns {Promise<void>}
   */
  async ensureDataDir() {
    try {
      await fs.access(this.localDataDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.localDataDir, { recursive: true });
    }
  }

  /**
   * Get the path to a JSON file (local version)
   * @param {string} type - The type of file to get
   * @returns {string} The full path to the file
   */
  getLocalFilePath(type) {
    const fileName = this.fileMap[type] || `${type}.json`;
    return path.join(this.localDataDir, fileName);
  }

  /**
   * Get the GCS path to a JSON file
   * @param {string} type - The type of file to get
   * @returns {string} The path to the file in GCS
   */
  getGCSFilePath(type) {
    const fileName = this.fileMap[type] || `${type}.json`;
    // Always return paths with the data/ prefix
    return `${this.gcsDataPrefix}${fileName}`;
  }

  /**
   * Read data from a JSON file (either local or GCS)
   * @param {string} type - The type of file to read
   * @param {Object} options - Options for reading data
   * @returns {Promise<Object|Array>} The data from the file
   */
  async readData(type, options = {}) {
    try {
      // Check memory cache first unless skipCache is true
      if (!options.skipCache) {
        const cachedData = this.getCachedData(type);
        if (cachedData) {
          console.log(`Using cached data for: ${type}`);
          return cachedData;
        }
      }
      
      let data;
      if (this.useGCS) {
        data = await this.readDataFromGCS(type, options);
      } else {
        data = await this.readDataFromLocal(type);
      }

      // Store in memory cache
      this.storeInCache(type, data);
      
      return data;
    } catch (error) {
      console.error(`Error reading data (${type}):`, error);
      // Return empty data structure based on expected type
      return this.lotteryTypes.includes(type) ? [] : {};
    }
  }

  /**
   * Read data from a local JSON file
   * @param {string} type - The type of file to read
   * @returns {Promise<Object|Array>} The data from the file
   */
  async readDataFromLocal(type) {
    try {
      const filePath = this.getLocalFilePath(type);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty based on expected type
        return this.lotteryTypes.includes(type) ? [] : {};
      }
      throw error;
    }
  }

  /**
   * Read data from Google Cloud Storage
   * @param {string} type - The type of file to read
   * @param {Object} options - Options for reading data
   * @returns {Promise<Object|Array>} The data from the file
   */
  async readDataFromGCS(type, options = {}) {
    try {
      const filePath = this.getGCSFilePath(type);
      console.log(`Reading from GCS: ${filePath}`);
      
      const file = this.bucket.file(filePath);
      
      // Only check if file exists when we're not in the normal read flow
      // to reduce API calls, since most files we request should exist
      if (options.checkExists) {
        const exists = await file.exists();
        if (!exists[0]) {
          console.log(`File does not exist in GCS: ${filePath}`);
          // File doesn't exist, return empty based on expected type
          return this.lotteryTypes.includes(type) ? [] : {};
        }
      }
      
      // Get file metadata to check last modified time
      if (!options.skipCache && !this.updateCacheTTL()) {
        try {
          const [metadata] = await file.getMetadata();
          const lastModified = new Date(metadata.updated);
          
          // Check if file was modified recently (in the last day)
          const now = new Date();
          const oneDayAgo = new Date(now);
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          
          if (lastModified < oneDayAgo) {
            console.log(`File hasn't been modified in the last 24 hours, using extended cache: ${filePath}`);
            // Extend cache TTL for this file
            options.extendedCacheTTL = true;
          }
        } catch (error) {
          console.warn(`Couldn't get metadata for ${filePath}, proceeding with normal download:`, error);
        }
      }
      
      // Set download options with cache control headers
      const downloadOptions = {
        validation: false // Skip MD5 checksum validation for better performance
      };
      
      const [content] = await file.download(downloadOptions);
      const data = content.toString('utf8');
      
      // Cache data locally for fallback
      await this.cacheDataLocally(type, data);
      
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading from GCS (${type}):`, error);
      
      // Try to fallback to local cache
      console.log('Attempting to use local cache as fallback');
      return await this.readDataFromLocal(type);
    }
  }

  /**
   * Cache data from GCS locally
   * @param {string} type - The type of file
   * @param {string} data - The JSON data as string
   * @returns {Promise<void>}
   */
  async cacheDataLocally(type, data) {
    try {
      await this.ensureDataDir();
      const filePath = this.getLocalFilePath(type);
      await fs.writeFile(filePath, data, 'utf8');
      console.log(`Cached GCS data locally: ${filePath}`);
    } catch (error) {
      console.error(`Error caching data locally (${type}):`, error);
    }
  }

  /**
   * Write data to a JSON file (either local or GCS)
   * @param {string} type - The type of file to write
   * @param {Object|Array} data - The data to write
   * @returns {Promise<void>}
   */
  async writeData(type, data) {
    // Only allow writing to verified-devices.json
    if (type !== 'verified-devices' && this.lotteryTypes.includes(type) || type.endsWith('-stats')) {
      console.error(`Cannot write to read-only file: ${type}`);
      throw new Error(`Cannot write to read-only file: ${type}`);
    }
    
    const jsonData = JSON.stringify(data, null, 2);
    
    try {
      // Always write locally as a backup
      await this.writeDataToLocal(type, jsonData);
      
      // Write to GCS if enabled
      if (this.useGCS) {
        await this.writeDataToGCS(type, jsonData);
      }
    } catch (error) {
      console.error(`Error writing data (${type}):`, error);
      throw error;
    }
  }

  /**
   * Write data to a local JSON file
   * @param {string} type - The type of file to write
   * @param {string} jsonData - The stringified JSON data
   * @returns {Promise<void>}
   */
  async writeDataToLocal(type, jsonData) {
    await this.ensureDataDir();
    const filePath = this.getLocalFilePath(type);
    await fs.writeFile(filePath, jsonData, 'utf8');
  }

  /**
   * Write data to Google Cloud Storage
   * @param {string} type - The type of file to write
   * @param {string} jsonData - The stringified JSON data
   * @returns {Promise<void>}
   */
  async writeDataToGCS(type, jsonData) {
    try {
      const filePath = this.getGCSFilePath(type);
      console.log(`Writing to GCS: ${filePath}`);
      
      const file = this.bucket.file(filePath);
      
      // Calculate cache control based on file type
      const contentType = type.endsWith('-stats') ? 'stats' : 'data';
      const maxAge = getCacheDuration(contentType); // in seconds
      const cacheControl = `public, max-age=${maxAge}`;
      
      await file.save(jsonData, {
        contentType: 'application/json',
        metadata: {
          cacheControl: cacheControl
        }
      });
      
      // Update memory cache after successful write
      this.storeInCache(type, JSON.parse(jsonData));
      
      console.log(`Successfully wrote to GCS: ${filePath}`);
    } catch (error) {
      console.error(`Error writing to GCS (${type}):`, error);
      throw error;
    }
  }

  /**
   * Get lottery draws
   * @param {string} type - The lottery type
   * @param {number} limit - The maximum number of draws to return
   * @param {number} offset - The number of draws to skip
   * @returns {Promise<Array>} The lottery draws
   */
  async getLotteryDraws(type, limit = 10, offset = 0) {
    try {
      if (!this.lotteryTypes.includes(type)) {
        throw new Error(`Invalid lottery type: ${type}`);
      }

      // Read draws from the configured storage (GCS or local)
      const draws = await this.readData(type);
      
      // If there are no draws, return empty array
      if (!Array.isArray(draws) || draws.length === 0) {
        return [];
      }

      // No need to sort, data is already in descending order by date
      // Just apply pagination
      return draws.slice(offset, offset + limit);
    } catch (error) {
      console.error(`Error getting lottery draws: ${error.message}`);
      return [];
    }
  }

  /**
   * Search lottery draws by numbers and/or special ball
   * @param {string} type - The lottery type
   * @param {Array<number>} numbers - The numbers to search for
   * @param {number} specialBall - The special ball to search for
   * @returns {Promise<Array>} The matching lottery draws
   */
  async searchLotteryDraws(type, numbers = [], specialBall = null) {
    try {
      if (!this.lotteryTypes.includes(type)) {
        throw new Error(`Invalid lottery type: ${type}`);
      }

      // Read draws from the configured storage (GCS or local)
      const draws = await this.readData(type);
      
      // If there are no draws, return empty array
      if (!Array.isArray(draws) || draws.length === 0) {
        return [];
      }

      let results = draws;

      // Filter by special ball first if provided
      if (specialBall !== null) {
        results = results.filter(draw => draw.specialBall === specialBall);
      }

      // Then filter by numbers if provided
      if (numbers.length > 0) {
        results = results.filter(draw => {
          return numbers.every(num => draw.numbers.includes(num));
        });
      }

      // Data is already sorted, return filtered results
      return results;
    } catch (error) {
      console.error(`Error searching lottery draws: ${error.message}`);
      return [];
    }
  }

  /**
   * Get lottery statistics
   * @param {string} type - The lottery type
   * @returns {Promise<Object>} The lottery statistics
   */
  async getStatistics(type) {
    try {
      if (!this.lotteryTypes.includes(type)) {
        throw new Error(`Invalid lottery type: ${type}`);
      }

      // Read stats from the configured storage (GCS or local)
      return await this.readData(`${type}-stats`);
    } catch (error) {
      console.error(`Error getting lottery statistics: ${error.message}`);
      return {
        type,
        totalDraws: 0,
        frequency: {},
        frequencyAtPosition: {},
        specialBallFrequency: {}
      };
    }
  }

  /**
   * Add a lottery draw
   * @param {string} type - The lottery type
   * @param {Object} draw - The draw data
   * @returns {Promise<boolean>} Whether the operation was successful
   * @deprecated Lottery data files are read-only
   */
  async addLotteryDraw(type, draw) {
    console.warn('addLotteryDraw is deprecated. Lottery data files are read-only.');
    return false;
    
    // The code below is kept for reference but will not be executed
    /* 
    try {
      if (!this.lotteryTypes.includes(type)) {
        throw new Error(`Invalid lottery type: ${type}`);
      }

      // Validate the draw data
      if (!draw.date || !draw.numbers || !draw.specialBall) {
        throw new Error('Invalid draw data');
      }

      const draws = await this.readData(type);
      
      // Initialize entries if they don't exist
      if (!draws.entries) {
        draws.entries = {};
      }

      // Add the new draw using date as ID
      const drawId = new Date(draw.date).toISOString().split('T')[0]; // YYYY-MM-DD
      draws.entries[drawId] = {
        ...draw,
        date: new Date(draw.date).toISOString()
      };

      // Save the updated draws
      await this.writeData(type, draws);
      
      return true;
    } catch (error) {
      console.error(`Error adding lottery draw: ${error.message}`);
      return false;
    }
    */
  }

  /**
   * Store verified device
   * @param {string} deviceId - The verified device ID
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async storeVerifiedDevice(deviceId) {
    try {
      // Create a verified-devices.json file if it doesn't exist
      let devices = {};
      try {
        devices = await this.readData('verified-devices');
      } catch (error) {
        // If file doesn't exist, we'll create a new one
      }
      
      // Add the device if it doesn't exist
      devices[deviceId] = {
        verifiedAt: new Date().toISOString(),
        attestationVerified: true
      };

      await this.writeData('verified-devices', devices);
      return true;
    } catch (error) {
      console.error(`Error storing verified device: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify device ID exists and is verified
   * @param {string} deviceId - The device ID to verify
   * @returns {Promise<boolean>} Whether the device is verified
   */
  async isDeviceVerified(deviceId) {
    try {
      const devices = await this.readData('verified-devices');
      return devices[deviceId]?.attestationVerified === true;
    } catch (error) {
      console.error(`Error verifying device: ${error.message}`);
      return false;
    }
  }

  /**
   * Fetch multiple files from GCS in parallel
   * @param {Array<string>} types - Array of file types to fetch
   * @returns {Promise<Object>} Object with file types as keys and data as values
   */
  async fetchMultipleFiles(types) {
    if (!Array.isArray(types) || types.length === 0) {
      return {};
    }
    
    // First check cache for all requested types
    const result = {};
    const typesToFetch = [];
    
    for (const type of types) {
      const cachedData = this.getCachedData(type);
      if (cachedData) {
        console.log(`Using cached data for: ${type}`);
        result[type] = cachedData;
      } else {
        typesToFetch.push(type);
      }
    }
    
    // Fetch remaining types in parallel
    if (typesToFetch.length > 0) {
      const promises = typesToFetch.map(type => this.readData(type));
      const dataResults = await Promise.all(promises);
      
      typesToFetch.forEach((type, index) => {
        result[type] = dataResults[index];
      });
    }
    
    return result;
  }
}

module.exports = new DataService(); 