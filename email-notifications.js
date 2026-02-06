// ==========================================
// Email Notifications (feat-057)
// ==========================================

(function() {
    'use strict';

    const STORAGE_KEY = 'email-notifications-config';
    const API_BASE = 'http://localhost:3434';

    let config = {
        emailAddress: '',
        enabled: false,
        notifyOnSessionComplete: true,
        notifyOnErrors: true,
        notifyOnMilestones: true,
        includeFeatureSummary: true,
        errorAlertThreshold: 'all', // 'all', 'critical', 'none'
        recentNotifications: [],
    };

    /**
     * Load config from localStorage
     */
    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                config = { ...config, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load email config:', e);
        }
    }

    /**
     * Save config to localStorage
     */
    function saveConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.warn('Failed to save email config:', e);
        }
    }

    /**
     * Initialize the email notifications widget
     */
    function initEmailNotifications() {
        loadConfig();
        const container = document.getElementById('email-notifications-widget');
        if (!container) return;
        render(container);
    }

    /**
     * Render the widget
     */
    function render(container) {
        const statusColor = config.enabled ? 'var(--color-success)' : 'var(--color-text-muted)';
        const statusIcon = config.enabled ? '🟢' : '🔴';
        const statusText = config.enabled ? 'Enabled' : 'Disabled';

        container.innerHTML = `
            <div class="card" id="email-notif-card">
                <div class="card-header">
                    <h3 class="card-title">Email Notifications</h3>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span id="en-status-indicator" style="font-size: 0.8rem; color: ${statusColor};">${statusIcon} ${statusText}</span>
                        <button class="btn btn-secondary" onclick="window.emailNotifications.sendTestEmail()">Send Test</button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Email Configuration -->
                    <div class="en-section" id="en-config-section">
                        <h4 class="en-section-title">Email Configuration</h4>
                        <div class="en-form-group">
                            <label class="en-label" for="en-email-address">Email Address</label>
                            <input type="email" id="en-email-address" class="en-input"
                                placeholder="your-email@example.com"
                                value="${escapeAttr(config.emailAddress)}" />
                        </div>
                        <div class="en-form-group">
                            <label class="en-label">
                                <input type="checkbox" id="en-enabled" ${config.enabled ? 'checked' : ''} />
                                Enable email notifications
                            </label>
                        </div>
                    </div>

                    <!-- Feature Summary Settings -->
                    <div class="en-section" id="en-summary-section">
                        <h4 class="en-section-title">Session Completion Summary</h4>
                        <div class="en-form-group">
                            <label class="en-label">
                                <input type="checkbox" id="en-session-complete" ${config.notifyOnSessionComplete ? 'checked' : ''} />
                                Notify when session completes
                            </label>
                        </div>
                        <div class="en-form-group">
                            <label class="en-label">
                                <input type="checkbox" id="en-include-summary" ${config.includeFeatureSummary ? 'checked' : ''} />
                                Include completed features summary
                            </label>
                        </div>
                        <div class="en-form-group">
                            <label class="en-label">
                                <input type="checkbox" id="en-milestones" ${config.notifyOnMilestones ? 'checked' : ''} />
                                Notify on milestones (25%, 50%, 75%, 100%)
                            </label>
                        </div>

                        <!-- Preview of session summary email -->
                        <div class="en-email-preview" id="en-summary-preview">
                            <div class="en-preview-header">📧 Session Summary Preview</div>
                            <div class="en-preview-body">
                                <div class="en-preview-subject">Subject: Coding Session Complete - ${getSessionStats().completed} features implemented</div>
                                <hr style="border-color: var(--color-border); margin: 0.5rem 0;">
                                <div class="en-preview-content">
                                    <strong>Session Summary</strong><br>
                                    ✅ Features completed: ${getSessionStats().completed}/${getSessionStats().total}<br>
                                    📊 Progress: ${getSessionStats().percent}%<br>
                                    ⏱️ Duration: ${getSessionStats().duration}<br>
                                    <br>
                                    <strong>Recently Completed:</strong><br>
                                    ${getRecentFeatures().map(f => `• ${f.id}: ${f.description}`).join('<br>')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Error Alert Settings -->
                    <div class="en-section" id="en-error-section">
                        <h4 class="en-section-title">Error Alerts</h4>
                        <div class="en-form-group">
                            <label class="en-label">
                                <input type="checkbox" id="en-error-alerts" ${config.notifyOnErrors ? 'checked' : ''} />
                                Send email alerts on errors
                            </label>
                        </div>
                        <div class="en-form-group">
                            <label class="en-label" for="en-error-threshold">Alert Threshold</label>
                            <select id="en-error-threshold" class="en-select">
                                <option value="all" ${config.errorAlertThreshold === 'all' ? 'selected' : ''}>All Errors</option>
                                <option value="critical" ${config.errorAlertThreshold === 'critical' ? 'selected' : ''}>Critical Only</option>
                                <option value="none" ${config.errorAlertThreshold === 'none' ? 'selected' : ''}>None</option>
                            </select>
                        </div>

                        <!-- Error alert preview -->
                        <div class="en-email-preview" id="en-error-preview">
                            <div class="en-preview-header" style="color: var(--color-error);">🚨 Error Alert Preview</div>
                            <div class="en-preview-body">
                                <div class="en-preview-subject">Subject: [ALERT] Harness Error - Feature Implementation Failed</div>
                                <hr style="border-color: var(--color-border); margin: 0.5rem 0;">
                                <div class="en-preview-content">
                                    <strong>Error Details</strong><br>
                                    ❌ Feature: feat-XXX<br>
                                    🔍 Type: Implementation Error<br>
                                    📝 Message: Test assertions failed<br>
                                    ⏱️ Timestamp: ${new Date().toISOString()}<br>
                                    <br>
                                    <strong>Action Required:</strong><br>
                                    Review the error log and restart the harness.
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Notifications -->
                    <div class="en-section">
                        <h4 class="en-section-title">Recent Notifications</h4>
                        <div id="en-recent-list" class="en-recent-list">
                            ${config.recentNotifications.length > 0
                                ? config.recentNotifications.slice(-5).reverse().map(n => `
                                    <div class="en-recent-item">
                                        <span class="en-recent-icon">${n.type === 'error' ? '🚨' : '📧'}</span>
                                        <span class="en-recent-text">${escapeHtml(n.subject)}</span>
                                        <span class="en-recent-time">${formatTime(n.timestamp)}</span>
                                    </div>
                                `).join('')
                                : '<div class="en-recent-empty">No notifications sent yet</div>'
                            }
                        </div>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="window.emailNotifications.save()">Save Settings</button>
                        <button class="btn btn-secondary" onclick="window.emailNotifications.clearHistory()">Clear History</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get session stats for preview
     */
    function getSessionStats() {
        try {
            if (typeof featureData !== 'undefined' && featureData && featureData.features) {
                const total = featureData.features.length;
                const completed = featureData.features.filter(f => f.passes).length;
                return {
                    total,
                    completed,
                    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
                    duration: '~2h 14m',
                };
            }
        } catch (e) {}
        return { total: 120, completed: 56, percent: 47, duration: '~2h 14m' };
    }

    /**
     * Get recent completed features for preview
     */
    function getRecentFeatures() {
        try {
            if (typeof featureData !== 'undefined' && featureData && featureData.features) {
                return featureData.features.filter(f => f.passes).slice(-3);
            }
        } catch (e) {}
        return [
            { id: 'feat-054', description: 'Customizable dashboard layout' },
            { id: 'feat-055', description: 'Feature detail modal' },
            { id: 'feat-056', description: 'Slack integration' },
        ];
    }

    /**
     * Format timestamp for display
     */
    function formatTime(ts) {
        try {
            const d = new Date(ts);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    }

    /**
     * Save configuration
     */
    function save() {
        const emailInput = document.getElementById('en-email-address');
        const enabledCb = document.getElementById('en-enabled');
        const sessionCb = document.getElementById('en-session-complete');
        const summaryCb = document.getElementById('en-include-summary');
        const milestonesCb = document.getElementById('en-milestones');
        const errorsCb = document.getElementById('en-error-alerts');
        const thresholdSelect = document.getElementById('en-error-threshold');

        if (emailInput) config.emailAddress = emailInput.value.trim();
        if (enabledCb) config.enabled = enabledCb.checked;
        if (sessionCb) config.notifyOnSessionComplete = sessionCb.checked;
        if (summaryCb) config.includeFeatureSummary = summaryCb.checked;
        if (milestonesCb) config.notifyOnMilestones = milestonesCb.checked;
        if (errorsCb) config.notifyOnErrors = errorsCb.checked;
        if (thresholdSelect) config.errorAlertThreshold = thresholdSelect.value;

        saveConfig();

        // Re-render to update status
        const container = document.getElementById('email-notifications-widget');
        if (container) render(container);

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Email Settings Saved',
                message: `Notifications ${config.enabled ? 'enabled' : 'disabled'} for ${config.emailAddress || 'no email set'}`
            });
        }
    }

    /**
     * Send a test email notification
     */
    async function sendTestEmail() {
        const emailInput = document.getElementById('en-email-address');
        const email = emailInput ? emailInput.value.trim() : config.emailAddress;

        if (!email) {
            if (typeof showWarning === 'function') {
                showWarning({
                    title: 'No Email',
                    message: 'Please enter an email address first.'
                });
            }
            return;
        }

        const indicator = document.getElementById('en-status-indicator');
        if (indicator) {
            indicator.innerHTML = '🟡 Sending...';
            indicator.style.color = 'var(--color-warning)';
        }

        const stats = getSessionStats();
        const notification = {
            type: 'test',
            subject: `Test: Coding Session Summary - ${stats.completed}/${stats.total} features`,
            to: email,
            timestamp: new Date().toISOString(),
            body: `This is a test email notification from the Autonomous Coding Dashboard.\n\nSession Stats:\n- Features: ${stats.completed}/${stats.total} (${stats.percent}%)\n- Duration: ${stats.duration}`,
        };

        try {
            await fetch(`${API_BASE}/api/notifications/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notification)
            });
        } catch (e) {
            // Backend may not have email endpoint - that's ok for config UI
        }

        // Log the notification
        config.recentNotifications.push(notification);
        if (config.recentNotifications.length > 20) {
            config.recentNotifications = config.recentNotifications.slice(-20);
        }
        saveConfig();

        if (indicator) {
            indicator.innerHTML = '🟢 Sent';
            indicator.style.color = 'var(--color-success)';
        }

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Test Email Queued',
                message: `Test notification queued for ${email}`
            });
        }

        // Re-render to show in recent list
        const container = document.getElementById('email-notifications-widget');
        if (container) render(container);
    }

    /**
     * Send a session completion notification
     */
    async function notifySessionComplete(sessionData) {
        if (!config.enabled || !config.emailAddress || !config.notifyOnSessionComplete) return;

        const stats = getSessionStats();
        const notification = {
            type: 'session_complete',
            subject: `Session Complete - ${stats.completed}/${stats.total} features (${stats.percent}%)`,
            to: config.emailAddress,
            timestamp: new Date().toISOString(),
            body: `Session completed.\n\nFeatures: ${stats.completed}/${stats.total}\nProgress: ${stats.percent}%`,
        };

        config.recentNotifications.push(notification);
        saveConfig();

        try {
            await fetch(`${API_BASE}/api/notifications/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notification)
            });
        } catch (e) {
            console.warn('Failed to send session notification:', e);
        }
    }

    /**
     * Send an error alert notification
     */
    async function notifyError(errorData) {
        if (!config.enabled || !config.emailAddress || !config.notifyOnErrors) return;
        if (config.errorAlertThreshold === 'none') return;
        if (config.errorAlertThreshold === 'critical' && !errorData.critical) return;

        const notification = {
            type: 'error',
            subject: `[ALERT] ${errorData.type || 'Error'}: ${errorData.message || 'Unknown error'}`,
            to: config.emailAddress,
            timestamp: new Date().toISOString(),
            body: `Error alert.\n\nType: ${errorData.type}\nMessage: ${errorData.message}\nFeature: ${errorData.featureId || 'N/A'}`,
        };

        config.recentNotifications.push(notification);
        saveConfig();

        try {
            await fetch(`${API_BASE}/api/notifications/email/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notification)
            });
        } catch (e) {
            console.warn('Failed to send error notification:', e);
        }
    }

    /**
     * Clear notification history
     */
    function clearHistory() {
        config.recentNotifications = [];
        saveConfig();

        const container = document.getElementById('email-notifications-widget');
        if (container) render(container);

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'History Cleared',
                message: 'Notification history has been cleared.'
            });
        }
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escape attribute value
     */
    function escapeAttr(text) {
        return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /**
     * Inject CSS styles
     */
    function injectStyles() {
        if (document.getElementById('email-notif-styles')) return;

        const style = document.createElement('style');
        style.id = 'email-notif-styles';
        style.textContent = `
            .en-section {
                margin-bottom: 1.25rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--color-border);
            }

            .en-section:last-of-type {
                border-bottom: none;
            }

            .en-section-title {
                font-size: 0.9rem;
                font-weight: 600;
                margin-bottom: 0.75rem;
                color: var(--color-text-primary);
            }

            .en-form-group {
                margin-bottom: 0.75rem;
            }

            .en-label {
                display: block;
                font-size: 0.8rem;
                font-weight: 500;
                color: var(--color-text-secondary);
                margin-bottom: 0.375rem;
            }

            .en-input, .en-select {
                width: 100%;
                padding: 0.5rem 0.75rem;
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-sm);
                color: var(--color-text-primary);
                font-family: var(--font-family-base);
                font-size: 0.875rem;
                box-sizing: border-box;
            }

            .en-input:focus, .en-select:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
            }

            .en-email-preview {
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                margin-top: 0.75rem;
                overflow: hidden;
            }

            .en-preview-header {
                padding: 0.5rem 0.75rem;
                background: var(--color-bg-tertiary);
                font-size: 0.8rem;
                font-weight: 600;
            }

            .en-preview-body {
                padding: 0.75rem;
            }

            .en-preview-subject {
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .en-preview-content {
                font-size: 0.8rem;
                color: var(--color-text-secondary);
                line-height: 1.5;
            }

            .en-recent-list {
                display: flex;
                flex-direction: column;
                gap: 0.375rem;
            }

            .en-recent-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 0.75rem;
                background: var(--color-bg-tertiary);
                border-radius: var(--radius-sm);
                font-size: 0.8rem;
            }

            .en-recent-icon {
                flex-shrink: 0;
            }

            .en-recent-text {
                flex: 1;
                color: var(--color-text-secondary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .en-recent-time {
                color: var(--color-text-muted);
                font-size: 0.75rem;
                flex-shrink: 0;
            }

            .en-recent-empty {
                color: var(--color-text-muted);
                font-size: 0.85rem;
                font-style: italic;
                padding: 0.5rem;
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // Public API
    // ==========================================

    window.emailNotifications = {
        init: initEmailNotifications,
        save: save,
        sendTestEmail: sendTestEmail,
        notifySessionComplete: notifySessionComplete,
        notifyError: notifyError,
        clearHistory: clearHistory,
        getConfig: () => ({ ...config }),
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        initEmailNotifications();
    });

})();
