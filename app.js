// Main Application JavaScript
// Handles data visualization, real-time updates, and user interactions

// Chart instances
let progressChart = null;
let tokenChart = null;
let commandsChart = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function () {
    initializeDashboard();
    setupCharts();
    startRealTimeUpdates();
});

// Initialize all dashboard components
function initializeDashboard() {
    populateActivityTimeline();
    populateFeaturesTable();
    populateCommandsTable();
    populateGitTimeline();
}

// Populate activity timeline
function populateActivityTimeline() {
    const timeline = document.getElementById('activity-timeline');
    timeline.innerHTML = '';

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

// Populate features table
function populateFeaturesTable(filter = 'all') {
    const tbody = document.getElementById('features-tbody');
    tbody.innerHTML = '';

    let filteredFeatures = mockData.features;
    if (filter === 'passing') {
        filteredFeatures = mockData.features.filter(f => f.status === 'passing');
    } else if (filter === 'pending') {
        filteredFeatures = mockData.features.filter(f => f.status === 'pending');
    }

    // Show only first 20 features to avoid overwhelming the table
    const displayFeatures = filteredFeatures.slice(0, 20);

    displayFeatures.forEach(feature => {
        const row = document.createElement('tr');
        const statusBadge = feature.status === 'passing'
            ? '<span class="badge badge-success">✓ Passing</span>'
            : '<span class="badge badge-warning">⏳ Pending</span>';

        row.innerHTML = `
      <td style="font-family: var(--font-family-mono);">#${feature.id}</td>
      <td>${feature.name}</td>
      <td>${statusBadge}</td>
      <td>${feature.timeSpent}</td>
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

// Simulate real-time updates
function startRealTimeUpdates() {
    // Update progress every 5 seconds
    setInterval(() => {
        const current = parseInt(document.getElementById('features-completed').textContent);
        if (current < 200) {
            // Simulate slow progress
            if (Math.random() > 0.7) { // 30% chance of update
                updateProgress(current + 1);
            }
        }
    }, 5000);

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

// Export functions to global scope
window.filterFeatures = filterFeatures;
window.updateChartView = updateChartView;
window.viewSession = viewSession;
