// Main Application JavaScript
// Handles data visualization, real-time updates, and user interactions

// Chart instances
let progressChart = null;
let tokenChart = null;
let commandsChart = null;

// Real feature data
let featureData = null;

// Harness status tracking
let harnessStatus = {
    state: 'idle',
    sessionType: null,
    sessionNumber: null,
    lastUpdate: null
};

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function () {
    loadFeatureData().then(() => {
        initializeDashboard();
        setupCharts();
        startRealTimeUpdates();
        initializeHarnessStatusMonitoring();
    });
});

// Load real feature data from feature_list.json
async function loadFeatureData() {
    try {
        const response = await fetch('feature_list.json');
        featureData = await response.json();
        updateProgressMetrics();
    } catch (error) {
        console.error('Failed to load feature data:', error);
        // Fall back to mock data if feature_list.json isn't available
        featureData = null;
    }
}

// Update progress metrics from real feature data
function updateProgressMetrics() {
    if (!featureData) return;

    const totalFeatures = featureData.total_features;
    const passingFeatures = featureData.features.filter(f => f.passes === true).length;
    const pendingFeatures = totalFeatures - passingFeatures;
    const completionPercentage = Math.round((passingFeatures / totalFeatures) * 100);

    // Update metrics
    document.getElementById('features-completed').textContent = passingFeatures;
    document.getElementById('main-progress').style.width = completionPercentage + '%';

    // Update the progress text
    const progressContainer = document.querySelector('.flex.justify-between.mb-1');
    if (progressContainer) {
        progressContainer.querySelector('span:first-child').textContent = `Features: ${passingFeatures}/${totalFeatures}`;
        progressContainer.querySelector('span:last-child').textContent = completionPercentage + '%';
    }

    // Update success rate (same as completion for now)
    document.getElementById('success-rate').textContent = completionPercentage + '%';
}

// Initialize all dashboard components
function initializeDashboard() {
    populateActivityTimeline();
    populateFeaturesTable();
    populateCommandsTable();
    populateGitTimeline();
}

