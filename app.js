// Main Application JavaScript
// Handles data visualization, real-time updates, and user interactions

// Chart instances
let progressChart = null;
let tokenChart = null;
let commandsChart = null;
let categoryChart = null;

// Real feature data
let featureData = null;
let sessionData = null;
let progressTimelineData = null;

// Harness status tracking
let harnessStatus = {
    state: 'idle',
    sessionType: null,
    sessionNumber: null,
    lastUpdate: null
};

// Notification settings
let notificationsEnabled = false;
let lastNotifiedFeatureCount = 0;
let notificationPermission = 'default';

// Audio alert settings
let audioEnabled = false;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function () {
    // Show loading states
    showInitialLoadingStates();

    loadFeatureData().then(() => {
        initializeDashboard();
        setupCharts();
        startRealTimeUpdates();
        initializeHarnessStatusMonitoring();
        initializeNotifications();
        initializeAudio();

        // Hide loading states after data is loaded
        hideInitialLoadingStates();
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

        // Update progress chart with real data
        if (progressTimelineData) {
            setupProgressChart();
        }
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

        // Store session data globally
        sessionData = sessions;

        // Extract progress timeline data
        progressTimelineData = extractProgressTimeline(sessions);

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
                actions: [],
                featuresCompleted: 0
            };
            inSessionBlock = true;
        } else if (inSessionBlock && line.trim().startsWith('-')) {
            // Parse action line (starts with -)
            const action = line.trim().substring(1).trim();

            // Extract feature count from "Feature status: X/Y passing"
            const featureMatch = action.match(/Feature status: (\d+)\/\d+ passing/);
            if (featureMatch) {
                currentSession.featuresCompleted = parseInt(featureMatch[1], 10);
            }

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

// Extract progress timeline data from sessions
function extractProgressTimeline(sessions) {
    if (!sessions || sessions.length === 0) {
        return null;
    }

    const labels = [];
    const data = [];

    sessions.forEach((session, index) => {
        // Format timestamp as readable label
        const date = new Date(session.timestamp);
        const timeLabel = date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        labels.push(`Session ${index + 1}\n${timeLabel}`);
        data.push(session.featuresCompleted);
    });

    return { labels, data };
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
    setupCategoryChart();
    setupTokenChart();
    setupCommandsChart();
}

// Setup progress timeline chart
function setupProgressChart(view = 'all') {
    const ctx = document.getElementById('progress-chart').getContext('2d');

    if (progressChart) {
        progressChart.destroy();
    }

    // Use real data if available, otherwise fall back to mock data
    let data;
    if (progressTimelineData && progressTimelineData.labels.length > 0) {
        data = progressTimelineData;
    } else {
        data = view === 'all'
            ? mockData.progressTimelineAll
            : mockData.progressTimeline;
    }

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
                        font: { family: 'Inter' },
                        stepSize: 1
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

// Setup category breakdown chart
function setupCategoryChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');

    if (categoryChart) {
        categoryChart.destroy();
    }

    // Extract category data from feature_list.json
    let categoryData = extractCategoryData();

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categoryData.labels,
            datasets: [
                {
                    label: 'Passing',
                    data: categoryData.passing,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: '#22c55e',
                    borderWidth: 1
                },
                {
                    label: 'Pending',
                    data: categoryData.pending,
                    backgroundColor: 'rgba(251, 191, 36, 0.7)',
                    borderColor: '#fbbf24',
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
                        afterBody: function(context) {
                            const categoryIndex = context[0].dataIndex;
                            const total = categoryData.passing[categoryIndex] + categoryData.pending[categoryIndex];
                            const passing = categoryData.passing[categoryIndex];
                            const percentage = Math.round((passing / total) * 100);
                            return `Total: ${total} | Pass Rate: ${percentage}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter' },
                        stepSize: 1
                    }
                },
                x: {
                    stacked: true,
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

// Extract category data from feature list
function extractCategoryData() {
    if (!featureData || !featureData.features) {
        // Return mock data if no real data available
        return {
            labels: ['core', 'control', 'ui'],
            passing: [2, 1, 2],
            pending: [1, 1, 0]
        };
    }

    // Group features by category
    const categories = {};
    featureData.features.forEach(feature => {
        const category = feature.category || 'other';
        if (!categories[category]) {
            categories[category] = { passing: 0, pending: 0 };
        }
        if (feature.passes) {
            categories[category].passing++;
        } else {
            categories[category].pending++;
        }
    });

    // Convert to chart data format
    const labels = Object.keys(categories).sort();
    const passing = labels.map(cat => categories[cat].passing);
    const pending = labels.map(cat => categories[cat].pending);

    return { labels, passing, pending };
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

// WebSocket connection for real-time updates
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
let fallbackPolling = null;

// Real-time updates - WebSocket with fallback to polling
function startRealTimeUpdates() {
    // Try to connect via WebSocket
    connectWebSocket();

    // Pulse the status dot
    const statusDot = document.querySelector('.status-dot');
    setInterval(() => {
        statusDot.style.opacity = statusDot.style.opacity === '0.5' ? '1' : '0.5';
    }, 1000);
}

// Connect to WebSocket server
function connectWebSocket() {
    try {
        const BACKEND_URL = 'http://localhost:3434';

        // Initialize Socket.IO client
        socket = io(BACKEND_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: RECONNECT_DELAY,
            timeout: 10000
        });

        // Connection successful
        socket.on('connect', () => {
            console.log('WebSocket connected:', socket.id);
            reconnectAttempts = 0;

            // Clear any fallback polling
            if (fallbackPolling) {
                clearInterval(fallbackPolling);
                fallbackPolling = null;
            }

            // Subscribe to updates for the current project
            const projectId = window.currentProjectId || 'default';
            socket.emit('subscribe', projectId);

            // Update status indicator
            updateConnectionStatus('connected');
        });

        // Listen for feature updates
        socket.on('agent_event', (event) => {
            console.log('Received agent event:', event);

            if (event.event === 'features:updated') {
                handleFeaturesUpdate(event.data);
            } else if (event.event === 'progress:updated') {
                handleProgressUpdate(event.data);
            }
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            updateConnectionStatus('disconnected');
        });

        // Handle connection errors
        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            reconnectAttempts++;

            // Fall back to polling after max reconnect attempts
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.warn('Max reconnect attempts reached, falling back to polling');
                fallbackToPolling();
            }

            updateConnectionStatus('error');
        });

        // Handle reconnection attempts
        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('Reconnection attempt:', attemptNumber);
            updateConnectionStatus('reconnecting');
        });

        // Handle successful reconnection
        socket.on('reconnect', (attemptNumber) => {
            console.log('WebSocket reconnected after', attemptNumber, 'attempts');
            reconnectAttempts = 0;
            updateConnectionStatus('connected');
        });

    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        fallbackToPolling();
    }
}

// Handle feature updates from WebSocket
function handleFeaturesUpdate(data) {
    if (!data || !data.features) return;

    // Update feature data
    const oldPassingCount = featureData ? featureData.features.filter(f => f.passes === true).length : 0;
    const newPassingCount = data.passing || 0;

    // Check for newly completed features
    if (featureData && data.features && newPassingCount > lastNotifiedFeatureCount) {
        // Find the newly completed feature(s)
        const oldFeatures = featureData.features;
        const newFeatures = data.features;

        newFeatures.forEach(newFeature => {
            if (newFeature.passes) {
                const oldFeature = oldFeatures.find(f => f.id === newFeature.id);
                if (!oldFeature || !oldFeature.passes) {
                    // This is a newly completed feature
                    notifyFeatureCompletion(newFeature.id, newFeature.description);
                }
            }
        });

        lastNotifiedFeatureCount = newPassingCount;
    }

    // Update our local feature data
    if (featureData) {
        featureData.features = data.features;
    }

    // Only update UI if data actually changed
    if (oldPassingCount !== newPassingCount || !featureData) {
        updateProgressMetrics();
        populateFeaturesTable();
        setupCategoryChart();
    }
}

// Handle progress updates from WebSocket
function handleProgressUpdate(data) {
    if (!data || !data.sessions) return;

    // Refresh the activity timeline
    populateActivityTimeline();
}

// Update connection status indicator
function updateConnectionStatus(status) {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');

    if (!statusText || !statusDot) return;

    switch (status) {
        case 'connected':
            statusDot.classList.add('active');
            statusDot.classList.remove('error');
            if (harnessStatus.state === 'running') {
                statusText.textContent = `Active - Session ${harnessStatus.sessionNumber || ''}`;
            } else {
                statusText.textContent = 'Connected';
            }
            break;
        case 'disconnected':
        case 'reconnecting':
            statusDot.classList.remove('active', 'error');
            statusText.textContent = 'Reconnecting...';
            break;
        case 'error':
            statusDot.classList.remove('active');
            statusDot.classList.add('error');
            statusText.textContent = 'Connection Error';
            break;
    }
}

// Fallback to polling if WebSocket fails
function fallbackToPolling() {
    if (fallbackPolling) return; // Already polling

    console.log('Starting fallback polling mode');

    // Close WebSocket if it exists
    if (socket) {
        socket.close();
        socket = null;
    }

    // Poll for feature_list.json changes every 3 seconds
    fallbackPolling = setInterval(async () => {
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

    updateConnectionStatus('error');
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
    const previousState = harnessStatus.state;
    const previousSessionNumber = harnessStatus.sessionNumber;

    harnessStatus.state = state;
    harnessStatus.sessionType = sessionType;
    harnessStatus.sessionNumber = sessionNumber;
    harnessStatus.lastUpdate = new Date();

    // Send notifications on state changes
    if (previousState === 'running' && state === 'idle') {
        // Session ended
        notifySessionEnd(harnessStatus.sessionType || 'Coding', previousSessionNumber);
    } else if (state === 'error' && previousState !== 'error') {
        // Error occurred
        notifyError('The harness encountered an error. Check the logs for details.');
    }

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

// ==========================================
// Live Log Viewer (feat-014)
// ==========================================

let autoScroll = true;
let logUpdateInterval = null;
let lastLogPosition = 0;

// Initialize log viewer
function initializeLogViewer() {
    // Start polling for new log content
    startLogPolling();

    // Set up WebSocket listener if available
    if (window.harnessClient) {
        window.harnessClient.on('log', handleLogMessage);
    }
}

// Start polling for log updates
function startLogPolling() {
    if (logUpdateInterval) {
        clearInterval(logUpdateInterval);
    }

    // Poll harness output log file every 2 seconds
    logUpdateInterval = setInterval(async () => {
        await fetchHarnessLogs();
    }, 2000);
}

// Fetch harness logs from file
async function fetchHarnessLogs() {
    try {
        // Try to fetch harness-output.log
        const response = await fetch('harness-output.log');
        if (response.ok) {
            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());

            // Only process new lines
            if (lines.length > lastLogPosition) {
                const newLines = lines.slice(lastLogPosition);
                newLines.forEach(line => appendLogLine(line));
                lastLogPosition = lines.length;
            }

            updateLogStatus('Live');
        }
    } catch (error) {
        // Log file not available, that's okay
        updateLogStatus('Idle');
    }
}

// Handle log message from WebSocket
function handleLogMessage(data) {
    if (data.message) {
        appendLogLine(data.message, data.level || 'info');
    }
}

// Append a line to the log viewer
function appendLogLine(message, level = 'info') {
    const logContent = document.getElementById('log-content');
    if (!logContent) return;

    // Remove the "Waiting for harness output..." message if it exists
    const waitingMessage = logContent.querySelector('.log-line.log-info');
    if (waitingMessage && waitingMessage.textContent.includes('Waiting for')) {
        logContent.innerHTML = '';
    }

    const logLine = document.createElement('div');
    logLine.className = `log-line log-${detectLogLevel(message, level)}`;

    // Add timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'log-timestamp';
    timestampSpan.textContent = timestamp;

    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    logLine.appendChild(timestampSpan);
    logLine.appendChild(messageSpan);
    logContent.appendChild(logLine);

    // Auto-scroll to bottom if enabled
    if (autoScroll) {
        logContent.scrollTop = logContent.scrollHeight;
    }

    // Limit log lines to 1000 to prevent memory issues
    while (logContent.children.length > 1000) {
        logContent.removeChild(logContent.firstChild);
    }
}

// Detect log level from message content
function detectLogLevel(message, defaultLevel = 'info') {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('✗')) {
        return 'error';
    } else if (lowerMessage.includes('warning') || lowerMessage.includes('warn')) {
        return 'warning';
    } else if (lowerMessage.includes('success') || lowerMessage.includes('✓') || lowerMessage.includes('completed')) {
        return 'success';
    } else if (lowerMessage.includes('debug') || lowerMessage.includes('trace')) {
        return 'debug';
    }

    return defaultLevel;
}

// Toggle auto-scroll functionality
function toggleAutoScroll() {
    autoScroll = !autoScroll;

    const button = document.getElementById('toggle-autoscroll');
    const icon = document.getElementById('autoscroll-icon');

    if (autoScroll) {
        button.innerHTML = '<span id="autoscroll-icon">⏸️</span> Pause';
        // Scroll to bottom when re-enabling
        const logContent = document.getElementById('log-content');
        if (logContent) {
            logContent.scrollTop = logContent.scrollHeight;
        }
    } else {
        button.innerHTML = '<span id="autoscroll-icon">▶️</span> Resume';
    }
}

// Clear all logs
function clearLogs() {
    const logContent = document.getElementById('log-content');
    if (logContent) {
        logContent.innerHTML = '<div class="log-line log-info">Logs cleared. Waiting for new output...</div>';
        lastLogPosition = 0;
    }
}

// Update log status badge
function updateLogStatus(status) {
    const statusBadge = document.getElementById('log-status');
    if (statusBadge) {
        statusBadge.textContent = status;
        statusBadge.className = status === 'Live' ? 'badge badge-success' : 'badge badge-secondary';
    }
}

// Initialize log viewer on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeLogViewer();
});

// ============================================================================
// BROWSER NOTIFICATIONS
// ============================================================================

// Initialize notifications system
function initializeNotifications() {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return;
    }

    // Load saved preference
    const savedPref = localStorage.getItem('notificationsEnabled');
    notificationsEnabled = savedPref === 'true';
    notificationPermission = Notification.permission;

    // Update UI if toggle exists
    const toggle = document.getElementById('notifications-toggle');
    if (toggle) {
        toggle.checked = notificationsEnabled;
    }

    // Initialize the last notified count
    if (featureData) {
        lastNotifiedFeatureCount = featureData.features.filter(f => f.passes === true).length;
    }

    console.log('Notifications initialized:', { enabled: notificationsEnabled, permission: notificationPermission });
}

// Toggle notifications on/off
async function toggleNotifications() {
    if (!('Notification' in window)) {
        alert('Your browser does not support notifications');
        return;
    }

    if (notificationsEnabled) {
        // Disable notifications
        notificationsEnabled = false;
        localStorage.setItem('notificationsEnabled', 'false');
        console.log('Notifications disabled');
    } else {
        // Request permission if not granted
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            notificationPermission = permission;
        }

        if (Notification.permission === 'granted') {
            notificationsEnabled = true;
            localStorage.setItem('notificationsEnabled', 'true');
            console.log('Notifications enabled');

            // Send a test notification
            sendNotification('Notifications Enabled', {
                body: 'You will now receive notifications for feature completions and errors',
                icon: '🔔'
            });
        } else {
            alert('Please allow notifications in your browser settings');
            notificationsEnabled = false;
            localStorage.setItem('notificationsEnabled', 'false');
        }
    }

    // Update toggle UI
    const toggle = document.getElementById('notifications-toggle');
    if (toggle) {
        toggle.checked = notificationsEnabled;
    }
}

// Send a browser notification
function sendNotification(title, options = {}) {
    if (!notificationsEnabled || Notification.permission !== 'granted') {
        return;
    }

    const defaultOptions = {
        icon: options.icon || '🤖',
        badge: '🤖',
        timestamp: Date.now(),
        requireInteraction: false
    };

    const notification = new Notification(title, {
        ...defaultOptions,
        ...options
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Click to focus window
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}

// Notify on feature completion
function notifyFeatureCompletion(featureId, featureDescription) {
    sendNotification('Feature Completed! 🎉', {
        body: `${featureId}: ${featureDescription}`,
        icon: '✅'
    });
    playSuccessSound();
}

// Notify on session end
function notifySessionEnd(sessionType, sessionNumber) {
    sendNotification('Session Ended', {
        body: `${sessionType} session ${sessionNumber || ''} has completed`,
        icon: '🏁'
    });
    playSuccessSound();
}

// Notify on error
function notifyError(errorMessage) {
    sendNotification('Error Occurred', {
        body: errorMessage,
        icon: '❌',
        requireInteraction: true
    });
    playErrorSound();
}

// ============================================================================
// AUDIO ALERTS
// ============================================================================

// Initialize audio alerts
function initializeAudio() {
    // Load audio preference from localStorage
    const savedPref = localStorage.getItem('audioEnabled');
    audioEnabled = savedPref === 'true';

    // Update toggle UI
    const toggle = document.getElementById('audio-toggle');
    if (toggle) {
        toggle.checked = audioEnabled;
    }
}

// Toggle audio alerts
function toggleAudio() {
    audioEnabled = !audioEnabled;
    localStorage.setItem('audioEnabled', audioEnabled.toString());

    // Update toggle UI
    const toggle = document.getElementById('audio-toggle');
    if (toggle) {
        toggle.checked = audioEnabled;
    }

    // Play test sound
    if (audioEnabled) {
        playSuccessSound();
    }
}

// Play success sound (for feature completion)
function playSuccessSound() {
    if (!audioEnabled) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Pleasant ascending chime
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.error('Error playing success sound:', error);
    }
}

// Play error sound (for errors)
function playErrorSound() {
    if (!audioEnabled) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Descending warning tone
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        oscillator.frequency.setValueAtTime(392, audioContext.currentTime + 0.15); // G4
        oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime + 0.3); // F4

        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.error('Error playing error sound:', error);
    }
}

// ============================================================================
// MULTI-PROJECT SUPPORT
// ============================================================================

// Project management state
let projectsConfig = null;
let currentProject = null;
let sidebarExpanded = true;

// Initialize projects on page load
document.addEventListener('DOMContentLoaded', async function() {
    await loadProjects();
    initializeProjectSidebar();
});

// Load projects configuration
async function loadProjects() {
    try {
        const response = await fetch('projects.json');
        projectsConfig = await response.json();

        // Get active project from localStorage or use default
        const savedProjectId = localStorage.getItem('currentProjectId');
        const activeProject = projectsConfig.projects.find(p => p.id === savedProjectId) ||
                             projectsConfig.projects.find(p => p.id === projectsConfig.defaultProject) ||
                             projectsConfig.projects[0];

        if (activeProject) {
            await switchProject(activeProject.id);
        }
    } catch (error) {
        console.error('Failed to load projects configuration:', error);
        // Continue with single-project mode
    }
}

// Initialize project sidebar
function initializeProjectSidebar() {
    if (!projectsConfig) return;

    renderProjectsList();

    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('projectSidebarExpanded');
    sidebarExpanded = savedState === null ? true : savedState === 'true';
    updateSidebarState();
}

// Render projects list in sidebar
function renderProjectsList() {
    if (!projectsConfig) return;

    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    projectsList.innerHTML = '';

    projectsConfig.projects.forEach(project => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item' + (currentProject && currentProject.id === project.id ? ' active' : '');
        projectItem.onclick = () => switchProject(project.id);

        projectItem.innerHTML = `
            <div class="project-icon" style="background-color: ${project.color}20; color: ${project.color};">
                ${project.icon}
            </div>
            <div class="project-details">
                <div class="project-name">${project.name}</div>
                <div class="project-description">${project.description}</div>
            </div>
        `;

        projectsList.appendChild(projectItem);
    });
}

// Switch to a different project
async function switchProject(projectId) {
    if (!projectsConfig) return;

    const project = projectsConfig.projects.find(p => p.id === projectId);
    if (!project) return;

    currentProject = project;
    localStorage.setItem('currentProjectId', projectId);

    // Update active state in sidebar
    renderProjectsList();

    // Update page title and header
    updateProjectContext();

    // Reload all dashboard data for the new project
    await loadProjectData(project);

    console.log('Switched to project:', project.name);
}

// Update project context in UI
function updateProjectContext() {
    if (!currentProject) return;

    // Update logo with project icon
    const logoIcon = document.querySelector('.logo-icon');
    if (logoIcon) {
        logoIcon.textContent = currentProject.icon;
    }

    // Update page title
    document.title = `${currentProject.name} - Autonomous Coding Dashboard`;
}

// Load data for specific project
async function loadProjectData(project) {
    // In a real implementation, this would:
    // 1. Update API base URL to point to project's backend
    // 2. Load project-specific feature_list.json
    // 3. Load project-specific claude-progress.txt
    // 4. Reload all charts and data

    // For now, we'll reload the current data
    // (In a full implementation, each project would have its own data files)

    console.log('Loading data for project:', project.name);

    // Reload feature data
    await loadFeatureData();

    // Refresh all dashboard components
    if (typeof initializeDashboard === 'function') {
        initializeDashboard();
    }
    if (typeof setupCharts === 'function') {
        setupCharts();
    }
}

// Toggle project sidebar visibility
function toggleProjectSidebar() {
    sidebarExpanded = !sidebarExpanded;
    localStorage.setItem('projectSidebarExpanded', sidebarExpanded.toString());
    updateSidebarState();
}

// Update sidebar expand/collapse state
function updateSidebarState() {
    const sidebar = document.getElementById('project-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');

    if (!sidebar) return;

    if (sidebarExpanded) {
        sidebar.classList.remove('collapsed');
        if (toggleBtn) {
            toggleBtn.querySelector('span').textContent = '◀';
        }
    } else {
        sidebar.classList.add('collapsed');
        if (toggleBtn) {
            toggleBtn.querySelector('span').textContent = '▶';
        }
    }
}

// Add new project - opens modal wizard
function addNewProject() {
    const modal = document.getElementById('add-project-modal');
    modal.style.display = 'flex';

    // Reset form
    document.getElementById('add-project-form').reset();
    document.getElementById('validation-message').style.display = 'none';
}

// Close add project modal
function closeAddProjectModal() {
    const modal = document.getElementById('add-project-modal');
    modal.style.display = 'none';
}

// Submit new project form
async function submitNewProject(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = document.getElementById('submit-project-btn');
    const validationMsg = document.getElementById('validation-message');

    // Get form values
    const name = form.name.value.trim();
    const path = form.path.value.trim();
    const description = form.description.value.trim();
    const icon = form.icon.value.trim() || '📁';
    const color = form.color.value;

    // Basic validation
    if (!name || !path) {
        showValidationMessage('Please fill in all required fields', 'error');
        return;
    }

    // Show loading state
    setButtonLoading(submitBtn, true);
    const originalText = submitBtn.textContent;

    try {
        // Validate path exists via backend API
        submitBtn.textContent = 'Validating...';
        const validationResponse = await fetch('http://localhost:3434/api/projects/validate-path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });

        const validation = await validationResponse.json();

        if (!validation.exists) {
            showValidationMessage('Project path does not exist. Please enter a valid directory path.', 'error');
            setButtonLoading(submitBtn, false);
            submitBtn.textContent = originalText;
            return;
        }

        // Create project ID from name
        const projectId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Create new project object
        const newProject = {
            id: projectId,
            name,
            path,
            description,
            icon,
            color,
            active: false
        };

        // Add to projects via backend API
        submitBtn.textContent = 'Adding...';
        const addResponse = await fetch('http://localhost:3434/api/projects/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProject)
        });

        if (!addResponse.ok) {
            throw new Error('Failed to add project');
        }

        // Success - reload projects
        showValidationMessage('Project added successfully!', 'success');

        setTimeout(() => {
            closeAddProjectModal();
            // Reload projects list
            loadProjects();
        }, 1000);

    } catch (error) {
        console.error('Error adding project:', error);
        showValidationMessage('Failed to add project. Please try again.', 'error');
        setButtonLoading(submitBtn, false);
        submitBtn.textContent = originalText;
    }
}

// Show validation message
function showValidationMessage(message, type) {
    const validationMsg = document.getElementById('validation-message');
    validationMsg.textContent = message;
    validationMsg.className = `validation-message ${type}`;
    validationMsg.style.display = 'block';
}

// ===== HARNESS SETTINGS MANAGEMENT =====

// Harness settings with defaults
let harnessSettings = {
    maxSessions: 100,
    sessionDelay: 5
};

// Load settings from localStorage
function loadHarnessSettings() {
    try {
        const saved = localStorage.getItem('harnessSettings');
        if (saved) {
            harnessSettings = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load harness settings:', error);
    }
}

// Save settings to localStorage
function saveHarnessSettings() {
    try {
        localStorage.setItem('harnessSettings', JSON.stringify(harnessSettings));
    } catch (error) {
        console.error('Failed to save harness settings:', error);
    }
}

// Open settings modal
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';

    // Load current settings into form
    document.getElementById('max-sessions').value = harnessSettings.maxSessions;
    document.getElementById('session-delay').value = harnessSettings.sessionDelay;

    // Hide validation message
    document.getElementById('settings-validation-message').style.display = 'none';
}

// Close settings modal
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'none';
}

// Save settings
async function saveSettings(event) {
    event.preventDefault();

    const form = event.target;
    const saveBtn = document.getElementById('save-settings-btn');
    const validationMsg = document.getElementById('settings-validation-message');

    // Get form values
    const maxSessions = parseInt(form.maxSessions.value);
    const sessionDelay = parseInt(form.sessionDelay.value);

    // Validation
    if (maxSessions < 1 || maxSessions > 1000) {
        showSettingsValidationMessage('Max sessions must be between 1 and 1000', 'error');
        return;
    }

    if (sessionDelay < 0 || sessionDelay > 300) {
        showSettingsValidationMessage('Session delay must be between 0 and 300 seconds', 'error');
        return;
    }

    // Show loading state
    setButtonLoading(saveBtn, true);

    // Update settings
    harnessSettings.maxSessions = maxSessions;
    harnessSettings.sessionDelay = sessionDelay;

    // Save to localStorage
    saveHarnessSettings();

    // Show success message
    showSettingsValidationMessage('Settings saved successfully!', 'success');
    setButtonLoading(saveBtn, false);

    // Close modal after a delay
    setTimeout(() => {
        closeSettingsModal();
    }, 1000);
}

// Show settings validation message
function showSettingsValidationMessage(message, type) {
    const validationMsg = document.getElementById('settings-validation-message');
    validationMsg.textContent = message;
    validationMsg.className = `validation-message ${type}`;
    validationMsg.style.display = 'block';
}

// Get current harness settings (for use by harness control)
function getHarnessSettings() {
    return harnessSettings;
}

// Initialize settings on page load
loadHarnessSettings();

// ===== PROMPTS EDITOR MANAGEMENT =====

let currentPromptTab = 'initializer';
let loadedPrompts = {
    initializer: '',
    coding: ''
};

// Open prompts modal and load current prompts
async function openPromptsModal() {
    const modal = document.getElementById('prompts-modal');
    modal.style.display = 'flex';

    // Load prompts from backend
    await loadPrompts();

    // Hide validation message
    document.getElementById('prompts-validation-message').style.display = 'none';
}

// Close prompts modal
function closePromptsModal() {
    const modal = document.getElementById('prompts-modal');
    modal.style.display = 'none';
}

// Load prompts from backend
async function loadPrompts() {
    try {
        // Load initializer prompt
        const initResponse = await fetch('http://localhost:3434/api/prompts/initializer');
        if (initResponse.ok) {
            loadedPrompts.initializer = await initResponse.text();
            document.getElementById('initializer-prompt').value = loadedPrompts.initializer;
        }

        // Load coding prompt
        const codingResponse = await fetch('http://localhost:3434/api/prompts/coding');
        if (codingResponse.ok) {
            loadedPrompts.coding = await codingResponse.text();
            document.getElementById('coding-prompt').value = loadedPrompts.coding;
        }
    } catch (error) {
        console.error('Failed to load prompts:', error);
        showPromptsValidationMessage('Failed to load prompts. Using defaults.', 'error');
    }
}

// Switch between prompt tabs
function switchPromptTab(tab) {
    currentPromptTab = tab;

    // Update tab buttons
    const tabs = document.querySelectorAll('.prompt-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    // Update panels
    const panels = document.querySelectorAll('.prompt-panel');
    panels.forEach(p => p.classList.remove('active'));
    document.getElementById(`${tab}-prompt-panel`).classList.add('active');
}

// Reset prompts to default
async function resetPrompts() {
    if (!confirm('Are you sure you want to reset prompts to default? This will overwrite any custom changes.')) {
        return;
    }

    const resetBtn = document.getElementById('reset-prompts-btn');
    setButtonLoading(resetBtn, true);

    try {
        const response = await fetch('http://localhost:3434/api/prompts/reset', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to reset prompts');
        }

        // Reload prompts
        await loadPrompts();

        showPromptsValidationMessage('Prompts reset to default successfully!', 'success');
    } catch (error) {
        console.error('Error resetting prompts:', error);
        showPromptsValidationMessage('Failed to reset prompts. Please try again.', 'error');
    } finally {
        setButtonLoading(resetBtn, false);
    }
}

// Save prompts to backend
async function savePrompts() {
    const saveBtn = document.getElementById('save-prompts-btn');
    setButtonLoading(saveBtn, true);

    try {
        // Get prompt values from textareas
        const initializerPrompt = document.getElementById('initializer-prompt').value;
        const codingPrompt = document.getElementById('coding-prompt').value;

        // Save initializer prompt
        const initResponse = await fetch('http://localhost:3434/api/prompts/initializer', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: initializerPrompt
        });

        if (!initResponse.ok) {
            throw new Error('Failed to save initializer prompt');
        }

        // Save coding prompt
        const codingResponse = await fetch('http://localhost:3434/api/prompts/coding', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: codingPrompt
        });

        if (!codingResponse.ok) {
            throw new Error('Failed to save coding prompt');
        }

        // Update loaded prompts
        loadedPrompts.initializer = initializerPrompt;
        loadedPrompts.coding = codingPrompt;

        showPromptsValidationMessage('Prompts saved successfully!', 'success');

        // Close modal after a delay
        setTimeout(() => {
            closePromptsModal();
        }, 1000);

    } catch (error) {
        console.error('Error saving prompts:', error);
        showPromptsValidationMessage('Failed to save prompts. Please try again.', 'error');
    } finally {
        setButtonLoading(saveBtn, false);
    }
}

// Show prompts validation message
function showPromptsValidationMessage(message, type) {
    const validationMsg = document.getElementById('prompts-validation-message');
    validationMsg.textContent = message;
    validationMsg.className = `validation-message ${type}`;
    validationMsg.style.display = 'block';
}

// Export functions to global scope
window.filterFeatures = filterFeatures;
window.updateChartView = updateChartView;
window.viewSession = viewSession;
window.toggleTheme = toggleTheme;
// ==========================================
// Loading States (feat-022)
// ==========================================

function showInitialLoadingStates() {
    // Add skeleton loading to stats section
    const statsGrid = document.querySelector('#metrics-section');
    if (statsGrid) {
        statsGrid.classList.add('shimmer');
        const statCards = statsGrid.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.style.opacity = '0.5';
        });
    }

    // Add loading to charts
    const charts = document.querySelectorAll('canvas');
    charts.forEach(chart => {
        const parent = chart.parentElement;
        if (parent) {
            parent.classList.add('card-loading');
        }
    });

    // Add loading to tables
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        table.classList.add('table-loading');
    });
}

function hideInitialLoadingStates() {
    // Remove skeleton loading from stats
    const statsGrid = document.querySelector('#metrics-section');
    if (statsGrid) {
        statsGrid.classList.remove('shimmer');
        const statCards = statsGrid.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.style.opacity = '1';
        });
    }

    // Remove loading from charts
    const chartContainers = document.querySelectorAll('.card-loading');
    chartContainers.forEach(container => {
        container.classList.remove('card-loading');
    });

    // Remove loading from tables
    const tables = document.querySelectorAll('.table-loading');
    tables.forEach(table => {
        table.classList.remove('table-loading');
    });
}

function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('btn-loading');
        button.disabled = true;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

window.toggleAutoScroll = toggleAutoScroll;
window.clearLogs = clearLogs;
window.toggleNotifications = toggleNotifications;
window.toggleAudio = toggleAudio;
window.toggleProjectSidebar = toggleProjectSidebar;
window.switchProject = switchProject;
window.addNewProject = addNewProject;
window.closeAddProjectModal = closeAddProjectModal;
window.submitNewProject = submitNewProject;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveSettings = saveSettings;
window.getHarnessSettings = getHarnessSettings;
window.openPromptsModal = openPromptsModal;
window.closePromptsModal = closePromptsModal;
window.switchPromptTab = switchPromptTab;
window.resetPrompts = resetPrompts;
window.savePrompts = savePrompts;
