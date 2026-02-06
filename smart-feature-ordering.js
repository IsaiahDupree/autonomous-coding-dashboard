/**
 * Smart Feature Ordering Widget (feat-050)
 * Parse feature dependencies, build execution graph, and respect ordering.
 */

class SmartFeatureOrdering {
  constructor(containerId = 'smart-feature-ordering-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';

    // State
    this.features = [];
    this.dependencies = {}; // { featureId: [dependsOnId, ...] }
    this.executionOrder = []; // Computed topological order
    this.graphData = null; // For visualization
    this.selectedFeature = null;
    this.editingDeps = false;
    this.filterText = '';
    this.showOnlyPending = false;
    this.cycleErrors = [];

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadData();
    this.refreshInterval = setInterval(() => this.loadData(), 30000);
  }

  render() {
    this.container.innerHTML = `
      <div class="sfo-widget">
        <div class="sfo-header">
          <h2 class="sfo-title">🔗 Smart Feature Ordering</h2>
          <div class="sfo-header-actions">
            <button class="sfo-btn sfo-btn-icon" id="sfo-refresh-btn" title="Refresh">🔄</button>
            <button class="sfo-btn sfo-btn-secondary" id="sfo-auto-detect-btn" title="Auto-detect dependencies from categories and priorities">🔍 Auto-Detect</button>
            <button class="sfo-btn sfo-btn-primary" id="sfo-compute-order-btn">📊 Compute Order</button>
            <button class="sfo-btn sfo-btn-icon" id="sfo-demo-btn" title="Generate Demo Data">🎲</button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="sfo-summary">
          <div class="sfo-stat-card">
            <div class="sfo-stat-value" id="sfo-total-features">0</div>
            <div class="sfo-stat-label">Total Features</div>
          </div>
          <div class="sfo-stat-card">
            <div class="sfo-stat-value" id="sfo-with-deps">0</div>
            <div class="sfo-stat-label">With Dependencies</div>
          </div>
          <div class="sfo-stat-card">
            <div class="sfo-stat-value" id="sfo-ready-count">0</div>
            <div class="sfo-stat-label">Ready to Build</div>
          </div>
          <div class="sfo-stat-card">
            <div class="sfo-stat-value" id="sfo-cycle-count">0</div>
            <div class="sfo-stat-label">Cycle Errors</div>
          </div>
        </div>

        <!-- Main Layout -->
        <div class="sfo-main-layout">
          <!-- Left: Dependency Graph Visualization -->
          <div class="sfo-graph-panel">
            <h3 class="sfo-section-title">Execution Graph</h3>
            <div class="sfo-graph-container" id="sfo-graph-container">
              <div class="sfo-graph-placeholder">Click "Compute Order" to build the execution graph</div>
            </div>
            <div class="sfo-graph-legend">
              <span class="sfo-legend-item"><span class="sfo-legend-dot sfo-dot-completed"></span> Completed</span>
              <span class="sfo-legend-item"><span class="sfo-legend-dot sfo-dot-ready"></span> Ready</span>
              <span class="sfo-legend-item"><span class="sfo-legend-dot sfo-dot-blocked"></span> Blocked</span>
              <span class="sfo-legend-item"><span class="sfo-legend-dot sfo-dot-cycle"></span> Cycle Error</span>
              <span class="sfo-legend-item"><span class="sfo-legend-line"></span> Dependency</span>
            </div>
          </div>

          <!-- Right: Execution Order & Dependency Editor -->
          <div class="sfo-right-panel">
            <!-- Execution Order -->
            <div class="sfo-order-panel">
              <h3 class="sfo-section-title">
                Execution Order
                <span class="sfo-badge" id="sfo-order-count">0</span>
              </h3>
              <div class="sfo-order-toolbar">
                <input type="text" class="sfo-search" id="sfo-filter-input" placeholder="Filter features..." />
                <label class="sfo-checkbox-label">
                  <input type="checkbox" id="sfo-pending-only" /> Pending only
                </label>
              </div>
              <div class="sfo-order-list" id="sfo-order-list">
                <div class="sfo-empty-state">No execution order computed yet</div>
              </div>
            </div>

            <!-- Dependency Editor -->
            <div class="sfo-dep-editor">
              <h3 class="sfo-section-title">Dependency Editor</h3>
              <div class="sfo-dep-editor-content" id="sfo-dep-editor-content">
                <div class="sfo-empty-state">Select a feature from the execution order to edit its dependencies</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cycle Errors -->
        <div class="sfo-cycles-panel" id="sfo-cycles-panel" style="display: none;">
          <h3 class="sfo-section-title">⚠️ Cycle Errors</h3>
          <div class="sfo-cycles-list" id="sfo-cycles-list"></div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Refresh
    this.container.querySelector('#sfo-refresh-btn').addEventListener('click', () => this.loadData());

    // Auto-detect dependencies
    this.container.querySelector('#sfo-auto-detect-btn').addEventListener('click', () => this.autoDetectDeps());

    // Compute order
    this.container.querySelector('#sfo-compute-order-btn').addEventListener('click', () => this.computeOrder());

    // Demo data
    this.container.querySelector('#sfo-demo-btn').addEventListener('click', () => this.generateDemo());

    // Filter input
    this.container.querySelector('#sfo-filter-input').addEventListener('input', (e) => {
      this.filterText = e.target.value.toLowerCase();
      this.renderOrderList();
    });

    // Pending only toggle
    this.container.querySelector('#sfo-pending-only').addEventListener('change', (e) => {
      this.showOnlyPending = e.target.checked;
      this.renderOrderList();
    });
  }

  async loadData() {
    try {
      const [featRes, depRes] = await Promise.all([
        fetch(`${this.API_BASE}/api/feature-ordering/features`),
        fetch(`${this.API_BASE}/api/feature-ordering/dependencies`)
      ]);
      const featJson = await featRes.json();
      const depJson = await depRes.json();

      if (featJson.success) {
        this.features = featJson.data.features || [];
      }
      if (depJson.success) {
        this.dependencies = depJson.data.dependencies || {};
        this.executionOrder = depJson.data.executionOrder || [];
        this.cycleErrors = depJson.data.cycleErrors || [];
        this.graphData = depJson.data.graphData || null;
      }

      this.updateSummary();
      this.renderOrderList();
      this.renderGraph();
      this.renderCycles();
    } catch (e) {
      console.warn('SmartFeatureOrdering: Failed to load data:', e);
    }
  }

  updateSummary() {
    const total = this.features.length;
    const withDeps = Object.keys(this.dependencies).filter(k => this.dependencies[k].length > 0).length;
    const completedIds = new Set(this.features.filter(f => f.passes).map(f => f.id));
    const ready = this.features.filter(f => {
      if (f.passes) return false;
      const deps = this.dependencies[f.id] || [];
      return deps.every(d => completedIds.has(d));
    }).length;

    this.container.querySelector('#sfo-total-features').textContent = total;
    this.container.querySelector('#sfo-with-deps').textContent = withDeps;
    this.container.querySelector('#sfo-ready-count').textContent = ready;
    this.container.querySelector('#sfo-cycle-count').textContent = this.cycleErrors.length;
  }

  renderOrderList() {
    const listEl = this.container.querySelector('#sfo-order-list');
    const countEl = this.container.querySelector('#sfo-order-count');
    const completedIds = new Set(this.features.filter(f => f.passes).map(f => f.id));

    let ordered = this.executionOrder.length > 0
      ? this.executionOrder.map(id => this.features.find(f => f.id === id)).filter(Boolean)
      : this.features;

    if (this.showOnlyPending) {
      ordered = ordered.filter(f => !f.passes);
    }

    if (this.filterText) {
      ordered = ordered.filter(f =>
        f.id.toLowerCase().includes(this.filterText) ||
        f.description.toLowerCase().includes(this.filterText) ||
        (f.category || '').toLowerCase().includes(this.filterText)
      );
    }

    countEl.textContent = ordered.length;

    if (ordered.length === 0) {
      listEl.innerHTML = '<div class="sfo-empty-state">No features match the filter</div>';
      return;
    }

    listEl.innerHTML = ordered.map((f, idx) => {
      const deps = this.dependencies[f.id] || [];
      const allDepsMet = deps.every(d => completedIds.has(d));
      const inCycle = this.cycleErrors.some(c => c.features && c.features.includes(f.id));
      let statusClass = 'sfo-status-blocked';
      let statusIcon = '🔒';
      if (f.passes) {
        statusClass = 'sfo-status-completed';
        statusIcon = '✅';
      } else if (inCycle) {
        statusClass = 'sfo-status-cycle';
        statusIcon = '⚠️';
      } else if (allDepsMet) {
        statusClass = 'sfo-status-ready';
        statusIcon = '🟢';
      }

      return `
        <div class="sfo-order-item ${statusClass} ${this.selectedFeature === f.id ? 'sfo-selected' : ''}" data-feature-id="${f.id}">
          <span class="sfo-order-num">${idx + 1}</span>
          <span class="sfo-order-icon">${statusIcon}</span>
          <div class="sfo-order-info">
            <div class="sfo-order-id">${f.id} <span class="sfo-order-cat">${f.category || ''}</span></div>
            <div class="sfo-order-desc">${f.description}</div>
            ${deps.length > 0 ? `<div class="sfo-order-deps">Depends on: ${deps.map(d => `<span class="sfo-dep-tag ${completedIds.has(d) ? 'sfo-dep-met' : 'sfo-dep-unmet'}">${d}</span>`).join(' ')}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Click handlers
    listEl.querySelectorAll('.sfo-order-item').forEach(el => {
      el.addEventListener('click', () => {
        const fId = el.getAttribute('data-feature-id');
        this.selectedFeature = fId;
        this.renderOrderList();
        this.renderDepEditor(fId);
      });
    });
  }

  renderDepEditor(featureId) {
    const editorEl = this.container.querySelector('#sfo-dep-editor-content');
    const feature = this.features.find(f => f.id === featureId);
    if (!feature) {
      editorEl.innerHTML = '<div class="sfo-empty-state">Feature not found</div>';
      return;
    }

    const currentDeps = this.dependencies[featureId] || [];
    const availableFeatures = this.features.filter(f => f.id !== featureId);

    editorEl.innerHTML = `
      <div class="sfo-dep-feature-info">
        <strong>${feature.id}</strong>: ${feature.description}
        <span class="sfo-dep-status ${feature.passes ? 'sfo-dep-pass' : 'sfo-dep-pending'}">${feature.passes ? 'Passing' : 'Pending'}</span>
      </div>
      <div class="sfo-dep-current">
        <label class="sfo-dep-label">Current Dependencies (${currentDeps.length}):</label>
        <div class="sfo-dep-tags" id="sfo-current-dep-tags">
          ${currentDeps.length === 0 ? '<span class="sfo-dep-none">No dependencies</span>' : currentDeps.map(d => `
            <span class="sfo-dep-tag sfo-dep-removable" data-dep-id="${d}">
              ${d} <button class="sfo-dep-remove" data-dep-id="${d}" title="Remove dependency">×</button>
            </span>
          `).join('')}
        </div>
      </div>
      <div class="sfo-dep-add">
        <label class="sfo-dep-label">Add Dependency:</label>
        <div class="sfo-dep-add-row">
          <select class="sfo-dep-select" id="sfo-dep-select">
            <option value="">-- Select a feature --</option>
            ${availableFeatures.filter(f => !currentDeps.includes(f.id)).map(f =>
              `<option value="${f.id}">${f.id}: ${f.description.substring(0, 50)}</option>`
            ).join('')}
          </select>
          <button class="sfo-btn sfo-btn-primary sfo-btn-sm" id="sfo-add-dep-btn">Add</button>
        </div>
      </div>
      <div class="sfo-dep-actions">
        <button class="sfo-btn sfo-btn-secondary sfo-btn-sm" id="sfo-save-deps-btn">💾 Save Dependencies</button>
        <button class="sfo-btn sfo-btn-danger sfo-btn-sm" id="sfo-clear-deps-btn">🗑️ Clear All</button>
      </div>
    `;

    // Remove dependency buttons
    editorEl.querySelectorAll('.sfo-dep-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const depId = btn.getAttribute('data-dep-id');
        const deps = this.dependencies[featureId] || [];
        this.dependencies[featureId] = deps.filter(d => d !== depId);
        this.renderDepEditor(featureId);
      });
    });

    // Add dependency
    editorEl.querySelector('#sfo-add-dep-btn').addEventListener('click', () => {
      const select = editorEl.querySelector('#sfo-dep-select');
      const depId = select.value;
      if (!depId) return;
      if (!this.dependencies[featureId]) this.dependencies[featureId] = [];
      if (!this.dependencies[featureId].includes(depId)) {
        this.dependencies[featureId].push(depId);
      }
      this.renderDepEditor(featureId);
    });

    // Save
    editorEl.querySelector('#sfo-save-deps-btn').addEventListener('click', () => this.saveDependencies());

    // Clear
    editorEl.querySelector('#sfo-clear-deps-btn').addEventListener('click', () => {
      this.dependencies[featureId] = [];
      this.renderDepEditor(featureId);
    });
  }

  renderGraph() {
    const container = this.container.querySelector('#sfo-graph-container');
    if (this.executionOrder.length === 0) {
      container.innerHTML = '<div class="sfo-graph-placeholder">Click "Compute Order" to build the execution graph</div>';
      return;
    }

    const completedIds = new Set(this.features.filter(f => f.passes).map(f => f.id));
    const cycleFeatureIds = new Set();
    this.cycleErrors.forEach(c => (c.features || []).forEach(id => cycleFeatureIds.add(id)));

    // Build layers for the DAG visualization
    const layers = this.buildLayers();

    // Compute SVG dimensions
    const nodeWidth = 120;
    const nodeHeight = 40;
    const layerGap = 80;
    const nodeGap = 16;
    const padding = 30;

    const maxNodesInLayer = Math.max(...layers.map(l => l.length), 1);
    const svgWidth = Math.max(layers.length * (nodeWidth + layerGap) + padding * 2, 400);
    const svgHeight = Math.max(maxNodesInLayer * (nodeHeight + nodeGap) + padding * 2, 200);

    // Position nodes
    const nodePositions = {};
    layers.forEach((layer, li) => {
      const x = padding + li * (nodeWidth + layerGap);
      const totalHeight = layer.length * nodeHeight + (layer.length - 1) * nodeGap;
      const startY = (svgHeight - totalHeight) / 2;
      layer.forEach((fId, ni) => {
        nodePositions[fId] = {
          x,
          y: startY + ni * (nodeHeight + nodeGap),
          cx: x + nodeWidth / 2,
          cy: startY + ni * (nodeHeight + nodeGap) + nodeHeight / 2
        };
      });
    });

    // Build edges
    const edges = [];
    Object.entries(this.dependencies).forEach(([fId, deps]) => {
      deps.forEach(depId => {
        if (nodePositions[fId] && nodePositions[depId]) {
          edges.push({ from: depId, to: fId });
        }
      });
    });

    // Render SVG
    let svg = `<svg class="sfo-graph-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="${Math.min(svgHeight, 400)}">`;

    // Draw edges (arrows)
    edges.forEach(edge => {
      const from = nodePositions[edge.from];
      const to = nodePositions[edge.to];
      if (!from || !to) return;
      const x1 = from.x + nodeWidth;
      const y1 = from.cy;
      const x2 = to.x;
      const y2 = to.cy;
      const midX = (x1 + x2) / 2;
      svg += `<path d="M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}" class="sfo-edge" fill="none" stroke="#555" stroke-width="1.5" marker-end="url(#arrowhead)" />`;
    });

    // Arrow marker
    svg += `<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#888"/></marker></defs>`;

    // Draw nodes
    Object.entries(nodePositions).forEach(([fId, pos]) => {
      const feat = this.features.find(f => f.id === fId);
      if (!feat) return;
      const deps = this.dependencies[fId] || [];
      const allDepsMet = deps.every(d => completedIds.has(d));
      let fillClass = 'sfo-node-blocked';
      if (feat.passes) fillClass = 'sfo-node-completed';
      else if (cycleFeatureIds.has(fId)) fillClass = 'sfo-node-cycle';
      else if (allDepsMet) fillClass = 'sfo-node-ready';

      svg += `<g class="sfo-graph-node ${fillClass}" data-feature-id="${fId}">`;
      svg += `<rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="${nodeHeight}" rx="6" ry="6"/>`;
      svg += `<text x="${pos.cx}" y="${pos.cy + 1}" text-anchor="middle" dominant-baseline="middle" class="sfo-node-text">${fId}</text>`;
      svg += `</g>`;
    });

    svg += '</svg>';
    container.innerHTML = svg;

    // Node click handlers
    container.querySelectorAll('.sfo-graph-node').forEach(node => {
      node.addEventListener('click', () => {
        const fId = node.getAttribute('data-feature-id');
        this.selectedFeature = fId;
        this.renderOrderList();
        this.renderDepEditor(fId);
      });
    });
  }

  buildLayers() {
    // Build layers using topological sorting for DAG visualization
    const inDegree = {};
    const adjList = {};

    const featureIds = this.executionOrder.length > 0
      ? this.executionOrder
      : this.features.map(f => f.id);

    const featureSet = new Set(featureIds);

    featureIds.forEach(id => {
      inDegree[id] = 0;
      adjList[id] = [];
    });

    Object.entries(this.dependencies).forEach(([fId, deps]) => {
      if (!featureSet.has(fId)) return;
      deps.forEach(depId => {
        if (!featureSet.has(depId)) return;
        adjList[depId] = adjList[depId] || [];
        adjList[depId].push(fId);
        inDegree[fId] = (inDegree[fId] || 0) + 1;
      });
    });

    // BFS layer assignment
    const layers = [];
    let current = featureIds.filter(id => (inDegree[id] || 0) === 0);

    const visited = new Set();
    while (current.length > 0) {
      layers.push(current);
      current.forEach(id => visited.add(id));
      const next = [];
      current.forEach(id => {
        (adjList[id] || []).forEach(child => {
          if (visited.has(child)) return;
          inDegree[child]--;
          if (inDegree[child] <= 0 && !visited.has(child)) {
            next.push(child);
          }
        });
      });
      // Deduplicate
      current = [...new Set(next)];
      if (layers.length > 50) break; // Safety: prevent infinite loops
    }

    // Add any remaining (cycle nodes) to last layer
    const remaining = featureIds.filter(id => !visited.has(id));
    if (remaining.length > 0) {
      layers.push(remaining);
    }

    // Limit nodes per layer for readability
    const MAX_PER_LAYER = 8;
    const result = [];
    layers.forEach(layer => {
      for (let i = 0; i < layer.length; i += MAX_PER_LAYER) {
        result.push(layer.slice(i, i + MAX_PER_LAYER));
      }
    });

    return result;
  }

  renderCycles() {
    const panel = this.container.querySelector('#sfo-cycles-panel');
    const list = this.container.querySelector('#sfo-cycles-list');

    if (this.cycleErrors.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    list.innerHTML = this.cycleErrors.map(c => `
      <div class="sfo-cycle-item">
        <span class="sfo-cycle-icon">🔄</span>
        <div class="sfo-cycle-info">
          <div class="sfo-cycle-desc">${c.message || 'Circular dependency detected'}</div>
          <div class="sfo-cycle-features">${(c.features || []).map(f => `<span class="sfo-dep-tag sfo-dep-unmet">${f}</span>`).join(' → ')}</div>
        </div>
        <button class="sfo-btn sfo-btn-danger sfo-btn-sm sfo-break-cycle-btn" data-cycle-idx="${c.index || 0}">Break Cycle</button>
      </div>
    `).join('');

    list.querySelectorAll('.sfo-break-cycle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-cycle-idx'));
        this.breakCycle(idx);
      });
    });
  }

  async autoDetectDeps() {
    try {
      const btn = this.container.querySelector('#sfo-auto-detect-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Detecting...';

      const res = await fetch(`${this.API_BASE}/api/feature-ordering/auto-detect`, { method: 'POST' });
      const json = await res.json();

      if (json.success) {
        this.dependencies = json.data.dependencies || {};
        this.updateSummary();
        this.renderOrderList();
      }

      btn.disabled = false;
      btn.textContent = '🔍 Auto-Detect';
    } catch (e) {
      console.warn('Auto-detect failed:', e);
      const btn = this.container.querySelector('#sfo-auto-detect-btn');
      btn.disabled = false;
      btn.textContent = '🔍 Auto-Detect';
    }
  }

  async computeOrder() {
    try {
      const btn = this.container.querySelector('#sfo-compute-order-btn');
      btn.disabled = true;
      btn.textContent = '⏳ Computing...';

      const res = await fetch(`${this.API_BASE}/api/feature-ordering/compute`, { method: 'POST' });
      const json = await res.json();

      if (json.success) {
        this.executionOrder = json.data.executionOrder || [];
        this.cycleErrors = json.data.cycleErrors || [];
        this.graphData = json.data.graphData || null;
        this.updateSummary();
        this.renderOrderList();
        this.renderGraph();
        this.renderCycles();
      }

      btn.disabled = false;
      btn.textContent = '📊 Compute Order';
    } catch (e) {
      console.warn('Compute order failed:', e);
      const btn = this.container.querySelector('#sfo-compute-order-btn');
      btn.disabled = false;
      btn.textContent = '📊 Compute Order';
    }
  }

  async saveDependencies() {
    try {
      const res = await fetch(`${this.API_BASE}/api/feature-ordering/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependencies: this.dependencies })
      });
      const json = await res.json();
      if (json.success) {
        // Re-compute after saving
        await this.computeOrder();
      }
    } catch (e) {
      console.warn('Save dependencies failed:', e);
    }
  }

  async breakCycle(cycleIdx) {
    try {
      const res = await fetch(`${this.API_BASE}/api/feature-ordering/break-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleIndex: cycleIdx })
      });
      const json = await res.json();
      if (json.success) {
        this.dependencies = json.data.dependencies || this.dependencies;
        await this.computeOrder();
      }
    } catch (e) {
      console.warn('Break cycle failed:', e);
    }
  }

  async generateDemo() {
    try {
      const btn = this.container.querySelector('#sfo-demo-btn');
      btn.disabled = true;
      const res = await fetch(`${this.API_BASE}/api/feature-ordering/demo`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await this.loadData();
      }
      btn.disabled = false;
    } catch (e) {
      console.warn('Demo generation failed:', e);
      this.container.querySelector('#sfo-demo-btn').disabled = false;
    }
  }
}

// Auto-instantiate on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SmartFeatureOrdering());
} else {
  new SmartFeatureOrdering();
}