// Populate activity timeline
async function populateActivityTimeline() {
    const timeline = document.getElementById('activity-timeline');
    timeline.innerHTML = '';

    // Try to load session history from claude-progress.txt
    const sessions = await loadSessionHistory();

    if (sessions && sessions.length > 0) {
        // Display sessions in reverse chronological order (most recent first)
        sessions.reverse().forEach(session => {
            const item = document.createElement('div');
            item.className = 'timeline-item';

            // Format the session display
            const actionsHtml = session.actions.slice(0, 3).map(action =>
                `<div style="font-size: 0.875rem; color: var(--color-text-secondary); margin-top: 0.25rem;">• ${action}</div>`
            ).join('');

            const moreActions = session.actions.length > 3
                ? `<div style="font-size: 0.875rem; color: var(--color-text-muted); margin-top: 0.25rem; font-style: italic;">... and ${session.actions.length - 3} more actions</div>`
                : '';

            item.innerHTML = `
        <div class="timeline-content">
          <div class="timeline-time">${session.timestamp}</div>
          <div class="timeline-title">${session.type} Session</div>
          <div class="timeline-description">
            ${actionsHtml}
            ${moreActions}
          </div>
        </div>
      `;
            timeline.appendChild(item);
        });
    } else {
        // Fall back to mock data if session history not available
        mockData.activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
        <div class="timeline-content">
          <div class="timeline-time">${activity.time}</div>
          <div class="timeline-title">${activity.title}</div>
          <div class="timeline-description">${activity.description}</div>
        </div>
      `;
            timeline.appendChild(item);
        });
    }
}

// Load session history from claude-progress.txt
async function loadSessionHistory() {
    try {
        const response = await fetch('claude-progress.txt?' + Date.now());
        if (!response.ok) return null;

        const text = await response.text();
        const sessions = parseProgressFile(text);
        return sessions;
    } catch (error) {
        console.error('Failed to load session history:', error);
        return null;
    }
}

// Parse claude-progress.txt into session objects
function parseProgressFile(text) {
    const sessions = [];
    const lines = text.split('\n');

    let currentSession = null;
    let inSessionBlock = false;

    lines.forEach(line => {
        // Match session headers like "=== Session 2026-01-02T00:00:00Z - CODING ==="
        const sessionMatch = line.match(/^=== Session ([^ ]+) - ([A-Z]+) ===/);
        if (sessionMatch) {
            // Save previous session if exists
            if (currentSession) {
                sessions.push(currentSession);
            }

            // Start new session
            currentSession = {
                timestamp: sessionMatch[1],
                type: sessionMatch[2],
                actions: []
            };
            inSessionBlock = true;
        } else if (inSessionBlock && line.trim().startsWith('-')) {
            // Parse action line (starts with -)
            const action = line.trim().substring(1).trim();
            if (action && !action.startsWith('Feature status:') && !action.startsWith('NEXT:')) {
                currentSession.actions.push(action);
            }
        } else if (inSessionBlock && line.match(/^===/)) {
            // End of session block
            if (currentSession) {
                sessions.push(currentSession);
                currentSession = null;
            }
            inSessionBlock = false;
        }
    });

    // Add last session if exists
    if (currentSession) {
        sessions.push(currentSession);
    }

    return sessions;
}

// Populate features table
function populateFeaturesTable(filter = 'all') {
    const tbody = document.getElementById('features-tbody');
    tbody.innerHTML = '';

    // Use real feature data if available, otherwise fall back to mock data
    const sourceFeatures = featureData ? featureData.features : mockData.features;

    let filteredFeatures;
    if (featureData) {
        // Filter real features
        if (filter === 'passing') {
            filteredFeatures = sourceFeatures.filter(f => f.passes === true);
        } else if (filter === 'pending') {
            filteredFeatures = sourceFeatures.filter(f => f.passes === false);
        } else {
            filteredFeatures = sourceFeatures;
        }
    } else {
        // Filter mock features
        if (filter === 'passing') {
            filteredFeatures = sourceFeatures.filter(f => f.status === 'passing');
        } else if (filter === 'pending') {
            filteredFeatures = sourceFeatures.filter(f => f.status === 'pending');
        } else {
            filteredFeatures = sourceFeatures;
        }
    }

    // Group features by category if using real data
    if (featureData && filteredFeatures.length > 0) {
        const groupedByCategory = {};

        // Group features
        filteredFeatures.forEach(feature => {
            const category = feature.category || 'other';
            if (!groupedByCategory[category]) {
                groupedByCategory[category] = [];
            }
            groupedByCategory[category].push(feature);
        });

        // Sort categories
        const sortedCategories = Object.keys(groupedByCategory).sort();

        // Display each category
        sortedCategories.forEach(category => {
            // Add category header row
            const headerRow = document.createElement('tr');
            headerRow.className = 'category-header';
            headerRow.innerHTML = `
        <td colspan="4" style="background: var(--color-bg-secondary); font-weight: 600; padding: 0.75rem; text-transform: capitalize;">
          📁 ${category} (${groupedByCategory[category].length} features)
        </td>
      `;
            tbody.appendChild(headerRow);

            // Add features in this category
            groupedByCategory[category].forEach(feature => {
                const row = document.createElement('tr');

                const statusBadge = feature.passes
                    ? '<span class="badge badge-success">✓ Passing</span>'
                    : '<span class="badge badge-warning">⏳ Pending</span>';
                const featureName = feature.description;
                const featureId = feature.id;
                const timeSpent = feature.implemented_at
                    ? new Date(feature.implemented_at).toLocaleDateString()
                    : '-';

                row.innerHTML = `
          <td style="font-family: var(--font-family-mono); padding-left: 2rem;">${featureId}</td>
          <td>${featureName}</td>
          <td>${statusBadge}</td>
          <td>${timeSpent}</td>
        `;
                tbody.appendChild(row);
            });
        });
    } else {
        // Display without grouping (for mock data or when no real data)
        const displayFeatures = filteredFeatures.slice(0, 20);

        displayFeatures.forEach(feature => {
            const row = document.createElement('tr');

            let statusBadge, featureName, featureId, timeSpent;

            if (featureData) {
                // Use real feature data format
                statusBadge = feature.passes
                    ? '<span class="badge badge-success">✓ Passing</span>'
                    : '<span class="badge badge-warning">⏳ Pending</span>';
                featureName = feature.description;
                featureId = feature.id;
                timeSpent = feature.implemented_at
                    ? new Date(feature.implemented_at).toLocaleDateString()
                    : '-';
            } else {
                // Use mock data format
                statusBadge = feature.status === 'passing'
                    ? '<span class="badge badge-success">✓ Passing</span>'
                    : '<span class="badge badge-warning">⏳ Pending</span>';
                featureName = feature.name;
                featureId = feature.id;
                timeSpent = feature.timeSpent;
            }

            row.innerHTML = `
        <td style="font-family: var(--font-family-mono);">${featureId}</td>
        <td>${featureName}</td>
        <td>${statusBadge}</td>
        <td>${timeSpent}</td>
      `;
            tbody.appendChild(row);
        });

        // Add "show more" row if there are more features
        if (filteredFeatures.length > 20) {
            const moreRow = document.createElement('tr');
            moreRow.innerHTML = `
        <td colspan="4" style="text-align: center; color: var(--color-text-muted); font-style: italic;">
          ... and ${filteredFeatures.length - 20} more features
        </td>
      `;
            tbody.appendChild(moreRow);
        }
    }
}

// Filter features
function filterFeatures(filter) {
    populateFeaturesTable(filter);
}

// Populate commands table
function populateCommandsTable() {
    const tbody = document.getElementById('commands-tbody');
    tbody.innerHTML = '';

    // Show only last 10 commands
    const recentCommands = mockData.commands.slice(0, 10);

    recentCommands.forEach(cmd => {
        const row = document.createElement('tr');
        const statusBadge = cmd.status === 'success'
            ? '<span class="badge badge-success">✓ Success</span>'
            : '<span class="badge badge-error">✗ Failed</span>';

        row.innerHTML = `
      <td style="font-size: 0.75rem; color: var(--color-text-muted);">${cmd.time}</td>
      <td><code style="font-size: 0.75rem;">${cmd.command}</code></td>
      <td>${statusBadge}</td>
      <td style="font-size: 0.875rem;">${cmd.output}</td>
    `;
        tbody.appendChild(row);
    });
}

// Populate git timeline
function populateGitTimeline() {
    const timeline = document.getElementById('git-timeline');
    timeline.innerHTML = '';

    mockData.gitCommits.forEach(commit => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
      <div class="timeline-content">
        <div class="timeline-time">${commit.time}</div>
        <div class="timeline-title">
          <code style="color: var(--color-primary);">${commit.hash}</code> 
          ${commit.message}
        </div>
        <div class="timeline-description">
          ${commit.files} file${commit.files !== 1 ? 's' : ''} changed
        </div>
      </div>
    `;
        timeline.appendChild(item);
    });
}

