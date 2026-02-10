/**
 * Adaptive Session Delay Manager
 *
 * Intelligently adjusts delays between sessions based on activity and success patterns.
 * - Increases delay after errors or failed sessions
 * - Decreases delay during productive sessions
 * - Configurable min/max bounds
 * - Logs all delay adjustments for transparency
 */

export default class AdaptiveDelay {
  constructor(options = {}) {
    this.minDelayMs = options.minDelayMs || 2000;        // Minimum 2 seconds
    this.maxDelayMs = options.maxDelayMs || 120000;      // Maximum 2 minutes
    this.defaultDelayMs = options.defaultDelayMs || 5000; // Default 5 seconds
    this.currentDelayMs = this.defaultDelayMs;

    // Adjustment factors
    this.errorMultiplier = options.errorMultiplier || 2.0;    // Double delay on error
    this.successDivisor = options.successDivisor || 1.2;      // Reduce delay by 20% on success
    this.productivityBonus = options.productivityBonus || 0.8; // Extra 20% reduction for high productivity

    // Session tracking
    this.sessionHistory = [];
    this.consecutiveSuccesses = 0;
    this.consecutiveErrors = 0;

    this.log('Adaptive delay manager initialized', {
      min: this.minDelayMs,
      max: this.maxDelayMs,
      default: this.defaultDelayMs,
      current: this.currentDelayMs
    });
  }

  /**
   * Log delay adjustments with context
   */
  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [AdaptiveDelay] ${message}`;
    console.log(data ? `${logEntry}: ${JSON.stringify(data)}` : logEntry);
  }

  /**
   * Record a session result and adjust delay accordingly
   * @param {Object} sessionResult - Result from runSession
   * @returns {number} - New delay in milliseconds
   */
  recordSession(sessionResult) {
    const {
      code,
      error,
      stats,
      duration,
      featuresCompleted = 0
    } = sessionResult;

    // Track session in history
    this.sessionHistory.push({
      timestamp: Date.now(),
      success: !error && code === 0,
      error,
      featuresCompleted,
      duration,
      delayBefore: this.currentDelayMs
    });

    // Keep only last 20 sessions
    if (this.sessionHistory.length > 20) {
      this.sessionHistory.shift();
    }

    const wasSuccess = !error && code === 0;
    const wasProductive = featuresCompleted > 0;

    // Update consecutive counters
    if (wasSuccess) {
      this.consecutiveSuccesses++;
      this.consecutiveErrors = 0;
    } else {
      this.consecutiveErrors++;
      this.consecutiveSuccesses = 0;
    }

    const previousDelay = this.currentDelayMs;

    // Adjust delay based on session outcome
    if (error || code !== 0) {
      // Error: increase delay
      this.currentDelayMs *= this.errorMultiplier;

      // Extra penalty for consecutive errors
      if (this.consecutiveErrors > 2) {
        this.currentDelayMs *= 1.5;
      }

      this.log('Session error - increasing delay', {
        previousDelay,
        newDelay: this.currentDelayMs,
        consecutiveErrors: this.consecutiveErrors
      });

    } else if (wasProductive) {
      // Productive session: decrease delay more aggressively
      this.currentDelayMs /= this.successDivisor;

      // Extra bonus for consistent productivity
      if (this.consecutiveSuccesses > 3) {
        this.currentDelayMs *= this.productivityBonus;
      }

      this.log('Productive session - decreasing delay', {
        previousDelay,
        newDelay: this.currentDelayMs,
        featuresCompleted,
        consecutiveSuccesses: this.consecutiveSuccesses
      });

    } else {
      // Success but no features completed: slight decrease
      this.currentDelayMs /= (this.successDivisor * 0.8); // More conservative

      this.log('Non-productive session - slight delay decrease', {
        previousDelay,
        newDelay: this.currentDelayMs
      });
    }

    // Enforce bounds
    this.currentDelayMs = Math.max(this.minDelayMs, Math.min(this.maxDelayMs, this.currentDelayMs));

    // Round to nearest 100ms for cleaner values
    this.currentDelayMs = Math.round(this.currentDelayMs / 100) * 100;

    this.log('Delay adjusted', {
      from: previousDelay,
      to: this.currentDelayMs,
      change: this.currentDelayMs - previousDelay,
      reason: error ? 'error' : (wasProductive ? 'productive' : 'success')
    });

    return this.currentDelayMs;
  }

  /**
   * Get current delay in milliseconds
   * @returns {number}
   */
  getCurrentDelay() {
    return this.currentDelayMs;
  }

  /**
   * Get delay in human-readable format
   * @returns {string}
   */
  getCurrentDelayFormatted() {
    const seconds = (this.currentDelayMs / 1000).toFixed(1);
    return `${seconds}s`;
  }

  /**
   * Reset delay to default value
   */
  reset() {
    this.currentDelayMs = this.defaultDelayMs;
    this.consecutiveSuccesses = 0;
    this.consecutiveErrors = 0;
    this.log('Delay reset to default', { delay: this.currentDelayMs });
  }

  /**
   * Get statistics about delay adjustments
   * @returns {Object}
   */
  getStats() {
    const recentSessions = this.sessionHistory.slice(-10);
    const successRate = recentSessions.length > 0
      ? (recentSessions.filter(s => s.success).length / recentSessions.length * 100).toFixed(1)
      : 0;

    const avgFeaturesCompleted = recentSessions.length > 0
      ? (recentSessions.reduce((sum, s) => sum + s.featuresCompleted, 0) / recentSessions.length).toFixed(2)
      : 0;

    return {
      currentDelayMs: this.currentDelayMs,
      currentDelayFormatted: this.getCurrentDelayFormatted(),
      minDelayMs: this.minDelayMs,
      maxDelayMs: this.maxDelayMs,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveErrors: this.consecutiveErrors,
      recentSuccessRate: `${successRate}%`,
      avgFeaturesPerSession: avgFeaturesCompleted,
      totalSessionsTracked: this.sessionHistory.length
    };
  }

  /**
   * Wait for the current adaptive delay
   * @returns {Promise<void>}
   */
  async wait() {
    this.log(`Waiting for adaptive delay: ${this.getCurrentDelayFormatted()}`);
    await new Promise(resolve => setTimeout(resolve, this.currentDelayMs));
  }
}
