// ==========================================
// Desktop Push Notifications Config (feat-058)
// ==========================================

(function() {
    'use strict';

    const STORAGE_KEY = 'desktop-notifications-config';

    // Configurable notification events
    const DEFAULT_EVENTS = {
        feature_complete: {
            name: 'Feature Completed',
            description: 'When a feature passes all tests',
            icon: '✅',
            enabled: true,
        },
        feature_failed: {
            name: 'Feature Failed',
            description: 'When a feature implementation fails',
            icon: '❌',
            enabled: true,
        },
        session_started: {
            name: 'Session Started',
            description: 'When a new harness session begins',
            icon: '🚀',
            enabled: true,
        },
        session_ended: {
            name: 'Session Ended',
            description: 'When a session completes',
            icon: '🏁',
            enabled: true,
        },
        error_occurred: {
            name: 'Error Occurred',
            description: 'When an error is detected',
            icon: '🚨',
            enabled: true,
        },
        milestone_reached: {
            name: 'Milestone Reached',
            description: 'At 25%, 50%, 75%, 100% completion',
            icon: '🎯',
            enabled: true,
        },
        harness_idle: {
            name: 'Harness Idle',
            description: 'When the harness has been idle for a while',
            icon: '💤',
            enabled: false,
        },
        build_success: {
            name: 'Build Success',
            description: 'When a build/deploy succeeds',
            icon: '🔨',
            enabled: false,
        },
    };

    let config = {
        events: JSON.parse(JSON.stringify(DEFAULT_EVENTS)),
        soundEnabled: false,
        autoCloseDelay: 5, // seconds
        requireInteraction: false,
    };

    /**
     * Load config
     */
    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...config, ...parsed };
                // Ensure all default events exist
                Object.keys(DEFAULT_EVENTS).forEach(key => {
                    if (!config.events[key]) {
                        config.events[key] = { ...DEFAULT_EVENTS[key] };
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load desktop notification config:', e);
        }
    }

    /**
     * Save config
     */
    function saveConfig() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    /**
     * Initialize the widget
     */
    function initDesktopNotifications() {
        loadConfig();
        injectStyles();
        const container = document.getElementById('desktop-notifications-widget');
        if (!container) return;
        render(container);
    }

    /**
     * Get current permission status
     */
    function getPermissionStatus() {
        if (!('Notification' in window)) return 'unsupported';
        return Notification.permission; // 'default', 'granted', 'denied'
    }

    /**
     * Request notification permission
     */
    async function requestPermission() {
        if (!('Notification' in window)) {
            if (typeof showWarning === 'function') {
                showWarning({
                    title: 'Not Supported',
                    message: 'Your browser does not support desktop notifications.'
                });
            }
            return 'unsupported';
        }

        const permission = await Notification.requestPermission();

        // Re-render to update status
        const container = document.getElementById('desktop-notifications-widget');
        if (container) render(container);

        if (permission === 'granted') {
            if (typeof showInfo === 'function') {
                showInfo({
                    title: 'Permission Granted',
                    message: 'Desktop notifications are now enabled.'
                });
            }
            // Send test notification
            sendTestNotification();
        } else if (permission === 'denied') {
            if (typeof showWarning === 'function') {
                showWarning({
                    title: 'Permission Denied',
                    message: 'Please enable notifications in browser settings.'
                });
            }
        }

        return permission;
    }

    /**
     * Send a test notification
     */
    function sendTestNotification() {
        if (getPermissionStatus() !== 'granted') {
            requestPermission();
            return;
        }

        const notification = new Notification('Test Notification', {
            body: 'Desktop push notifications are working correctly!',
            icon: '🔔',
            badge: '🤖',
            timestamp: Date.now(),
            requireInteraction: config.requireInteraction,
        });

        setTimeout(() => notification.close(), (config.autoCloseDelay || 5) * 1000);

        notification.onclick = function() {
            window.focus();
            notification.close();
        };
    }

    /**
     * Check if an event type is enabled
     */
    function isEventEnabled(eventKey) {
        return config.events[eventKey] && config.events[eventKey].enabled;
    }

    /**
     * Send a notification for a specific event
     */
    function notify(eventKey, title, body) {
        if (!isEventEnabled(eventKey)) return;
        if (getPermissionStatus() !== 'granted') return;

        const event = config.events[eventKey];
        const notification = new Notification(title || event.name, {
            body: body || event.description,
            icon: event.icon,
            badge: '🤖',
            timestamp: Date.now(),
            requireInteraction: config.requireInteraction,
        });

        setTimeout(() => notification.close(), (config.autoCloseDelay || 5) * 1000);

        notification.onclick = function() {
            window.focus();
            notification.close();
        };
    }

    /**
     * Save settings from form
     */
    function save() {
        // Read event toggles
        Object.keys(config.events).forEach(key => {
            const cb = document.getElementById(`dn-event-${key}`);
            if (cb) config.events[key].enabled = cb.checked;
        });

        const autoClose = document.getElementById('dn-auto-close');
        if (autoClose) config.autoCloseDelay = parseInt(autoClose.value) || 5;

        const requireInt = document.getElementById('dn-require-interaction');
        if (requireInt) config.requireInteraction = requireInt.checked;

        saveConfig();

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Settings Saved',
                message: 'Desktop notification preferences saved.'
            });
        }
    }

    /**
     * Reset to defaults
     */
    function resetDefaults() {
        config.events = JSON.parse(JSON.stringify(DEFAULT_EVENTS));
        config.autoCloseDelay = 5;
        config.requireInteraction = false;
        localStorage.removeItem(STORAGE_KEY);

        const container = document.getElementById('desktop-notifications-widget');
        if (container) render(container);

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Reset Complete',
                message: 'Notification settings reset to defaults.'
            });
        }
    }

    /**
     * Render the widget
     */
    function render(container) {
        const permission = getPermissionStatus();
        let permissionBadge = '';
        let permissionColor = '';

        switch (permission) {
            case 'granted':
                permissionBadge = '<span class="badge badge-success">✓ Granted</span>';
                permissionColor = 'var(--color-success)';
                break;
            case 'denied':
                permissionBadge = '<span class="badge badge-error" style="background: var(--color-error); color: white;">✗ Denied</span>';
                permissionColor = 'var(--color-error)';
                break;
            case 'unsupported':
                permissionBadge = '<span class="badge" style="background: var(--color-text-muted); color: white;">Not Supported</span>';
                permissionColor = 'var(--color-text-muted)';
                break;
            default:
                permissionBadge = '<span class="badge badge-warning">Awaiting Permission</span>';
                permissionColor = 'var(--color-warning)';
        }

        const enabledCount = Object.values(config.events).filter(e => e.enabled).length;
        const totalEvents = Object.keys(config.events).length;

        container.innerHTML = `
            <div class="card" id="desktop-notif-card">
                <div class="card-header">
                    <h3 class="card-title">Desktop Push Notifications</h3>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        ${permissionBadge}
                        <button class="btn btn-secondary" onclick="window.desktopNotifications.sendTest()">Test</button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Browser API Status -->
                    <div class="dn-section" id="dn-permission-section">
                        <h4 class="dn-section-title">Browser Notification API</h4>
                        <div class="dn-status-row">
                            <span>API Support:</span>
                            <span style="color: ${'Notification' in window ? 'var(--color-success)' : 'var(--color-error)'};">
                                ${'Notification' in window ? '✓ Supported' : '✗ Not Supported'}
                            </span>
                        </div>
                        <div class="dn-status-row">
                            <span>Permission Status:</span>
                            <span id="dn-permission-status" style="color: ${permissionColor};">${permission}</span>
                        </div>
                        ${permission === 'default' ? `
                            <button class="btn btn-primary" style="margin-top: 0.5rem;" id="dn-request-permission-btn"
                                onclick="window.desktopNotifications.requestPermission()">
                                Request Permission
                            </button>
                        ` : ''}
                        ${permission === 'denied' ? `
                            <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.5rem;">
                                Notifications are blocked. Please enable them in your browser settings.
                            </p>
                        ` : ''}
                    </div>

                    <!-- Configurable Events -->
                    <div class="dn-section" id="dn-events-section">
                        <h4 class="dn-section-title">Configurable Events (${enabledCount}/${totalEvents} enabled)</h4>
                        <div class="dn-events-list" id="dn-events-list">
                            ${Object.entries(config.events).map(([key, event]) => `
                                <div class="dn-event-item">
                                    <label class="dn-event-label">
                                        <input type="checkbox" id="dn-event-${key}" class="dn-event-toggle"
                                            data-event-key="${key}" ${event.enabled ? 'checked' : ''} />
                                        <span class="dn-event-icon">${event.icon}</span>
                                        <div class="dn-event-info">
                                            <div class="dn-event-name">${event.name}</div>
                                            <div class="dn-event-desc">${event.description}</div>
                                        </div>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Settings -->
                    <div class="dn-section">
                        <h4 class="dn-section-title">Settings</h4>
                        <div class="dn-form-group">
                            <label class="dn-label" for="dn-auto-close">Auto-close delay (seconds)</label>
                            <input type="number" id="dn-auto-close" class="dn-input" min="1" max="30"
                                value="${config.autoCloseDelay}" style="width: 100px;" />
                        </div>
                        <div class="dn-form-group">
                            <label class="dn-label">
                                <input type="checkbox" id="dn-require-interaction" ${config.requireInteraction ? 'checked' : ''} />
                                Require user interaction to dismiss
                            </label>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="window.desktopNotifications.save()">Save Settings</button>
                        <button class="btn btn-secondary" onclick="window.desktopNotifications.resetDefaults()">Reset Defaults</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Inject CSS styles
     */
    function injectStyles() {
        if (document.getElementById('desktop-notif-styles')) return;

        const style = document.createElement('style');
        style.id = 'desktop-notif-styles';
        style.textContent = `
            .dn-section {
                margin-bottom: 1.25rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--color-border);
            }

            .dn-section:last-of-type {
                border-bottom: none;
            }

            .dn-section-title {
                font-size: 0.9rem;
                font-weight: 600;
                margin-bottom: 0.75rem;
                color: var(--color-text-primary);
            }

            .dn-status-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.375rem 0;
                font-size: 0.85rem;
                color: var(--color-text-secondary);
            }

            .dn-events-list {
                display: flex;
                flex-direction: column;
                gap: 0.375rem;
            }

            .dn-event-item {
                background: var(--color-bg-tertiary);
                border-radius: var(--radius-sm);
                padding: 0.5rem 0.75rem;
            }

            .dn-event-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
                font-size: 0.85rem;
            }

            .dn-event-icon {
                font-size: 1.1rem;
                flex-shrink: 0;
            }

            .dn-event-info {
                flex: 1;
            }

            .dn-event-name {
                font-weight: 500;
                color: var(--color-text-primary);
            }

            .dn-event-desc {
                font-size: 0.75rem;
                color: var(--color-text-muted);
            }

            .dn-form-group {
                margin-bottom: 0.75rem;
            }

            .dn-label {
                display: block;
                font-size: 0.8rem;
                font-weight: 500;
                color: var(--color-text-secondary);
                margin-bottom: 0.375rem;
            }

            .dn-input {
                padding: 0.5rem 0.75rem;
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-sm);
                color: var(--color-text-primary);
                font-family: var(--font-family-base);
                font-size: 0.875rem;
            }

            .dn-input:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // Public API
    // ==========================================

    window.desktopNotifications = {
        init: initDesktopNotifications,
        requestPermission: requestPermission,
        sendTest: sendTestNotification,
        notify: notify,
        isEventEnabled: isEventEnabled,
        save: save,
        resetDefaults: resetDefaults,
        getConfig: () => ({ ...config }),
        getPermission: getPermissionStatus,
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', initDesktopNotifications);

})();