// Setup all charts
function setupCharts() {
    setupProgressChart();
    setupTokenChart();
    setupCommandsChart();
}

// Setup progress timeline chart
function setupProgressChart(view = 'all') {
    const ctx = document.getElementById('progress-chart').getContext('2d');

    if (progressChart) {
        progressChart.destroy();
    }

    const data = view === 'all'
        ? mockData.progressTimelineAll
        : mockData.progressTimeline;

    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Features Completed',
                data: data.data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9',
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 34, 52, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148, 163, 184, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter' }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter' }
                    }
                }
            }
        }
    });
}

// Update chart view
function updateChartView(view) {
    setupProgressChart(view);
}

// Setup token usage chart
function setupTokenChart() {
    const ctx = document.getElementById('token-chart').getContext('2d');

    tokenChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mockData.tokenUsage.labels,
            datasets: [
                {
                    label: 'Input Tokens',
                    data: mockData.tokenUsage.input,
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: '#6366f1',
                    borderWidth: 1
                },
                {
                    label: 'Output Tokens',
                    data: mockData.tokenUsage.output,
                    backgroundColor: 'rgba(139, 92, 246, 0.6)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9',
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 34, 52, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148, 163, 184, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += (context.parsed.y / 1000).toFixed(1) + 'K tokens';
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter' },
                        callback: function (value) {
                            return (value / 1000) + 'K';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter' }
                    }
                }
            }
        }
    });
}

