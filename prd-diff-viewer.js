// ==========================================
// PRD Diff Viewer (feat-059)
// ==========================================

(function() {
    'use strict';

    const STORAGE_KEY = 'prd-diff-viewer-state';

    // Demo version history
    const DEMO_VERSIONS = [
        {
            version: '1.0',
            date: '2025-12-01T10:00:00Z',
            author: 'PM',
            content: 'Build an autonomous coding dashboard.\n\nFeatures:\n- Monitor coding agents\n- Track feature progress\n- View session logs\n- Control harness start/stop',
        },
        {
            version: '1.1',
            date: '2025-12-15T14:30:00Z',
            author: 'PM',
            content: 'Build an autonomous coding dashboard.\n\nFeatures:\n- Monitor coding agents\n- Track feature progress with charts\n- View session logs in real-time\n- Control harness start/stop\n- Dark mode support\n- Keyboard shortcuts',
        },
        {
            version: '2.0',
            date: '2026-01-10T09:00:00Z',
            author: 'Lead Dev',
            content: 'Build an autonomous coding dashboard with advanced monitoring.\n\nCore Features:\n- Monitor coding agents in real-time\n- Track feature progress with charts and timelines\n- View session logs with filtering\n- Control harness start/stop/restart\n- Dark mode support\n- Keyboard shortcuts\n\nAdvanced Features:\n- Cost tracking and forecasting\n- Model performance comparison\n- Slack/Email notifications\n- Deployment tracker\n- Session replay',
        },
        {
            version: '2.1',
            date: '2026-01-25T11:00:00Z',
            author: 'PM',
            content: 'Build an autonomous coding dashboard with advanced monitoring.\n\nCore Features:\n- Monitor coding agents in real-time\n- Track feature progress with charts and timelines\n- View and search session logs with filtering\n- Control harness start/stop/restart\n- Dark mode and customizable layout\n- Keyboard shortcuts with help modal\n\nAdvanced Features:\n- Cost tracking and forecasting\n- Model performance comparison\n- Slack/Email/Desktop notifications\n- Deployment status tracker\n- Session replay for debugging\n- Parallel feature execution\n- Smart feature ordering by dependencies',
        },
    ];

    let state = {
        versions: [...DEMO_VERSIONS],
        leftVersion: 0,
        rightVersion: DEMO_VERSIONS.length - 1,
    };

    /**
     * Load state
     */
    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.versions && parsed.versions.length > 0) {
                    state = { ...state, ...parsed };
                }
            }
        } catch (e) {}
    }

    /**
     * Save state
     */
    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    /**
     * Initialize the widget
     */
    function initPrdDiffViewer() {
        loadState();
        injectStyles();
        const container = document.getElementById('prd-diff-viewer-widget');
        if (!container) return;
        render(container);
    }

    /**
     * Compute diff between two strings
     */
    function computeDiff(oldText, newText) {
        const oldLines = oldText.split('\n');
        const newLines = newText.split('\n');
        const result = { left: [], right: [] };

        // Simple line-by-line diff using LCS
        const lcs = computeLCS(oldLines, newLines);
        let oi = 0, ni = 0, li = 0;

        while (oi < oldLines.length || ni < newLines.length) {
            if (li < lcs.length && oi < oldLines.length && oldLines[oi] === lcs[li] &&
                ni < newLines.length && newLines[ni] === lcs[li]) {
                // Unchanged line
                result.left.push({ text: oldLines[oi], type: 'unchanged' });
                result.right.push({ text: newLines[ni], type: 'unchanged' });
                oi++; ni++; li++;
            } else if (li < lcs.length && oi < oldLines.length && oldLines[oi] !== lcs[li]) {
                // Removed from old
                result.left.push({ text: oldLines[oi], type: 'removed' });
                result.right.push({ text: '', type: 'empty' });
                oi++;
            } else if (li < lcs.length && ni < newLines.length && newLines[ni] !== lcs[li]) {
                // Added in new
                result.left.push({ text: '', type: 'empty' });
                result.right.push({ text: newLines[ni], type: 'added' });
                ni++;
            } else if (oi < oldLines.length) {
                result.left.push({ text: oldLines[oi], type: 'removed' });
                result.right.push({ text: '', type: 'empty' });
                oi++;
            } else if (ni < newLines.length) {
                result.left.push({ text: '', type: 'empty' });
                result.right.push({ text: newLines[ni], type: 'added' });
                ni++;
            } else {
                break;
            }
        }

        return result;
    }

    /**
     * Compute Longest Common Subsequence of line arrays
     */
    function computeLCS(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Backtrack to find LCS
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) {
                lcs.unshift(a[i - 1]);
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }

        return lcs;
    }

    /**
     * Render the widget
     */
    function render(container) {
        const versions = state.versions;
        const leftIdx = Math.min(state.leftVersion, versions.length - 1);
        const rightIdx = Math.min(state.rightVersion, versions.length - 1);
        const leftVer = versions[leftIdx];
        const rightVer = versions[rightIdx];

        const diff = computeDiff(leftVer.content, rightVer.content);
        const addedCount = diff.right.filter(l => l.type === 'added').length;
        const removedCount = diff.left.filter(l => l.type === 'removed').length;

        container.innerHTML = `
            <div class="card" id="prd-diff-card">
                <div class="card-header">
                    <h3 class="card-title">PRD Diff Viewer</h3>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span class="badge badge-success">+${addedCount}</span>
                        <span class="badge" style="background: var(--color-error); color: white;">-${removedCount}</span>
                        <button class="btn btn-secondary" onclick="window.prdDiffViewer.addVersion()">Add Version</button>
                        <button class="btn btn-secondary" onclick="window.prdDiffViewer.loadDemo()">Demo</button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Version Selectors -->
                    <div class="pdv-selectors">
                        <div class="pdv-selector">
                            <label class="pdv-label">Left (Old)</label>
                            <select id="pdv-left-select" class="pdv-select" onchange="window.prdDiffViewer.updateDiff()">
                                ${versions.map((v, i) => `
                                    <option value="${i}" ${i === leftIdx ? 'selected' : ''}>
                                        v${v.version} - ${new Date(v.date).toLocaleDateString()} (${v.author})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="pdv-selector">
                            <label class="pdv-label">Right (New)</label>
                            <select id="pdv-right-select" class="pdv-select" onchange="window.prdDiffViewer.updateDiff()">
                                ${versions.map((v, i) => `
                                    <option value="${i}" ${i === rightIdx ? 'selected' : ''}>
                                        v${v.version} - ${new Date(v.date).toLocaleDateString()} (${v.author})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Side-by-Side Diff -->
                    <div class="pdv-diff-container" id="pdv-diff-container">
                        <div class="pdv-diff-panel pdv-left-panel" id="pdv-left-panel">
                            <div class="pdv-panel-header">v${leftVer.version} (${leftVer.author})</div>
                            <div class="pdv-diff-content">
                                ${diff.left.map((line, i) => `
                                    <div class="pdv-diff-line pdv-${line.type}">
                                        <span class="pdv-line-num">${line.type !== 'empty' ? i + 1 : ''}</span>
                                        <span class="pdv-line-text">${escapeHtml(line.text)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="pdv-diff-panel pdv-right-panel" id="pdv-right-panel">
                            <div class="pdv-panel-header">v${rightVer.version} (${rightVer.author})</div>
                            <div class="pdv-diff-content">
                                ${diff.right.map((line, i) => `
                                    <div class="pdv-diff-line pdv-${line.type}">
                                        <span class="pdv-line-num">${line.type !== 'empty' ? i + 1 : ''}</span>
                                        <span class="pdv-line-text">${escapeHtml(line.text)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Version History -->
                    <div class="pdv-section" id="pdv-history-section">
                        <h4 class="pdv-section-title">Version History</h4>
                        <div class="pdv-history-list" id="pdv-history-list">
                            ${versions.map((v, i) => `
                                <div class="pdv-history-item" data-version-index="${i}">
                                    <div class="pdv-history-marker ${i === versions.length - 1 ? 'pdv-current' : ''}"></div>
                                    <div class="pdv-history-content">
                                        <div class="pdv-history-version">v${v.version}</div>
                                        <div class="pdv-history-meta">
                                            ${new Date(v.date).toLocaleDateString()} by ${v.author}
                                        </div>
                                        <div class="pdv-history-preview">${escapeHtml(v.content.substring(0, 80))}...</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Sync scroll between left and right panels
        const leftPanel = document.querySelector('#pdv-left-panel .pdv-diff-content');
        const rightPanel = document.querySelector('#pdv-right-panel .pdv-diff-content');
        if (leftPanel && rightPanel) {
            leftPanel.addEventListener('scroll', () => {
                rightPanel.scrollTop = leftPanel.scrollTop;
            });
            rightPanel.addEventListener('scroll', () => {
                leftPanel.scrollTop = rightPanel.scrollTop;
            });
        }
    }

    /**
     * Update diff when version selection changes
     */
    function updateDiff() {
        const leftSelect = document.getElementById('pdv-left-select');
        const rightSelect = document.getElementById('pdv-right-select');

        if (leftSelect) state.leftVersion = parseInt(leftSelect.value);
        if (rightSelect) state.rightVersion = parseInt(rightSelect.value);

        saveState();

        const container = document.getElementById('prd-diff-viewer-widget');
        if (container) render(container);
    }

    /**
     * Add a new version
     */
    function addVersion() {
        const latestContent = state.versions.length > 0
            ? state.versions[state.versions.length - 1].content
            : '';

        const newContent = prompt('Enter PRD content for new version:', latestContent);
        if (newContent === null) return;

        const version = state.versions.length > 0
            ? (parseFloat(state.versions[state.versions.length - 1].version) + 0.1).toFixed(1)
            : '1.0';

        state.versions.push({
            version: version,
            date: new Date().toISOString(),
            author: 'User',
            content: newContent,
        });

        state.rightVersion = state.versions.length - 1;
        if (state.versions.length > 1) {
            state.leftVersion = state.versions.length - 2;
        }

        saveState();

        const container = document.getElementById('prd-diff-viewer-widget');
        if (container) render(container);
    }

    /**
     * Load demo data
     */
    function loadDemo() {
        state.versions = [...DEMO_VERSIONS];
        state.leftVersion = 0;
        state.rightVersion = DEMO_VERSIONS.length - 1;
        saveState();

        const container = document.getElementById('prd-diff-viewer-widget');
        if (container) render(container);

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Demo Loaded',
                message: `${DEMO_VERSIONS.length} demo versions loaded.`
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
     * Inject CSS styles
     */
    function injectStyles() {
        if (document.getElementById('prd-diff-styles')) return;

        const style = document.createElement('style');
        style.id = 'prd-diff-styles';
        style.textContent = `
            .pdv-selectors {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .pdv-selector {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .pdv-label {
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--color-text-secondary);
            }

            .pdv-select {
                padding: 0.5rem 0.75rem;
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-sm);
                color: var(--color-text-primary);
                font-size: 0.85rem;
                font-family: var(--font-family-base);
            }

            .pdv-diff-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2px;
                background: var(--color-border);
                border-radius: var(--radius-md);
                overflow: hidden;
                margin-bottom: 1.25rem;
            }

            .pdv-diff-panel {
                background: var(--color-bg-primary);
            }

            .pdv-panel-header {
                padding: 0.5rem 0.75rem;
                background: var(--color-bg-tertiary);
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--color-text-secondary);
            }

            .pdv-diff-content {
                max-height: 300px;
                overflow-y: auto;
                font-family: var(--font-family-mono);
                font-size: 0.8rem;
            }

            .pdv-diff-line {
                display: flex;
                padding: 0.125rem 0.5rem;
                min-height: 1.4em;
                line-height: 1.4;
            }

            .pdv-line-num {
                width: 2rem;
                flex-shrink: 0;
                color: var(--color-text-muted);
                text-align: right;
                padding-right: 0.5rem;
                user-select: none;
            }

            .pdv-line-text {
                flex: 1;
                white-space: pre-wrap;
                word-break: break-word;
            }

            .pdv-unchanged {
                color: var(--color-text-secondary);
            }

            .pdv-added {
                background: rgba(16, 185, 129, 0.15);
                color: var(--color-success);
            }

            .pdv-removed {
                background: rgba(239, 68, 68, 0.15);
                color: var(--color-error);
            }

            .pdv-empty {
                background: var(--color-bg-secondary);
                opacity: 0.5;
            }

            .pdv-section {
                margin-top: 1rem;
            }

            .pdv-section-title {
                font-size: 0.9rem;
                font-weight: 600;
                margin-bottom: 0.75rem;
                color: var(--color-text-primary);
            }

            .pdv-history-list {
                display: flex;
                flex-direction: column;
                gap: 0;
                position: relative;
                padding-left: 1.25rem;
            }

            .pdv-history-list::before {
                content: '';
                position: absolute;
                left: 0.375rem;
                top: 0.5rem;
                bottom: 0.5rem;
                width: 2px;
                background: var(--color-border);
            }

            .pdv-history-item {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 0.5rem 0;
                position: relative;
            }

            .pdv-history-marker {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: var(--color-text-muted);
                flex-shrink: 0;
                margin-top: 0.25rem;
                position: absolute;
                left: -1rem;
            }

            .pdv-history-marker.pdv-current {
                background: var(--color-primary);
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
            }

            .pdv-history-content {
                flex: 1;
            }

            .pdv-history-version {
                font-weight: 600;
                font-size: 0.9rem;
                color: var(--color-text-primary);
            }

            .pdv-history-meta {
                font-size: 0.75rem;
                color: var(--color-text-muted);
            }

            .pdv-history-preview {
                font-size: 0.8rem;
                color: var(--color-text-secondary);
                margin-top: 0.25rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // Public API
    // ==========================================

    window.prdDiffViewer = {
        init: initPrdDiffViewer,
        updateDiff: updateDiff,
        addVersion: addVersion,
        loadDemo: loadDemo,
        getState: () => ({ ...state }),
        computeDiff: computeDiff,
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', initPrdDiffViewer);

})();
