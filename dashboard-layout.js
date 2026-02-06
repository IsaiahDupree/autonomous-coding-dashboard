// ==========================================
// Customizable Dashboard Layout (feat-054)
// ==========================================

(function() {
    'use strict';

    const STORAGE_KEY = 'dashboard-layout-order';
    const LAYOUT_SETTINGS_KEY = 'dashboard-layout-settings';

    // Widget sections that can be reordered (children of main.container)
    // Each entry maps a widget identifier to its default order
    let widgetElements = [];
    let draggedElement = null;
    let dragPlaceholder = null;
    let isLayoutEditMode = false;

    /**
     * Get the main container element
     */
    function getContainer() {
        return document.querySelector('main.container');
    }

    /**
     * Initialize the layout system
     */
    function initDashboardLayout() {
        const container = getContainer();
        if (!container) return;

        // Tag each direct child with a layout identifier
        const children = Array.from(container.children);
        children.forEach((child, index) => {
            if (!child.dataset.layoutId) {
                child.dataset.layoutId = child.id || `widget-${index}`;
            }
            child.dataset.layoutDefaultOrder = index;
        });

        // Inject layout control bar
        injectLayoutControls();

        // Restore saved layout
        restoreLayout();

        // Add CSS for layout features
        injectLayoutStyles();
    }

    /**
     * Inject the layout control bar into the header
     */
    function injectLayoutControls() {
        const headerControls = document.querySelector('.header-content > div:last-child');
        if (!headerControls) return;

        // Check if already injected
        if (document.getElementById('layout-toggle-btn')) return;

        const layoutBtn = document.createElement('button');
        layoutBtn.id = 'layout-toggle-btn';
        layoutBtn.title = 'Customize layout';
        layoutBtn.textContent = '📐';
        layoutBtn.style.cssText = `
            background: var(--color-bg-tertiary);
            border: 1px solid var(--color-border);
            padding: 0.625rem 0.75rem;
            border-radius: var(--radius-md);
            font-size: 1.25rem;
            cursor: pointer;
            transition: all var(--transition-fast);
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        layoutBtn.addEventListener('click', toggleLayoutEditMode);

        // Insert before the theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            headerControls.insertBefore(layoutBtn, themeToggle);
        } else {
            headerControls.prepend(layoutBtn);
        }
    }

    /**
     * Inject CSS for layout editing
     */
    function injectLayoutStyles() {
        if (document.getElementById('layout-styles')) return;

        const style = document.createElement('style');
        style.id = 'layout-styles';
        style.textContent = `
            .layout-edit-mode .container > * {
                position: relative;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .layout-edit-mode .container > *::before {
                content: '⠿';
                position: absolute;
                top: 8px;
                left: 8px;
                width: 28px;
                height: 28px;
                background: var(--color-primary);
                color: white;
                border-radius: var(--radius-sm);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: grab;
                z-index: 100;
                font-size: 1rem;
                opacity: 0.9;
                box-shadow: var(--shadow-sm);
            }

            .layout-edit-mode .container > *:hover {
                outline: 2px dashed var(--color-primary);
                outline-offset: 2px;
            }

            .layout-edit-mode .container > .layout-dragging {
                opacity: 0.4;
                transform: scale(0.98);
            }

            .layout-edit-mode .container > .layout-drag-over {
                border-top: 3px solid var(--color-primary);
            }

            .layout-placeholder {
                background: var(--color-primary);
                opacity: 0.15;
                border: 2px dashed var(--color-primary);
                border-radius: var(--radius-md);
                min-height: 60px;
                margin: 0.5rem 0;
                transition: all 0.2s ease;
            }

            .layout-toolbar {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: 0.75rem 1.5rem;
                display: flex;
                gap: 1rem;
                align-items: center;
                z-index: 10001;
                box-shadow: var(--shadow-lg);
                backdrop-filter: blur(10px);
            }

            .layout-toolbar button {
                padding: 0.5rem 1rem;
                border-radius: var(--radius-md);
                border: 1px solid var(--color-border);
                cursor: pointer;
                font-size: 0.875rem;
                font-weight: 500;
                transition: all var(--transition-fast);
                font-family: var(--font-family-base);
            }

            .layout-toolbar .layout-save-btn {
                background: var(--color-primary);
                color: white;
                border-color: var(--color-primary);
            }

            .layout-toolbar .layout-save-btn:hover {
                background: var(--color-primary-light);
            }

            .layout-toolbar .layout-reset-btn {
                background: transparent;
                color: var(--color-warning);
                border-color: var(--color-warning);
            }

            .layout-toolbar .layout-reset-btn:hover {
                background: var(--color-warning);
                color: white;
            }

            .layout-toolbar .layout-cancel-btn {
                background: var(--color-bg-tertiary);
                color: var(--color-text-secondary);
            }

            .layout-toolbar .layout-cancel-btn:hover {
                background: var(--color-bg-card-hover);
                color: var(--color-text-primary);
            }

            .layout-toolbar-label {
                color: var(--color-text-secondary);
                font-size: 0.85rem;
                font-weight: 500;
            }

            #layout-toggle-btn.active {
                background: var(--color-primary) !important;
                color: white;
                border-color: var(--color-primary) !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Toggle layout edit mode
     */
    function toggleLayoutEditMode() {
        if (isLayoutEditMode) {
            exitLayoutEditMode();
        } else {
            enterLayoutEditMode();
        }
    }

    /**
     * Enter layout editing mode
     */
    function enterLayoutEditMode() {
        isLayoutEditMode = true;
        document.body.classList.add('layout-edit-mode');

        const btn = document.getElementById('layout-toggle-btn');
        if (btn) btn.classList.add('active');

        const container = getContainer();
        if (!container) return;

        // Make children draggable
        Array.from(container.children).forEach(child => {
            child.setAttribute('draggable', 'true');
            child.addEventListener('dragstart', handleDragStart);
            child.addEventListener('dragend', handleDragEnd);
            child.addEventListener('dragover', handleDragOver);
            child.addEventListener('dragenter', handleDragEnter);
            child.addEventListener('dragleave', handleDragLeave);
            child.addEventListener('drop', handleDrop);
        });

        // Show toolbar
        showLayoutToolbar();

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Layout Edit Mode',
                message: 'Drag widgets to reorder. Click Save when done.'
            });
        }
    }

    /**
     * Exit layout editing mode
     */
    function exitLayoutEditMode() {
        isLayoutEditMode = false;
        document.body.classList.remove('layout-edit-mode');

        const btn = document.getElementById('layout-toggle-btn');
        if (btn) btn.classList.remove('active');

        const container = getContainer();
        if (container) {
            Array.from(container.children).forEach(child => {
                child.removeAttribute('draggable');
                child.removeEventListener('dragstart', handleDragStart);
                child.removeEventListener('dragend', handleDragEnd);
                child.removeEventListener('dragover', handleDragOver);
                child.removeEventListener('dragenter', handleDragEnter);
                child.removeEventListener('dragleave', handleDragLeave);
                child.removeEventListener('drop', handleDrop);
                child.classList.remove('layout-dragging', 'layout-drag-over');
            });
        }

        // Remove toolbar
        hideLayoutToolbar();
    }

    /**
     * Show the layout toolbar
     */
    function showLayoutToolbar() {
        if (document.getElementById('layout-toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.id = 'layout-toolbar';
        toolbar.className = 'layout-toolbar';
        toolbar.innerHTML = `
            <span class="layout-toolbar-label">Layout Editor</span>
            <button class="layout-save-btn" onclick="window.dashboardLayout.saveLayout()">Save Layout</button>
            <button class="layout-reset-btn" onclick="window.dashboardLayout.resetLayout()">Reset to Default</button>
            <button class="layout-cancel-btn" onclick="window.dashboardLayout.toggleLayoutEditMode()">Cancel</button>
        `;
        document.body.appendChild(toolbar);
    }

    /**
     * Hide the layout toolbar
     */
    function hideLayoutToolbar() {
        const toolbar = document.getElementById('layout-toolbar');
        if (toolbar) toolbar.remove();
    }

    // ==========================================
    // Drag and Drop Handlers
    // ==========================================

    function handleDragStart(e) {
        draggedElement = this;
        this.classList.add('layout-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.layoutId);
    }

    function handleDragEnd(e) {
        this.classList.remove('layout-dragging');
        // Clean up all drag-over classes
        const container = getContainer();
        if (container) {
            Array.from(container.children).forEach(child => {
                child.classList.remove('layout-drag-over');
            });
        }
        // Remove placeholder
        if (dragPlaceholder && dragPlaceholder.parentNode) {
            dragPlaceholder.remove();
        }
        dragPlaceholder = null;
        draggedElement = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        if (this !== draggedElement) {
            this.classList.add('layout-drag-over');
        }
    }

    function handleDragLeave(e) {
        this.classList.remove('layout-drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        this.classList.remove('layout-drag-over');

        if (draggedElement && draggedElement !== this) {
            const container = getContainer();
            if (!container) return;

            const children = Array.from(container.children);
            const draggedIdx = children.indexOf(draggedElement);
            const targetIdx = children.indexOf(this);

            if (draggedIdx < targetIdx) {
                container.insertBefore(draggedElement, this.nextSibling);
            } else {
                container.insertBefore(draggedElement, this);
            }
        }
    }

    // ==========================================
    // Save / Restore / Reset Layout
    // ==========================================

    /**
     * Save the current layout order to localStorage
     */
    function saveLayout() {
        const container = getContainer();
        if (!container) return;

        const order = Array.from(container.children).map(child => child.dataset.layoutId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(order));

        exitLayoutEditMode();

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Layout Saved',
                message: 'Your dashboard layout has been saved.'
            });
        }
    }

    /**
     * Restore saved layout from localStorage
     */
    function restoreLayout() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        try {
            const order = JSON.parse(saved);
            const container = getContainer();
            if (!container) return;

            const children = Array.from(container.children);
            const childMap = {};
            children.forEach(child => {
                childMap[child.dataset.layoutId] = child;
            });

            // Reorder based on saved layout
            order.forEach(id => {
                const el = childMap[id];
                if (el) {
                    container.appendChild(el);
                }
            });

            // Append any new widgets not in saved layout at the end
            children.forEach(child => {
                if (!order.includes(child.dataset.layoutId)) {
                    container.appendChild(child);
                }
            });
        } catch (e) {
            console.warn('Failed to restore dashboard layout:', e);
        }
    }

    /**
     * Reset layout to default order
     */
    function resetLayout() {
        const container = getContainer();
        if (!container) return;

        const children = Array.from(container.children);
        children.sort((a, b) => {
            const orderA = parseInt(a.dataset.layoutDefaultOrder) || 0;
            const orderB = parseInt(b.dataset.layoutDefaultOrder) || 0;
            return orderA - orderB;
        });

        children.forEach(child => container.appendChild(child));

        localStorage.removeItem(STORAGE_KEY);

        exitLayoutEditMode();

        if (typeof showInfo === 'function') {
            showInfo({
                title: 'Layout Reset',
                message: 'Dashboard layout has been reset to default.'
            });
        }
    }

    // ==========================================
    // Public API
    // ==========================================

    window.dashboardLayout = {
        init: initDashboardLayout,
        toggleLayoutEditMode: toggleLayoutEditMode,
        saveLayout: saveLayout,
        resetLayout: resetLayout,
        restoreLayout: restoreLayout,
        isEditMode: () => isLayoutEditMode,
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', initDashboardLayout);

})();
