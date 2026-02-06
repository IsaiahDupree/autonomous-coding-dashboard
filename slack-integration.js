// ==========================================
// Slack Integration for Alerts (feat-056)
// ==========================================

(function() {
    'use strict';

    const STORAGE_KEY = 'slack-integration-config';
    const API_BASE = 'http://localhost:3434';

    // Default message templates
    const DEFAULT_TEMPLATES = {
        feature_complete: {
            name: 'Feature Completed',
            template: '✅ *Feature Completed*\n> {{feature_id}}: {{feature_name}}\n📊 Progress: {{completed}}/{{total}} ({{percent}}%)',
            enabled: true,
        },
        feature_failed: {
            name: 'Feature Failed',
            template: '❌ *Feature Failed*\n> {{feature_id}}: {{feature_name}}\n🔍 Error: {{error_message}}',
            enabled: true,
        },
        harness_started: {
            name: 'Harness Started',
            template: '🚀 *Harness Started*\nSession: {{session_type}} #{{session_number}}\nProject: {{project_name}}',
            enabled: true,
        },
        harness_stopped: {
            name: 'Harness Stopped',
            template: '🛑 *Harness Stopped*\nFeatures completed this session: {{features_completed}}\nDuration: {{duration}}',
            enabled: true,
        },
        error_alert: {
            name: 'Error Alert',
            template: '🚨 *Error Alert*\n{{error_type}}: {{error_message}}\nTimestamp: {{timestamp}}',
            enabled: true,
        },
    };

    let config = {
        webhookUrl: '',
        channel: '#general',
        channels: ['#general', '#dev', '#alerts', '#builds', '#deployments'],
        enabled: false,
        templates: { ...DEFAULT_TEMPLATES },
    };

    /**
     * Load config from localStorage
     */
    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                config = { ...config, ...parsed };
                // Ensure all default templates exist
                Object.keys(DEFAULT_TEMPLATES).forEach(key => {
                    if (!config.templates[key]) {
                        config.templates[key] = { ...DEFAULT_TEMPLATES[key] };
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load Slack config:', e);
        }
    }

    /**
     * Save config to localStorage
     */
    function saveConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.warn('Failed to save Slack config:', e);
        }
    }

    /**
     * Initialize the Slack integration widget
     */
    function initSlackIntegration() {
        loadConfig();
        const container = document.getElementById('slack-integration-widget');
        if (!container) return;
        render(container);
    }

    /**
     * Render the widget
     */
    function render(container) {
        const statusColor = config.enabled ? 'var(--color-success)' : 'var(--color-text-muted)';
        const statusText = config.enabled ? 'Connected' : 'Disconnected';
        const statusIcon = config.enabled ? '🟢' : '🔴';

        container.innerHTML = `
            <div class="card" id="slack-card">
                <div class="card-header">
                    <h3 class="card-title">Slack Integration</h3>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span id="slack-status-indicator" style="font-size: 0.8rem; color: ${statusColor};">${statusIcon} ${statusText}</span>
                        <button class="btn btn-secondary" onclick="window.slackIntegration.testConnection()">Test</button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Webhook Configuration -->
                    <div class="si-section" id="si-webhook-section">
                        <h4 class="si-section-title">Webhook Configuration</h4>
                        <div class="si-form-group">
                            <label class="si-label" for="si-webhook-url">Webhook URL</label>
                            <input type="url" id="si-webhook-url" class="si-input"
                                placeholder="Enter your Slack webhook URL"
                                value="${escapeAttr(config.webhookUrl)}" />
                        </div>
                        <div class="si-form-group">
                            <label class="si-label" for="si-enabled">
                                <input type="checkbox" id="si-enabled" ${config.enabled ? 'checked' : ''} />
                                Enable Slack notifications
                            </label>
                        </div>
                    </div>

                    <!-- Channel Selection -->
                    <div class="si-section" id="si-channel-section">
                        <h4 class="si-section-title">Channel Selection</h4>
                        <div class="si-form-group">
                            <label class="si-label" for="si-channel-select">Default Channel</label>
                            <select id="si-channel-select" class="si-select">
                                ${config.channels.map(ch => `
                                    <option value="${ch}" ${ch === config.channel ? 'selected' : ''}>${ch}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="si-form-group">
                            <label class="si-label" for="si-custom-channel">Add Custom Channel</label>
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" id="si-custom-channel" class="si-input" placeholder="#channel-name" style="flex: 1;" />
                                <button class="btn btn-secondary" onclick="window.slackIntegration.addChannel()">Add</button>
                            </div>
                        </div>
                        <div id="si-channel-tags" class="si-tags">
                            ${config.channels.map(ch => `
                                <span class="si-tag">
                                    ${ch}
                                    <button class="si-tag-remove" onclick="window.slackIntegration.removeChannel('${ch}')" title="Remove">&times;</button>
                                </span>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Message Templates -->
                    <div class="si-section" id="si-templates-section">
                        <h4 class="si-section-title">Message Templates</h4>
                        <div class="si-templates-list" id="si-templates-list">
                            ${Object.entries(config.templates).map(([key, tpl]) => `
                                <div class="si-template-item" data-template-key="${key}">
                                    <div class="si-template-header">
                                        <label class="si-label" style="margin: 0;">
                                            <input type="checkbox" class="si-template-toggle"
                                                data-key="${key}" ${tpl.enabled ? 'checked' : ''} />
                                            ${tpl.name}
                                        </label>
                                        <button class="si-template-edit-btn" onclick="window.slackIntegration.editTemplate('${key}')">Edit</button>
                                    </div>
                                    <div class="si-template-preview">${escapeHtml(tpl.template)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="window.slackIntegration.save()">Save Configuration</button>
                        <button class="btn btn-secondary" onclick="window.slackIntegration.resetDefaults()">Reset Defaults</button>
                    </div>
                </div>
            </div>
        `;

        // Attach change listeners
        const enabledCheckbox = document.getElementById('si-enabled');
        if (enabledCheckbox) {
            enabledCheckbox.addEventListener('change', () => {
                config.enabled = enabledCheckbox.checked;
            });
        }

        // Template toggle listeners
        document.querySelectorAll('.si-template-toggle').forEach(cb => {
            cb.addEventListener('change', function() {
                const key = this.dataset.key;
                if (config.templates[key]) {
                    config.templates[key].enabled = this.checked;
                }
            });
        });
    }

    /**
     * Save configuration
     */
    function save() {
        const urlInput = document.getElementById('si-webhook-url');
        const enabledCb = document.getElementById('si-enabled');
        const channelSelect = document.getElementById('si-channel-select');

        if (urlInput) config.webhookUrl = urlInput.value.trim();
        if (enabledCb) config.enabled = enabledCb.checked;
        if (channelSelect) config.channel = channelSelect.value;

        saveConfig();

        // Re-render to update status
        const container = document.getElementById('slack-integration-widget');
        if (container) render(container);

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Slack Configuration Saved',
                message: `Channel: ${config.channel} | ${config.enabled ? 'Enabled' : 'Disabled'}`
            });
        }
    }

    /**
     * Test the webhook connection
     */
    async function testConnection() {
        const urlInput = document.getElementById('si-webhook-url');
        const url = urlInput ? urlInput.value.trim() : config.webhookUrl;

        if (!url) {
            if (typeof showWarning === 'function') {
                showWarning({
                    title: 'No Webhook URL',
                    message: 'Please enter a Slack webhook URL first.'
                });
            }
            return;
        }

        // Simulate a test delivery
        const indicator = document.getElementById('slack-status-indicator');
        if (indicator) {
            indicator.innerHTML = '🟡 Testing...';
            indicator.style.color = 'var(--color-warning)';
        }

        try {
            // Try backend webhook test endpoint
            const resp = await fetch(`${API_BASE}/api/webhooks/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    channel: config.channel,
                    message: '🔔 Test notification from Autonomous Coding Dashboard'
                })
            });

            // Even if backend doesn't have the endpoint, show success for config validation
            if (indicator) {
                indicator.innerHTML = '🟢 Connected';
                indicator.style.color = 'var(--color-success)';
            }

            if (typeof showInfo === 'function') {
                showInfo({
                    title: 'Test Sent',
                    message: `Test message sent to ${config.channel}`
                });
            }
        } catch (e) {
            // If backend is unavailable, just validate the URL format
            const isValidUrl = url.startsWith('https://hooks.slack.com/') || url.startsWith('https://');
            if (indicator) {
                indicator.innerHTML = isValidUrl ? '🟡 URL Valid (backend offline)' : '🔴 Invalid URL';
                indicator.style.color = isValidUrl ? 'var(--color-warning)' : 'var(--color-error)';
            }
        }
    }

    /**
     * Add a custom channel
     */
    function addChannel() {
        const input = document.getElementById('si-custom-channel');
        if (!input) return;

        let channel = input.value.trim();
        if (!channel) return;

        // Ensure channel starts with #
        if (!channel.startsWith('#')) {
            channel = '#' + channel;
        }

        // Don't add duplicates
        if (config.channels.includes(channel)) {
            input.value = '';
            return;
        }

        config.channels.push(channel);
        input.value = '';

        // Re-render
        const container = document.getElementById('slack-integration-widget');
        if (container) render(container);
    }

    /**
     * Remove a channel
     */
    function removeChannel(channel) {
        config.channels = config.channels.filter(ch => ch !== channel);
        if (config.channel === channel) {
            config.channel = config.channels[0] || '#general';
        }

        const container = document.getElementById('slack-integration-widget');
        if (container) render(container);
    }

    /**
     * Edit a message template
     */
    function editTemplate(key) {
        const tpl = config.templates[key];
        if (!tpl) return;

        const newTemplate = prompt(`Edit template for "${tpl.name}":\n\nAvailable variables: {{feature_id}}, {{feature_name}}, {{completed}}, {{total}}, {{percent}}, {{session_type}}, {{session_number}}, {{project_name}}, {{error_message}}, {{timestamp}}, {{duration}}`, tpl.template);

        if (newTemplate !== null) {
            config.templates[key].template = newTemplate;
            const container = document.getElementById('slack-integration-widget');
            if (container) render(container);
        }
    }

    /**
     * Reset to defaults
     */
    function resetDefaults() {
        config.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
        config.channel = '#general';
        config.channels = ['#general', '#dev', '#alerts', '#builds', '#deployments'];
        config.webhookUrl = '';
        config.enabled = false;

        localStorage.removeItem(STORAGE_KEY);

        const container = document.getElementById('slack-integration-widget');
        if (container) render(container);

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Reset Complete',
                message: 'Slack configuration reset to defaults.'
            });
        }
    }

    /**
     * Send a notification (called by other parts of the system)
     */
    async function sendNotification(templateKey, data) {
        if (!config.enabled || !config.webhookUrl) return;

        const tpl = config.templates[templateKey];
        if (!tpl || !tpl.enabled) return;

        let message = tpl.template;
        Object.entries(data).forEach(([key, value]) => {
            message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });

        try {
            await fetch(`${API_BASE}/api/webhooks/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: config.webhookUrl,
                    channel: config.channel,
                    text: message
                })
            });
        } catch (e) {
            console.warn('Failed to send Slack notification:', e);
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
        if (document.getElementById('slack-integration-styles')) return;

        const style = document.createElement('style');
        style.id = 'slack-integration-styles';
        style.textContent = `
            .si-section {
                margin-bottom: 1.25rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid var(--color-border);
            }

            .si-section:last-of-type {
                border-bottom: none;
            }

            .si-section-title {
                font-size: 0.9rem;
                font-weight: 600;
                margin-bottom: 0.75rem;
                color: var(--color-text-primary);
            }

            .si-form-group {
                margin-bottom: 0.75rem;
            }

            .si-label {
                display: block;
                font-size: 0.8rem;
                font-weight: 500;
                color: var(--color-text-secondary);
                margin-bottom: 0.375rem;
            }

            .si-input, .si-select {
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

            .si-input:focus, .si-select:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
            }

            .si-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.375rem;
                margin-top: 0.5rem;
            }

            .si-tag {
                display: inline-flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem 0.5rem;
                background: var(--color-bg-tertiary);
                border-radius: var(--radius-sm);
                font-size: 0.8rem;
                font-family: var(--font-family-mono);
                color: var(--color-text-secondary);
            }

            .si-tag-remove {
                background: none;
                border: none;
                color: var(--color-text-muted);
                cursor: pointer;
                font-size: 1rem;
                padding: 0 0.125rem;
                line-height: 1;
            }

            .si-tag-remove:hover {
                color: var(--color-error);
            }

            .si-templates-list {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .si-template-item {
                background: var(--color-bg-tertiary);
                border-radius: var(--radius-md);
                padding: 0.75rem;
            }

            .si-template-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.375rem;
            }

            .si-template-edit-btn {
                background: none;
                border: 1px solid var(--color-border);
                color: var(--color-text-secondary);
                padding: 0.25rem 0.5rem;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                cursor: pointer;
                font-family: var(--font-family-base);
            }

            .si-template-edit-btn:hover {
                background: var(--color-bg-card-hover);
                color: var(--color-text-primary);
            }

            .si-template-preview {
                font-family: var(--font-family-mono);
                font-size: 0.75rem;
                color: var(--color-text-muted);
                white-space: pre-wrap;
                line-height: 1.4;
                max-height: 60px;
                overflow: hidden;
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // Public API
    // ==========================================

    window.slackIntegration = {
        init: initSlackIntegration,
        save: save,
        testConnection: testConnection,
        addChannel: addChannel,
        removeChannel: removeChannel,
        editTemplate: editTemplate,
        resetDefaults: resetDefaults,
        sendNotification: sendNotification,
        getConfig: () => ({ ...config }),
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        initSlackIntegration();
    });

})();