// Setup commands chart
function setupCommandsChart() {
    const ctx = document.getElementById('commands-chart').getContext('2d');

    commandsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: mockData.commandStats.labels,
            datasets: [{
                data: mockData.commandStats.counts,
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(6, 182, 212, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(59, 130, 246, 0.8)'
                ],
                borderColor: '#1a2234',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#f1f5f9',
                        font: { family: 'Inter', size: 12 },
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 34, 52, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148, 163, 184, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed + ' executions';
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Real-time updates - poll for feature_list.json changes
function startRealTimeUpdates() {
    // Poll for feature_list.json changes every 3 seconds
    setInterval(async () => {
        try {
            const response = await fetch('feature_list.json?' + Date.now()); // Cache bust
            const newData = await response.json();

            // Check if data has changed
            const oldPassingCount = featureData ? featureData.features.filter(f => f.passes === true).length : 0;
            const newPassingCount = newData.features.filter(f => f.passes === true).length;

            if (oldPassingCount !== newPassingCount || !featureData) {
                featureData = newData;
                updateProgressMetrics();
                populateFeaturesTable();
            }
        } catch (error) {
            console.error('Failed to poll feature data:', error);
        }
    }, 3000);

    // Pulse the status dot
    const statusDot = document.querySelector('.status-dot');
    setInterval(() => {
        statusDot.style.opacity = statusDot.style.opacity === '0.5' ? '1' : '0.5';
    }, 1000);
}

// Update progress
function updateProgress(newValue) {
    const percentage = Math.round((newValue / 200) * 100);

    document.getElementById('features-completed').textContent = newValue;
    document.getElementById('main-progress').style.width = percentage + '%';

    // Update success rate
    const successRate = Math.round((newValue / newValue) * 100);
    document.getElementById('success-rate').textContent = successRate + '%';

    // Add new activity
    const newActivity = {
        time: 'Just now',
        title: 'Feature Completed',
        description: `✅ Feature #${newValue} - Tests passing`,
        type: 'success'
    };

    mockData.activities.unshift(newActivity);
    mockData.activities = mockData.activities.slice(0, 8); // Keep only last 8
    populateActivityTimeline();
}

// View session details (placeholder)
function viewSession(sessionId) {
    const session = mockData.sessions.find(s => s.id === sessionId);
    if (session) {
        alert(`Session ${session.id} Details:\n\nType: ${session.type}\nFeatures: ${session.features}\nDuration: ${session.duration}\nStatus: ${session.status}\nCommits: ${session.commits}\nTokens: ${session.tokens.toLocaleString()}`);
    }
}

// Initialize harness status monitoring
function initializeHarnessStatusMonitoring() {
    // Listen to harness client events if available
    if (typeof harnessClient !== 'undefined') {
        harnessClient.on('harness:started', (data) => {
            updateHarnessStatus('running', data.sessionType, data.sessionNumber);
        });

        harnessClient.on('harness:stopped', () => {
            updateHarnessStatus('idle');
        });

        harnessClient.on('harness:error', () => {
            updateHarnessStatus('error');
        });
    }

    // Poll harness status periodically
    pollHarnessStatus();
    setInterval(pollHarnessStatus, 5000);
}

// Poll harness status from API or local files
async function pollHarnessStatus() {
    try {
        // Try to get status from API if harness client is available
        if (typeof harnessClient !== 'undefined' && window.currentProjectId) {
            const status = await harnessClient.getStatus(window.currentProjectId);
            updateHarnessStatus(status.status, status.sessionType, status.sessionNumber);
        } else {
            // Fall back to checking local harness-status.json file
            const response = await fetch('harness-status.json?' + Date.now());
            if (response.ok) {
                const status = await response.json();
                // Handle the actual harness-status.json format
                updateHarnessStatus(
                    status.status || 'idle',
                    status.sessionType,
                    status.sessionNumber || null
                );
            }
        }
    } catch (error) {
        // Silently fail - harness might not be running
        console.debug('Could not poll harness status:', error.message);
    }
}

// Update harness status in the UI
function updateHarnessStatus(state, sessionType = null, sessionNumber = null) {
    harnessStatus.state = state;
    harnessStatus.sessionType = sessionType;
    harnessStatus.sessionNumber = sessionNumber;
    harnessStatus.lastUpdate = new Date();

    const statusBadge = document.getElementById('agent-status');
    const statusText = document.getElementById('status-text');
    const statusDot = statusBadge?.querySelector('.status-dot');

    if (!statusBadge || !statusText || !statusDot) return;

    // Update status dot class
    statusDot.className = 'status-dot';
    if (state === 'running') {
        statusDot.classList.add('active');
    } else if (state === 'error') {
        statusDot.classList.add('error');
    } else {
        statusDot.classList.add('idle');
    }

    // Build status text
    let text = '';
    const stateLabels = {
        'idle': 'Idle',
        'running': 'Running',
        'error': 'Error',
        'stopping': 'Stopping',
        'starting': 'Starting'
    };

    text = stateLabels[state] || state;

    // Add session info when running
    if (state === 'running' && (sessionNumber || sessionType)) {
        if (sessionNumber) {
            text += ` - Session ${sessionNumber}`;
        }
        if (sessionType) {
            text += ` (${sessionType})`;
        }
    }

    // Add last update timestamp
    if (harnessStatus.lastUpdate) {
        const timeAgo = getTimeAgo(harnessStatus.lastUpdate);
        text += ` • ${timeAgo}`;
    }

    statusText.textContent = text;
}

// Helper function to get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ==========================================
// Theme Toggle Functionality (feat-008)
// ==========================================

// Initialize theme from localStorage
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}

// Apply theme to the document
function applyTheme(theme) {
    const root = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');

    if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        root.removeAttribute('data-theme');
        if (themeToggle) themeToggle.textContent = '🌙';
    }

    localStorage.setItem('theme', theme);
}

// Toggle between light and dark themes
function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// Set up theme toggle button
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    initializeTheme();

    // Add click event to theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

// Export functions to global scope
window.filterFeatures = filterFeatures;
window.updateChartView = updateChartView;
window.viewSession = viewSession;
window.toggleTheme = toggleTheme;
