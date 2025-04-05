const fs = require('fs').promises;
const path = require('path');

class DataService {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.lotteryTypes = ['mega-millions', 'powerball'];
    this.fileMap = {
      'mega-millions': 'mm.json',
      'powerball': 'pb.json',
      'mega-millions-stats': 'mm-stats.json',
      'powerball-stats': 'pb-stats.json'
    };
  }

  /**
   * Ensure the data directory exists
   * @returns {Promise<void>}
   */
  async ensureDataDir() {
    try {
      await fs.access(this.dataDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get the path to a JSON file
   * @param {string} type - The type of file to get
   * @returns {string} The full path to the file
   */
  getFilePath(type) {
    const fileName = this.fileMap[type] || `${type}.json`;
    return path.join(this.dataDir, fileName);
  }

  /**
   * Read data from a JSON file
   * @param {string} type - The type of file to read
   * @returns {Promise<Object|Array>} The data from the file
   */
  async readData(type) {
    try {
      const filePath = this.getFilePath(type);
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
   * Write data to a JSON file
   * @param {string} type - The type of file to write
   * @param {Object|Array} data - The data to write
   * @returns {Promise<void>}
   */
  async writeData(type, data) {
    await this.ensureDataDir();
    const filePath = this.getFilePath(type);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
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

      // Read draws directly from the existing mm.json or pb.json
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

      // Read draws directly from the existing mm.json or pb.json
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

      // Read stats directly from the existing mm-stats.json or pb-stats.json
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
   */
  async addLotteryDraw(type, draw) {
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
}

module.exports = new DataService(); 