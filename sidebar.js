// Sidebar and Test Viewer JavaScript

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    populateTestList();
    initializeSidebar();
});

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Initialize sidebar
function initializeSidebar() {
    // Set active nav item based on current view
    updateActiveNav();
}

// Show different views
function showView(viewName) {
    // Hide all views
    const views = document.querySelectorAll('.view-content');
    views.forEach(view => view.style.display = 'none');

    // Show selected view  
    const selectedView = document.getElementById(`${viewName}-view`);
    if (selectedView) {
        selectedView.style.display = 'block';
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        toggleSidebar();
    }
}

// Update active nav item
function updateActiveNav() {
    // Based on URL hash or current view
    const hash = window.location.hash || '#tests';
    const target = hash.substring(1);
    showView(target);
}

// Populate test list with all 200 features
function populateTestList() {
    const testList = document.getElementById('test-list');
    testList.innerHTML = '';

    // Use mock data from mock-data.js
    mockData.features.forEach((feature, index) => {
        const testItem = createTestItem(feature);
        testList.appendChild(testItem);
    });
}

// Create a test item element
function createTestItem(feature) {
    const item = document.createElement('div');
    item.className = 'test-item';
    item.onclick = () => openTestModal(feature);

    const statusIcon = feature.status === 'passing' ? '✓' : '⏳';
    const statusClass = feature.status === 'passing' ? 'passing' : 'pending';

    item.innerHTML = `
    <div class="test-status-icon ${statusClass}">${statusIcon}</div>
    <div class="test-number">#${feature.id}</div>
    <div class="test-details">
      <div class="test-name">${feature.name}</div>
      <div class="test-meta">
        <span>Session ${feature.session}</span>
        ${feature.status === 'passing' ? `<span>✓ Tests passing</span>` : '<span>Pending</span>'}
      </div>
    </div>
    <div class="test-duration">${feature.timeSpent}</div>
  `;

    return item;
}

// Filter tests
function filterTests(filter) {
    const testList = document.getElementById('test-list');
    testList.innerHTML = '';

    let filteredFeatures = mockData.features;

    if (filter === 'passing') {
        filteredFeatures = mockData.features.filter(f => f.status === 'passing');
    } else if (filter === 'pending') {
        filteredFeatures = mockData.features.filter(f => f.status === 'pending');
    }

    filteredFeatures.forEach(feature => {
        const testItem = createTestItem(feature);
        testList.appendChild(testItem);
    });

    // Update active filter button
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

// Open test details modal
function openTestModal(feature) {
    const modal = document.getElementById('test-modal');
    const testName = document.getElementById('modal-test-name');
    const testMeta = document.getElementById('modal-test-meta');
    const testOutput = document.getElementById('modal-test-output');
    const gitCommit = document.getElementById('modal-git-commit');
    const filesChanged = document.getElementById('modal-files-changed');

    testName.textContent = `Feature #${feature.id}: ${feature.name}`;
    testMeta.textContent = `Session ${feature.session} • ${feature.timeSpent}`;

    if (feature.status === 'passing') {
        testOutput.innerHTML = `
<span style="color: var(--color-success);">✓ All tests passed</span>

Running test suite...
  ✓ Unit tests (12 passed)
  ✓ Integration tests (5 passed)
  ✓ E2E tests (3 passed)

Total: 20 tests, 20 passed, 0 failed
Duration: ${feature.timeSpent}
    `.trim();

        gitCommit.innerHTML = `
Commit: <span style="color: var(--color-primary);">a3f4b2c</span>
Author: Autonomous Agent
Date: ${new Date().toLocaleString()}

feat: implement ${feature.name.toLowerCase()}

- Added core functionality
- Implemented tests
- Updated documentation
    `.trim();

        filesChanged.innerHTML = `
<span style="color: var(--color-success);">++++</span> src/${feature.name.toLowerCase().replace(/\s+/g, '-')}.js
<span style="color: var(--color-success);">++++</span> tests/${feature.name.toLowerCase().replace(/\s+/g, '-')}.test.js
<span style="color: var(--color-warning);">~~~~</span> package.json

3 files changed, 247 insertions(+), 12 deletions(-)
    `.trim();
    } else {
        testOutput.textContent = 'Test not yet executed';
        gitCommit.textContent = 'No commit yet';
        filesChanged.textContent = 'No files changed';
    }

    modal.classList.add('open');
}

// Close test details modal
function closeTestModal() {
    const modal = document.getElementById('test-modal');
    modal.classList.remove('open');
}

// Select a session
function selectSession(sessionId) {
    // Update active session
    document.querySelectorAll('.session-item').forEach(item => {
        item.classList.remove('active-session');
    });
    event.currentTarget.classList.add('active-session');

    // Filter tests by session
    const testList = document.getElementById('test-list');
    testList.innerHTML = '';

    const sessionFeatures = mockData.features.filter(f => f.session === sessionId);

    sessionFeatures.forEach(feature => {
        const testItem = createTestItem(feature);
        testList.appendChild(testItem);
    });

    // Update header
    const testHeader = document.querySelector('.test-panel-header h3');
    testHeader.textContent = `Session ${sessionId} Tests`;
}

// Quick test action
function quickTest() {
    addSystemLog('⚡ Starting quick test with 3 iterations...', 'info');
    showView('terminals');
}

// Resume agent action
function resumeAgent() {
    addSystemLog('↩️ Resuming from last checkpoint...', 'info');
    showView('terminals');
}

// Export logs action
function exportLogs() {
    const allFeatures = mockData.features.map(f => {
        return `#${f.id} - ${f.name} - ${f.status} - ${f.timeSpent}`;
    }).join('\n');

    const blob = new Blob([`Test Results Export\n${'='.repeat(50)}\n\n${allFeatures}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    if (typeof addSystemLog === 'function') {
        addSystemLog('💾 Test results exported', 'success');
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    // Escape key closes modal
    if (e.key === 'Escape') {
        closeTestModal();
    }

    // Ctrl/Cmd + K opens quick search (future feature)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: Implement quick search
    }
});

// Export functions
window.showView = showView;
window.toggleSidebar = toggleSidebar;
window.filterTests = filterTests;
window.openTestModal = openTestModal;
window.closeTestModal = closeTestModal;
window.selectSession = selectSession;
window.quickTest = quickTest;
window.resumeAgent = resumeAgent;
window.exportLogs = exportLogs;
