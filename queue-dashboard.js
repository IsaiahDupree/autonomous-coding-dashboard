// Queue Dashboard JavaScript
// Implements feat-033: Target Project Queue Dashboard

const API_BASE = 'http://localhost:3434';
let currentQueue = [];
let draggedItem = null;

// Initialize queue dashboard on page load
document.addEventListener('DOMContentLoaded', function () {
    loadQueue();
});

// Load queue from API
async function loadQueue() {
    try {
        const response = await fetch(`${API_BASE}/api/targets/status`);
        const result = await response.json();

        if (!result.data) {
            throw new Error('No data returned from API');
        }

        const { summary, targets } = result.data;

        // Update stats
        updateStats(summary);

        // Sort targets by priority
        currentQueue = targets.sort((a, b) => a.priority - b.priority);

        // Render queue
        renderQueue();
    } catch (error) {
        console.error('Failed to load queue:', error);
        showError('Failed to load project queue', error.message);
    }
}

// Update summary stats
function updateStats(summary) {
    const statsContainer = document.getElementById('queue-stats');
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Projects</div>
            <div class="stat-value">${summary.totalTargets || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Enabled Projects</div>
            <div class="stat-value">${summary.enabledTargets || 0}</div>
            <div class="stat-change">
                <span>${summary.totalTargets - summary.enabledTargets} disabled</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Features</div>
            <div class="stat-value">${summary.totalFeatures || 0}</div>
            <div class="stat-change positive">
                <span>↑ ${summary.totalPassing || 0} complete</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Overall Progress</div>
            <div class="stat-value">${summary.overallComplete || 0}%</div>
            <div class="stat-change">
                <span>${summary.totalPending || 0} pending</span>
            </div>
        </div>
    `;
}

// Render queue items
function renderQueue() {
    const queueList = document.getElementById('queue-list');
    const emptyState = document.getElementById('empty-state');
    const queueCount = document.getElementById('queue-count');

    if (currentQueue.length === 0) {
        queueList.style.display = 'none';
        emptyState.style.display = 'block';
        queueCount.textContent = '0 projects';
        return;
    }

    queueList.style.display = 'flex';
    emptyState.style.display = 'none';
    queueCount.textContent = `${currentQueue.length} project${currentQueue.length !== 1 ? 's' : ''}`;

    queueList.innerHTML = currentQueue.map((project, index) => {
        const complexityClass = `complexity-${project.complexity || 'medium'}`;
        const percent = project.features.percentComplete || 0;

        return `
            <div class="queue-item ${!project.enabled ? 'disabled' : ''}"
                 data-repo-id="${project.id}"
                 data-priority="${project.priority}"
                 draggable="true"
                 ondragstart="handleDragStart(event)"
                 ondragend="handleDragEnd(event)"
                 ondragover="handleDragOver(event)"
                 ondrop="handleDrop(event)"
                 ondragleave="handleDragLeave(event)">

                <div class="drag-handle">⋮⋮</div>

                <div class="queue-priority">${project.priority}</div>

                <div class="queue-project-info">
                    <div class="queue-project-name">${project.name}</div>
                    <div class="queue-project-path">${project.path}</div>
                    ${project.focus ? `<div class="queue-project-focus">Focus: ${project.focus}</div>` : ''}
                </div>

                <div class="queue-progress">
                    <div class="queue-progress-text">
                        <span>${project.features.passing || 0} / ${project.features.total || 0} features</span>
                        <span style="font-weight: 600; color: var(--color-primary);">${percent}%</span>
                    </div>
                    <div class="queue-progress-bar">
                        <div class="queue-progress-fill" style="width: ${percent}%"></div>
                    </div>
                </div>

                <div class="queue-actions">
                    <span class="complexity-badge ${complexityClass}">${project.complexity || 'medium'}</span>
                    <label class="toggle-switch" title="${project.enabled ? 'Disable' : 'Enable'} project">
                        <input type="checkbox"
                               ${project.enabled ? 'checked' : ''}
                               onchange="toggleEnabled('${project.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    }).join('');
}

// Drag and drop handlers
function handleDragStart(event) {
    draggedItem = event.target;
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target.innerHTML);
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');

    // Remove drag-over class from all items
    document.querySelectorAll('.queue-item').forEach(item => {
        item.classList.remove('drag-over');
    });

    draggedItem = null;
}

function handleDragOver(event) {
    if (event.preventDefault) {
        event.preventDefault();
    }

    event.dataTransfer.dropEffect = 'move';

    const target = event.target.closest('.queue-item');
    if (target && target !== draggedItem) {
        target.classList.add('drag-over');
    }

    return false;
}

function handleDragLeave(event) {
    const target = event.target.closest('.queue-item');
    if (target) {
        target.classList.remove('drag-over');
    }
}

function handleDrop(event) {
    if (event.stopPropagation) {
        event.stopPropagation();
    }

    const target = event.target.closest('.queue-item');

    if (draggedItem && target && draggedItem !== target) {
        // Get the priorities
        const draggedId = draggedItem.getAttribute('data-repo-id');
        const targetId = target.getAttribute('data-repo-id');

        const draggedProject = currentQueue.find(p => p.id === draggedId);
        const targetProject = currentQueue.find(p => p.id === targetId);

        if (draggedProject && targetProject) {
            // Swap priorities
            updatePriority(draggedId, targetProject.priority);
            updatePriority(targetId, draggedProject.priority);
        }
    }

    target.classList.remove('drag-over');

    return false;
}

// Update project priority
async function updatePriority(repoId, newPriority) {
    try {
        const response = await fetch(`${API_BASE}/api/targets/update-priority`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ repoId, newPriority }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || 'Failed to update priority');
        }

        // Reload queue to show updated priorities
        await loadQueue();

        showSuccess(`Updated priority for ${repoId}`);
    } catch (error) {
        console.error('Failed to update priority:', error);
        showError('Failed to update priority', error.message);
    }
}

// Toggle project enabled status
async function toggleEnabled(repoId, enabled) {
    try {
        const response = await fetch(`${API_BASE}/api/targets/toggle-enabled`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ repoId, enabled }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || 'Failed to toggle enabled status');
        }

        // Reload queue to show updated status
        await loadQueue();

        showSuccess(`${enabled ? 'Enabled' : 'Disabled'} ${repoId}`);
    } catch (error) {
        console.error('Failed to toggle enabled:', error);
        showError('Failed to toggle enabled status', error.message);
        // Reload to revert the toggle
        await loadQueue();
    }
}

// Refresh queue
function refreshQueue() {
    loadQueue();
}

// Show error notification
function showError(title, message) {
    if (typeof showErrorToast === 'function') {
        showErrorToast({ title, message, type: 'error', duration: 5000 });
    } else {
        alert(`${title}\n${message}`);
    }
}

// Show success notification
function showSuccess(message) {
    if (typeof showErrorToast === 'function') {
        showErrorToast({
            title: 'Success',
            message,
            type: 'info',
            duration: 2000
        });
    }
}
