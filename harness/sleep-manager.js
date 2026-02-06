/**
 * Sleep/Wake Manager for Agent Harness
 *
 * Implements CPU-efficient idle state management for the harness.
 * Reduces CPU usage to <5% when idle and wakes on various triggers.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Sleep configuration
const DEFAULT_CONFIG = {
  sleepTimeoutMs: 300000,        // 5 minutes of inactivity before sleep
  checkIntervalMs: 10000,        // Check every 10 seconds
  wakeSchedule: null,            // Cron-like schedule (e.g., "0 9 * * *" for 9am daily)
  enableScheduledWake: false,
  enableUserAccessWake: true,
  enableCheckbackWake: true,
  statusFile: path.join(PROJECT_ROOT, 'harness-status.json'),
  sleepStateFile: path.join(PROJECT_ROOT, 'harness-sleep-state.json'),
  lastAccessFile: path.join(PROJECT_ROOT, '.last-dashboard-access')
};

class SleepManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isSleeping: false,
      lastActivityTime: Date.now(),
      sleepStartTime: null,
      wakeReason: null,
      activityCount: 0
    };
    this.activityTimer = null;
    this.checkTimer = null;
    this.onWakeCallback = null;
    this.onSleepCallback = null;

    this.loadState();
    this.log('Sleep Manager initialized');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '😴',
      sleep: '💤',
      wake: '⏰',
      error: '❌'
    }[level] || '•';
    console.log(`${timestamp} ${prefix} [SleepManager] ${message}`);
  }

  // Load previous sleep state
  loadState() {
    try {
      if (fs.existsSync(this.config.sleepStateFile)) {
        const savedState = JSON.parse(fs.readFileSync(this.config.sleepStateFile, 'utf-8'));
        this.state = { ...this.state, ...savedState };

        // If we were sleeping, start in sleep mode
        if (this.state.isSleeping) {
          this.log('Resuming from previous sleep state', 'sleep');
        }
      }
    } catch (e) {
      this.log(`Failed to load sleep state: ${e.message}`, 'error');
    }
  }

  // Save current sleep state
  saveState() {
    try {
      fs.writeFileSync(
        this.config.sleepStateFile,
        JSON.stringify(this.state, null, 2)
      );
    } catch (e) {
      this.log(`Failed to save sleep state: ${e.message}`, 'error');
    }
  }

  // Update harness status file with sleep state
  updateStatus() {
    try {
      let status = {};
      if (fs.existsSync(this.config.statusFile)) {
        status = JSON.parse(fs.readFileSync(this.config.statusFile, 'utf-8'));
      }

      status.sleep = {
        isSleeping: this.state.isSleeping,
        sleepStartTime: this.state.sleepStartTime,
        lastActivityTime: this.state.lastActivityTime,
        wakeReason: this.state.wakeReason
      };

      fs.writeFileSync(this.config.statusFile, JSON.stringify(status, null, 2));
    } catch (e) {
      this.log(`Failed to update status: ${e.message}`, 'error');
    }
  }

  // Record activity (prevents sleep)
  recordActivity() {
    this.state.lastActivityTime = Date.now();
    this.state.activityCount++;

    // If we're sleeping, wake up
    if (this.state.isSleeping) {
      this.wake('activity');
    }

    // Reset the inactivity timer
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    this.activityTimer = setTimeout(() => {
      this.checkSleepCondition();
    }, this.config.sleepTimeoutMs);
  }

  // Check if we should enter sleep mode
  checkSleepCondition() {
    if (this.state.isSleeping) {
      return; // Already sleeping
    }

    const inactiveTime = Date.now() - this.state.lastActivityTime;

    if (inactiveTime >= this.config.sleepTimeoutMs) {
      this.enterSleep();
    }
  }

  // Enter sleep mode
  enterSleep() {
    if (this.state.isSleeping) {
      return;
    }

    this.log('Entering sleep mode (CPU-efficient idle)', 'sleep');
    this.state.isSleeping = true;
    this.state.sleepStartTime = Date.now();
    this.state.wakeReason = null;

    this.saveState();
    this.updateStatus();

    // Notify callback
    if (this.onSleepCallback) {
      this.onSleepCallback();
    }

    // Start periodic wake checks (less frequent in sleep)
    this.startSleepChecks();
  }

  // Wake from sleep mode
  wake(reason = 'manual') {
    if (!this.state.isSleeping) {
      return;
    }

    const sleepDuration = Date.now() - this.state.sleepStartTime;
    this.log(`Waking from sleep (${reason}) after ${(sleepDuration / 1000 / 60).toFixed(1)} minutes`, 'wake');

    this.state.isSleeping = false;
    this.state.sleepStartTime = null;
    this.state.wakeReason = reason;
    this.state.lastActivityTime = Date.now();

    this.saveState();
    this.updateStatus();

    // Stop sleep checks
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    // Notify callback
    if (this.onWakeCallback) {
      this.onWakeCallback(reason);
    }

    // Restart activity monitoring
    this.recordActivity();
  }

  // Start periodic wake checks during sleep
  startSleepChecks() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    // Check every minute during sleep (low CPU usage)
    this.checkTimer = setInterval(() => {
      this.checkWakeTriggers();
    }, 60000); // 1 minute
  }

  // Check for wake triggers
  checkWakeTriggers() {
    if (!this.state.isSleeping) {
      return;
    }

    // Check for user access
    if (this.config.enableUserAccessWake && this.checkUserAccess()) {
      this.wake('user_access');
      return;
    }

    // Check for scheduled wake
    if (this.config.enableScheduledWake && this.checkScheduledWake()) {
      this.wake('scheduled');
      return;
    }

    // Check for external checkback
    if (this.config.enableCheckbackWake && this.checkExternalTrigger()) {
      this.wake('checkback');
      return;
    }
  }

  // Check if user has accessed the dashboard recently
  checkUserAccess() {
    try {
      if (fs.existsSync(this.config.lastAccessFile)) {
        const stat = fs.statSync(this.config.lastAccessFile);
        const lastAccess = stat.mtimeMs;
        const timeSinceAccess = Date.now() - lastAccess;

        // If accessed within last 2 minutes, wake up
        if (timeSinceAccess < 120000) {
          this.log('User accessed dashboard', 'wake');
          return true;
        }
      }
    } catch (e) {
      // Ignore errors
    }
    return false;
  }

  // Check scheduled wake time
  checkScheduledWake() {
    // TODO: Implement cron-like schedule checking
    // For now, just return false
    return false;
  }

  // Check for external trigger file
  checkExternalTrigger() {
    const triggerFile = path.join(PROJECT_ROOT, '.wake-harness');
    try {
      if (fs.existsSync(triggerFile)) {
        fs.unlinkSync(triggerFile);
        this.log('External wake trigger detected', 'wake');
        return true;
      }
    } catch (e) {
      // Ignore errors
    }
    return false;
  }

  // Set wake callback
  onWake(callback) {
    this.onWakeCallback = callback;
  }

  // Set sleep callback
  onSleep(callback) {
    this.onSleepCallback = callback;
  }

  // Get current state
  getState() {
    return {
      ...this.state,
      inactiveTime: Date.now() - this.state.lastActivityTime,
      sleepDuration: this.state.sleepStartTime ? Date.now() - this.state.sleepStartTime : 0
    };
  }

  // Start monitoring
  start() {
    this.log('Starting sleep/wake monitoring');
    this.recordActivity(); // Initial activity

    // If already sleeping, start checks
    if (this.state.isSleeping) {
      this.startSleepChecks();
    }
  }

  // Stop monitoring
  stop() {
    this.log('Stopping sleep/wake monitoring');

    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.saveState();
  }

  // Force wake
  forceWake() {
    this.wake('manual');
  }

  // Force sleep
  forceSleep() {
    this.enterSleep();
  }
}

export default SleepManager;
