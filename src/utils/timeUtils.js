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
 * Calculate the seconds remaining until the next update window
 * @returns {number} Seconds until next update window
 */
function getSecondsUntilNextUpdate() {
  const now = new Date();
  const estOptions = { timeZone: 'America/New_York' };
  const estTime = new Date(now.toLocaleString('en-US', estOptions));
  
  const hour = estTime.getHours();
  const minute = estTime.getMinutes();
  
  // If we're already in the update window, return a short time
  if (isInUpdateWindow()) {
    return 60; // 1 minute
  }
  
  // Calculate time until 11:50 PM EST
  let hoursUntil = (23 - hour);
  let minutesUntil = 50 - minute;
  
  if (minutesUntil < 0) {
    minutesUntil += 60;
    hoursUntil -= 1;
  }
  
  // Convert to seconds
  const secondsUntil = (hoursUntil * 60 * 60) + (minutesUntil * 60);
  
  // For safety, cap at 24 hours
  return Math.min(secondsUntil, 24 * 60 * 60);
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
    return 60; // 1 minute during update window
  }
  
  // Get seconds until next update
  const secondsUntilUpdate = getSecondsUntilNextUpdate();
  
  // Calculate a safe duration that won't go past the update window
  // We use a safety margin to ensure cache expires before the update window starts
  const safetyMarginMinutes = 5;
  const safeDuration = Math.max(60, secondsUntilUpdate - (safetyMarginMinutes * 60));
  
  // Determine appropriate cache duration based on content type
  switch (contentType) {
    case 'data':
      // For lottery data, we can cache until just before the next update window
      return safeDuration;
    case 'stats':
      // Statistics don't change as often, but we'll still expire before update
      return safeDuration;
    case 'static':
      // Static content can use the longest cache duration
      return Math.max(48 * 60 * 60, safeDuration); // 48 hours or until update
    default:
      return Math.min(defaultDuration, safeDuration);
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
    // Outside update window, only include date part - this makes the ETag stable
    // throughout the day, improving client-side caching
    return `W/"${now.toISOString().slice(0, 10)}"`; // Just date part
  }
}

module.exports = {
  isInUpdateWindow,
  getHoursFromMidnight,
  getSecondsUntilNextUpdate,
  getCacheDuration,
  getETag
}; 