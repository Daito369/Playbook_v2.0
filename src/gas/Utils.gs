/**
 * PolicyPlayBook v2.0 - Utility Functions
 * @fileoverview Common utility functions, logging, and helper methods
 * @author PolicyPlayBook Team
 * @version 2.0.0
 */

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3
};

/**
 * Logger class for structured logging
 */
class Logger {
  constructor() {
    this.logLevel = LOG_LEVELS.INFO;
    this.enableConsoleLog = true;
    this.enableSheetLog = false; // Disabled by default to avoid performance issues
  }

  /**
   * Set log level
   * @param {string} level - Log level (DEBUG, INFO, WARNING, ERROR)
   */
  setLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      this.logLevel = LOG_LEVELS[level];
    }
  }

  /**
   * Enable/disable sheet logging
   * @param {boolean} enabled - Whether to enable sheet logging
   */
  setSheetLogging(enabled) {
    this.enableSheetLog = enabled;
  }

  /**
   * Log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  log(level, message, data = {}) {
    const levelValue = LOG_LEVELS[level];
    if (levelValue < this.logLevel) {
      return; // Skip logging if below threshold
    }

    const timestamp = new Date().toISOString();
    const user = this.getCurrentUser();
    
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      user,
      source: 'PolicyPlayBook'
    };

    // Console logging
    if (this.enableConsoleLog) {
      const consoleMessage = `[${timestamp}] [${level}] ${message}`;
      
      switch (level) {
        case 'DEBUG':
          console.log(consoleMessage, data);
          break;
        case 'INFO':
          console.info(consoleMessage, data);
          break;
        case 'WARNING':
          console.warn(consoleMessage, data);
          break;
        case 'ERROR':
          console.error(consoleMessage, data);
          break;
        default:
          console.log(consoleMessage, data);
      }
    }

    // Sheet logging (for production debugging)
    if (this.enableSheetLog && (level === 'ERROR' || level === 'WARNING')) {
      this.writeToSheet(logEntry);
    }
  }

  /**
   * Debug log
   * @param {string} message - Message
   * @param {Object} data - Data
   */
  debug(message, data = {}) {
    this.log('DEBUG', message, data);
  }

  /**
   * Info log
   * @param {string} message - Message
   * @param {Object} data - Data
   */
  info(message, data = {}) {
    this.log('INFO', message, data);
  }

  /**
   * Warning log
   * @param {string} message - Message
   * @param {Object} data - Data
   */
  warning(message, data = {}) {
    this.log('WARNING', message, data);
  }

  /**
   * Error log
   * @param {string} message - Message
   * @param {Error|Object} error - Error object or data
   */
  error(message, error = {}) {
    let data = error;
    
    if (error instanceof Error) {
      data = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        fileName: error.fileName,
        lineNumber: error.lineNumber
      };
    }
    
    this.log('ERROR', message, data);
  }

  /**
   * Get current user safely
   * @returns {string} User email or 'unknown'
   */
  getCurrentUser() {
    try {
      const user = Session.getActiveUser();
      return user ? user.getEmail() : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Write log entry to spreadsheet
   * @param {Object} logEntry - Log entry
   */
  writeToSheet(logEntry) {
    try {
      const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      let sheet = spreadsheet.getSheetByName('SystemLog');
      
      // Create sheet if it doesn't exist
      if (!sheet) {
        sheet = spreadsheet.insertSheet('SystemLog');
        const headers = ['Timestamp', 'Level', 'Message', 'Data', 'User', 'Source'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }

      const rowData = [
        logEntry.timestamp,
        logEntry.level,
        logEntry.message,
        JSON.stringify(logEntry.data),
        logEntry.user,
        logEntry.source
      ];

      sheet.appendRow(rowData);
      
      // Keep only last 1000 entries
      const lastRow = sheet.getLastRow();
      if (lastRow > 1001) {
        sheet.deleteRows(2, lastRow - 1001);
      }
    } catch (error) {
      // Avoid infinite loop - don't log sheet logging errors
      console.error('Failed to write log to sheet:', error);
    }
  }
}

// Global logger instance
const logger = new Logger();

// Convenience logging functions
function logDebug(message, data) {
  logger.debug(message, data);
}

function logInfo(message, data) {
  logger.info(message, data);
}

function logWarning(message, data) {
  logger.warning(message, data);
}

function logError(message, error) {
  logger.error(message, error);
}

/**
 * Audit logging function
 * @param {string} action - Action performed
 * @param {Object} data - Action data
 */
function logAudit(action, data) {
  try {
    const auditEntry = {
      action,
      data,
      timestamp: new Date().toISOString(),
      user: logger.getCurrentUser(),
      sessionId: generateSessionId()
    };
    
    const dbService = new DatabaseService();
    dbService.logAudit(action, 'system', data.workflowId || 'unknown', auditEntry);
  } catch (error) {
    logError('Failed to write audit log', error);
  }
}

/**
 * Performance measurement decorator
 * @param {Function} fn - Function to measure
 * @param {string} label - Label for measurement
 * @returns {Function} Wrapped function
 */
function measurePerformance(fn, label) {
  return function(...args) {
    const start = Date.now();
    logDebug(`${label} started`);
    
    try {
      const result = fn.apply(this, args);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logWarning(`${label} took ${duration}ms (slow)`);
      } else {
        logInfo(`${label} completed in ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logError(`${label} failed after ${duration}ms`, error);
      throw error;
    }
  };
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {*} Function result
 */
function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logWarning(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error: error.message });
        Utilities.sleep(delay);
      }
    }
  }
  
  logError(`All ${maxRetries} attempts failed`, lastError);
  throw lastError;
}

/**
 * Safe JSON parse with fallback
 * @param {string} jsonString - JSON string
 * @param {*} fallback - Fallback value
 * @returns {*} Parsed JSON or fallback
 */
function safeJsonParse(jsonString, fallback = null) {
  try {
    if (!jsonString || jsonString.trim() === '') {
      return fallback;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    logWarning('JSON parse failed', { jsonString, error: error.message });
    return fallback;
  }
}

/**
 * Safe JSON stringify
 * @param {*} obj - Object to stringify
 * @param {string} fallback - Fallback string
 * @returns {string} JSON string or fallback
 */
function safeJsonStringify(obj, fallback = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    logWarning('JSON stringify failed', { obj, error: error.message });
    return fallback;
  }
}

/**
 * Generate unique ID
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
function generateUniqueId(prefix = 'ID') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Format date for Japanese locale
 * @param {Date} date - Date object
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
function formatDateJapanese(date = new Date(), includeTime = false) {
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }
  
  return date.toLocaleDateString('ja-JP', options);
}

/**
 * Sanitize HTML input
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 * @param {string} email - Email string
 * @returns {boolean} True if valid email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate ECID format (10 digits)
 * @param {string} ecid - ECID string
 * @returns {boolean} True if valid ECID
 */
function isValidEcid(ecid) {
  const ecidRegex = /^\d{10}$/;
  return ecidRegex.test(ecid);
}

/**
 * Format ECID with hyphens
 * @param {string} ecid - ECID string (10 digits)
 * @returns {string} Formatted ECID (XXX-XXX-XXXX)
 */
function formatEcid(ecid) {
  if (!isValidEcid(ecid)) {
    return ecid; // Return as-is if invalid
  }
  
  return `${ecid.substring(0, 3)}-${ecid.substring(3, 6)}-${ecid.substring(6)}`;
}

/**
 * Get next business day (excludes weekends)
 * @param {Date} date - Starting date
 * @returns {Date} Next business day
 */
function getNextBusinessDay(date = new Date()) {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Skip weekends (Saturday = 6, Sunday = 0)
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} Truncated string
 */
function truncateString(str, length = 100, suffix = '...') {
  if (!str || str.length <= length) {
    return str;
  }
  
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(fn, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if execution time is approaching limit
 * @param {number} startTime - Start time in milliseconds
 * @param {number} warningThreshold - Warning threshold (default 4.5 minutes)
 * @returns {boolean} True if approaching limit
 */
function isApproachingTimeLimit(startTime, warningThreshold = 270000) {
  const elapsed = Date.now() - startTime;
  return elapsed > warningThreshold;
}

/**
 * Batch array into smaller chunks
 * @param {Array} array - Array to batch
 * @param {number} batchSize - Size of each batch
 * @returns {Array} Array of batches
 */
function batchArray(array, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Get environment configuration
 * @returns {Object} Environment configuration
 */
function getEnvironmentConfig() {
  const properties = PropertiesService.getScriptProperties();
  const env = properties.getProperty('ENVIRONMENT') || 'development';
  
  return {
    environment: env,
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
    debugMode: env !== 'production'
  };
}

/**
 * Initialize application logger based on environment
 */
function initializeLogger() {
  const config = getEnvironmentConfig();
  
  if (config.isProduction) {
    logger.setLevel('WARNING');
    logger.setSheetLogging(true);
  } else if (config.isStaging) {
    logger.setLevel('INFO');
    logger.setSheetLogging(false);
  } else {
    logger.setLevel('DEBUG');
    logger.setSheetLogging(false);
  }
  
  logInfo('Logger initialized', { environment: config.environment });
}

/**
 * Health check function
 * @returns {Object} Health check result
 */
function healthCheck() {
  const startTime = Date.now();
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {},
    duration: 0
  };
  
  try {
    // Check spreadsheet access
    try {
      const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheets = spreadsheet.getSheets();
      checks.checks.spreadsheet = {
        status: 'ok',
        sheetCount: sheets.length
      };
    } catch (error) {
      checks.checks.spreadsheet = {
        status: 'error',
        error: error.message
      };
      checks.status = 'unhealthy';
    }
    
    // Check user authentication
    try {
      const user = Session.getActiveUser();
      checks.checks.auth = {
        status: 'ok',
        user: user.getEmail()
      };
    } catch (error) {
      checks.checks.auth = {
        status: 'error',
        error: error.message
      };
      checks.status = 'unhealthy';
    }
    
    // Check memory usage (approximate)
    const memoryTest = new Array(1000).fill('test');
    checks.checks.memory = {
      status: 'ok',
      testArrayLength: memoryTest.length
    };
    
  } catch (error) {
    checks.status = 'unhealthy';
    checks.error = error.message;
  }
  
  checks.duration = Date.now() - startTime;
  return checks;
}

// Initialize logger when Utils.gs is loaded
try {
  initializeLogger();
} catch (error) {
  console.error('Failed to initialize logger:', error);
}