/**
 * Utility functions for time-based operations
 */

/**
 * Check if the current time is within the lottery data update window (11:50pm-12:10am EST)
 * @returns {boolean} True if currently in update window
 */
function isInUpdateWindow() {
  const now = new Date();
  const estOptions = { timeZone: 'America/New_York' };
  const estTime = new Date(now.toLocaleString('en-US', estOptions));
  
  const hour = estTime.getHours();
  const minute = estTime.getMinutes();
  
  return (hour === 23 && minute >= 50) || (hour === 0 && minute <= 10);
}

/**
 * Get hours from midnight in EST
 * @returns {number} Hours from midnight (0-12)
 */
function getHoursFromMidnight() {
  const now = new Date();
  const estOptions = { timeZone: 'America/New_York' };
  const estTime = new Date(now.toLocaleString('en-US', estOptions));
  
  const hour = estTime.getHours();
  return (hour < 12) ? hour : 24 - hour;
}

/**
 * Get appropriate cache duration based on time of day and content type
 * @param {string} contentType - Type of content ('data', 'stats', 'static', etc.)
 * @param {number} defaultDuration - Default duration in seconds
 * @returns {number} Appropriate cache duration in seconds
 */
function getCacheDuration(contentType = 'data', defaultDuration = 300) {
  // If in update window, use short duration
  if (isInUpdateWindow()) {
    return 60; // 1 minute
  }
  
  // If far from update window (more than 12 hours), use longer duration
  const hoursFromMidnight = getHoursFromMidnight();
  const isFarFromUpdate = hoursFromMidnight >= 12;
  
  // Determine appropriate cache duration based on content type and time
  switch (contentType) {
    case 'data':
      return isFarFromUpdate ? 6 * 60 * 60 : defaultDuration; // 6 hours if far from update
    case 'stats':
      return isFarFromUpdate ? 12 * 60 * 60 : Math.max(defaultDuration, 60 * 60); // 12 hours if far from update, minimum 1 hour
    case 'static':
      return isFarFromUpdate ? 48 * 60 * 60 : 24 * 60 * 60; // 48 or 24 hours
    default:
      return defaultDuration;
  }
}

/**
 * Get appropriate ETag value based on time of day
 * @returns {string} ETag value
 */
function getETag() {
  const now = new Date();
  
  // If in update window, include minutes in ETag to change every minute
  if (isInUpdateWindow()) {
    return `W/"${now.toISOString().slice(0, 16)}"`; // Include up to minutes
  } else {
    return `W/"${now.toISOString().slice(0, 10)}"`; // Just date part
  }
}

module.exports = {
  isInUpdateWindow,
  getHoursFromMidnight,
  getCacheDuration,
  getETag
}; 