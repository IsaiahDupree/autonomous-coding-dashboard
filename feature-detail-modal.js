// ==========================================
// Feature Detail Modal (feat-055)
// ==========================================

(function() {
    'use strict';

    let currentFeature = null;
    let isEditing = false;

    /**
     * Initialize the feature detail modal system
     */
    function initFeatureDetailModal() {
        injectModal();
        injectStyles();
        attachRowClickHandlers();

        // Re-attach handlers when features table is repopulated
        const observer = new MutationObserver(() => {
            attachRowClickHandlers();
        });
        const tbody = document.getElementById('features-tbody');
        if (tbody) {
            observer.observe(tbody, { childList: true });
        }
    }

    /**
     * Inject the modal HTML
     */
    function injectModal() {
        if (document.getElementById('feature-detail-modal')) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'feature-detail-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2 id="fdm-title">Feature Details</h2>
                    <button class="modal-close" onclick="window.featureDetailModal.close()" aria-label="Close">✕</button>
                </div>
                <div class="modal-body" id="fdm-body">
                    <!-- Feature details rendered here -->
                </div>
                <div class="modal-actions" id="fdm-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.featureDetailModal.close()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    /**
     * Inject CSS styles
     */
    function injectStyles() {
        if (document.getElementById('feature-detail-styles')) return;

        const style = document.createElement('style');
        style.id = 'feature-detail-styles';
        style.textContent = `
            #feature-detail-modal .modal-content {
                max-height: 80vh;
                overflow-y: auto;
            }

            .fdm-section {
                margin-bottom: 1.25rem;
            }

            .fdm-section-title {
                font-size: 0.85rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--color-text-secondary);
                margin-bottom: 0.5rem;
            }

            .fdm-meta {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 0.75rem;
            }

            .fdm-meta-item {
                background: var(--color-bg-tertiary);
                padding: 0.75rem;
                border-radius: var(--radius-md);
            }

            .fdm-meta-label {
                font-size: 0.75rem;
                color: var(--color-text-muted);
                margin-bottom: 0.25rem;
            }

            .fdm-meta-value {
                font-weight: 600;
                font-size: 0.95rem;
            }

            .fdm-criteria-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .fdm-criteria-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 0.75rem;
                background: var(--color-bg-tertiary);
                border-radius: var(--radius-sm);
                margin-bottom: 0.375rem;
                font-size: 0.9rem;
            }

            .fdm-criteria-icon {
                font-size: 1rem;
                flex-shrink: 0;
            }

            .fdm-code-block {
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                padding: 0.75rem 1rem;
                font-family: var(--font-family-mono);
                font-size: 0.8rem;
                overflow-x: auto;
                white-space: pre-wrap;
                color: var(--color-text-secondary);
                max-height: 200px;
                overflow-y: auto;
            }

            .fdm-code-files {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .fdm-code-file {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 0.75rem;
                background: var(--color-bg-tertiary);
                border-radius: var(--radius-sm);
                font-size: 0.85rem;
                font-family: var(--font-family-mono);
            }

            .fdm-code-file-icon {
                color: var(--color-accent);
            }

            .fdm-edit-form {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .fdm-edit-field {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .fdm-edit-field label {
                font-size: 0.8rem;
                font-weight: 600;
                color: var(--color-text-secondary);
            }

            .fdm-edit-field input,
            .fdm-edit-field textarea {
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-sm);
                padding: 0.5rem 0.75rem;
                color: var(--color-text-primary);
                font-family: var(--font-family-base);
                font-size: 0.9rem;
            }

            .fdm-edit-field textarea {
                resize: vertical;
                min-height: 60px;
                font-family: var(--font-family-mono);
                font-size: 0.85rem;
            }

            .fdm-edit-field input:focus,
            .fdm-edit-field textarea:focus {
                outline: none;
                border-color: var(--color-primary);
                box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
            }

            #features-tbody tr[data-feature-id] {
                cursor: pointer;
                transition: background var(--transition-fast);
            }

            #features-tbody tr[data-feature-id]:hover {
                background: var(--color-bg-tertiary);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Attach click handlers to feature rows in the table
     */
    function attachRowClickHandlers() {
        const tbody = document.getElementById('features-tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            // Skip category headers
            if (row.classList.contains('category-header')) return;

            // Extract feature ID from the first cell
            const firstCell = row.querySelector('td');
            if (!firstCell) return;

            const featureId = firstCell.textContent.trim();
            if (!featureId.startsWith('feat-')) return;

            row.dataset.featureId = featureId;
            row.style.cursor = 'pointer';

            // Remove existing listener to avoid duplicates
            row.removeEventListener('click', handleRowClick);
            row.addEventListener('click', handleRowClick);
        });
    }

    /**
     * Handle feature row click
     */
    function handleRowClick(e) {
        const featureId = this.dataset.featureId;
        if (featureId) {
            openFeatureDetail(featureId);
        }
    }

    /**
     * Get feature data by ID
     */
    function getFeatureById(featureId) {
        // Try real feature data first (from app.js featureData global)
        if (typeof featureData !== 'undefined' && featureData && featureData.features) {
            return featureData.features.find(f => f.id === featureId);
        }
        return null;
    }

    /**
     * Get related code files for a feature
     */
    function getRelatedFiles(feature) {
        const files = [];
        const id = feature.id;
        const idNum = id.replace('feat-', '');

        // Common patterns for feature-related files
        files.push({ path: `test-${id}.js`, type: 'test' });

        // Map categories to likely files
        const category = feature.category || '';
        if (category === 'ui') {
            files.push({ path: 'index.html', type: 'html' });
            files.push({ path: 'index.css', type: 'css' });
            files.push({ path: 'app.js', type: 'js' });
        } else if (category === 'backend' || category === 'api') {
            files.push({ path: 'backend/src/index.ts', type: 'ts' });
        } else if (category === 'control') {
            files.push({ path: 'harness-control.js', type: 'js' });
            files.push({ path: 'agent-control.js', type: 'js' });
        }

        // Check for feature-specific files based on description
        const desc = (feature.description || '').toLowerCase();
        const fileHints = {
            'dashboard layout': ['dashboard-layout.js'],
            'log streaming': ['log-streaming.js'],
            'feature ordering': ['smart-feature-ordering.js'],
            'session replay': ['session-replay.js'],
            'model performance': ['model-performance.js'],
            'model fallback': ['model-fallback.js'],
            'posthog': ['posthog-analytics.js'],
            'deployment': ['deployment-tracker.js'],
            'supabase': ['supabase-connection.js'],
            'cost': ['cost-tracker.js', 'cost-forecasting.js'],
            'test coverage': ['test-coverage.js'],
            'e2e': ['e2e-test-runner.js'],
            'git': ['git-timeline.js'],
            'parallel': ['parallel-exec.js'],
            'approval': ['approval-ui.js'],
            'keyboard': ['app.js'],
            'dark mode': ['app.js', 'index.css'],
            'theme': ['app.js', 'index.css'],
        };

        for (const [keyword, paths] of Object.entries(fileHints)) {
            if (desc.includes(keyword)) {
                paths.forEach(p => {
                    if (!files.find(f => f.path === p)) {
                        files.push({ path: p, type: p.split('.').pop() });
                    }
                });
            }
        }

        return files;
    }

    /**
     * Open the feature detail modal
     */
    function openFeatureDetail(featureId) {
        const feature = getFeatureById(featureId);
        if (!feature) return;

        currentFeature = feature;
        isEditing = false;

        renderFeatureDetail(feature);

        const modal = document.getElementById('feature-detail-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Render feature detail content
     */
    function renderFeatureDetail(feature) {
        const title = document.getElementById('fdm-title');
        const body = document.getElementById('fdm-body');
        const actions = document.getElementById('fdm-actions');

        if (title) {
            title.textContent = `${feature.id}: ${feature.description}`;
        }

        const relatedFiles = getRelatedFiles(feature);
        const criteria = feature.acceptance_criteria || [];
        const statusBadge = feature.passes
            ? '<span class="badge badge-success">✓ Passing</span>'
            : '<span class="badge badge-warning">⏳ Pending</span>';

        if (body) {
            body.innerHTML = `
                <div class="fdm-section">
                    <div class="fdm-meta">
                        <div class="fdm-meta-item">
                            <div class="fdm-meta-label">Status</div>
                            <div class="fdm-meta-value">${statusBadge}</div>
                        </div>
                        <div class="fdm-meta-item">
                            <div class="fdm-meta-label">Category</div>
                            <div class="fdm-meta-value" style="text-transform: capitalize;">${feature.category || 'N/A'}</div>
                        </div>
                        <div class="fdm-meta-item">
                            <div class="fdm-meta-label">Priority</div>
                            <div class="fdm-meta-value">${feature.priority || 'N/A'}</div>
                        </div>
                        <div class="fdm-meta-item">
                            <div class="fdm-meta-label">Feature ID</div>
                            <div class="fdm-meta-value" style="font-family: var(--font-family-mono);">${feature.id}</div>
                        </div>
                    </div>
                </div>

                <div class="fdm-section">
                    <div class="fdm-section-title">Description</div>
                    <p style="margin: 0; line-height: 1.6;">${feature.description}</p>
                </div>

                <div class="fdm-section" id="fdm-criteria-section">
                    <div class="fdm-section-title">Acceptance Criteria</div>
                    <ul class="fdm-criteria-list">
                        ${criteria.map((c, i) => `
                            <li class="fdm-criteria-item">
                                <span class="fdm-criteria-icon">${feature.passes ? '✅' : '⬜'}</span>
                                <span>${c}</span>
                            </li>
                        `).join('')}
                        ${criteria.length === 0 ? '<li class="fdm-criteria-item"><span style="color: var(--color-text-muted);">No acceptance criteria defined</span></li>' : ''}
                    </ul>
                </div>

                <div class="fdm-section">
                    <div class="fdm-section-title">Related Code Files</div>
                    <div class="fdm-code-files">
                        ${relatedFiles.map(f => `
                            <div class="fdm-code-file">
                                <span class="fdm-code-file-icon">📄</span>
                                <span>${f.path}</span>
                                <span class="badge" style="margin-left: auto; font-size: 0.7rem;">${f.type}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="fdm-section">
                    <div class="fdm-section-title">Feature JSON</div>
                    <div class="fdm-code-block">${JSON.stringify(feature, null, 2)}</div>
                </div>
            `;
        }

        if (actions) {
            actions.innerHTML = `
                <button type="button" class="btn btn-secondary" onclick="window.featureDetailModal.close()">Close</button>
                <button type="button" class="btn btn-primary" onclick="window.featureDetailModal.toggleEdit()">Edit</button>
            `;
        }
    }

    /**
     * Render edit mode
     */
    function renderEditMode(feature) {
        const body = document.getElementById('fdm-body');
        const actions = document.getElementById('fdm-actions');

        const criteria = feature.acceptance_criteria || [];

        if (body) {
            body.innerHTML = `
                <div class="fdm-edit-form">
                    <div class="fdm-edit-field">
                        <label>Description</label>
                        <input type="text" id="fdm-edit-description" value="${escapeHtml(feature.description || '')}" />
                    </div>

                    <div class="fdm-edit-field">
                        <label>Category</label>
                        <input type="text" id="fdm-edit-category" value="${escapeHtml(feature.category || '')}" />
                    </div>

                    <div class="fdm-edit-field">
                        <label>Priority</label>
                        <input type="number" id="fdm-edit-priority" value="${feature.priority || ''}" />
                    </div>

                    <div class="fdm-edit-field">
                        <label>Status</label>
                        <select id="fdm-edit-status" style="background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; color: var(--color-text-primary); font-size: 0.9rem;">
                            <option value="true" ${feature.passes ? 'selected' : ''}>✓ Passing</option>
                            <option value="false" ${!feature.passes ? 'selected' : ''}>⏳ Pending</option>
                        </select>
                    </div>

                    <div class="fdm-edit-field">
                        <label>Acceptance Criteria (one per line)</label>
                        <textarea id="fdm-edit-criteria" rows="4">${criteria.join('\n')}</textarea>
                    </div>
                </div>
            `;
        }

        if (actions) {
            actions.innerHTML = `
                <button type="button" class="btn btn-secondary" onclick="window.featureDetailModal.toggleEdit()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="window.featureDetailModal.saveEdit()">Save Changes</button>
            `;
        }
    }

    /**
     * Toggle between view and edit mode
     */
    function toggleEdit() {
        if (!currentFeature) return;

        isEditing = !isEditing;

        if (isEditing) {
            renderEditMode(currentFeature);
        } else {
            renderFeatureDetail(currentFeature);
        }
    }

    /**
     * Save inline edits
     */
    function saveEdit() {
        if (!currentFeature) return;

        const descInput = document.getElementById('fdm-edit-description');
        const categoryInput = document.getElementById('fdm-edit-category');
        const priorityInput = document.getElementById('fdm-edit-priority');
        const statusSelect = document.getElementById('fdm-edit-status');
        const criteriaInput = document.getElementById('fdm-edit-criteria');

        // Update the feature object
        if (descInput) currentFeature.description = descInput.value;
        if (categoryInput) currentFeature.category = categoryInput.value;
        if (priorityInput) currentFeature.priority = parseInt(priorityInput.value) || currentFeature.priority;
        if (statusSelect) currentFeature.passes = statusSelect.value === 'true';
        if (criteriaInput) {
            currentFeature.acceptance_criteria = criteriaInput.value
                .split('\n')
                .map(c => c.trim())
                .filter(c => c.length > 0);
        }

        // Try to save via backend API
        saveFeatureToBackend(currentFeature);

        // Switch back to view mode
        isEditing = false;
        renderFeatureDetail(currentFeature);

        // Refresh the features table
        if (typeof populateFeaturesTable === 'function') {
            populateFeaturesTable();
        }

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Feature Updated',
                message: `${currentFeature.id} has been updated.`
            });
        }
    }

    /**
     * Save feature to backend
     */
    async function saveFeatureToBackend(feature) {
        try {
            const response = await fetch(`/api/features/${feature.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feature)
            });
            if (!response.ok) {
                console.warn('Failed to save feature to backend, changes are local only');
            }
        } catch (e) {
            console.warn('Backend not available, changes are local only');
        }
    }

    /**
     * Close the modal
     */
    function closeModal() {
        const modal = document.getElementById('feature-detail-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        isEditing = false;
        currentFeature = null;
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================
    // Public API
    // ==========================================

    window.featureDetailModal = {
        init: initFeatureDetailModal,
        open: openFeatureDetail,
        close: closeModal,
        toggleEdit: toggleEdit,
        saveEdit: saveEdit,
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', initFeatureDetailModal);

})();
