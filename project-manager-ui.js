/**
 * Project Manager UI Component
 * ============================
 * 
 * Multi-project management interface for the dashboard.
 * Allows creating, importing, and managing multiple harness projects.
 */

class ProjectManagerUI {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.projects = [];
    this.selectedProject = null;
    this.filters = { status: [], tags: [], search: '' };
    this.init();
  }

  async init() {
    await this.fetchProjects();
    await this.fetchDashboardStats();
    this.render();
    this.addStyles();
  }

  async fetchProjects() {
    try {
      const params = new URLSearchParams();
      if (this.filters.status.length) params.set('status', this.filters.status.join(','));
      if (this.filters.tags.length) params.set('tags', this.filters.tags.join(','));
      if (this.filters.search) params.set('search', this.filters.search);

      const response = await fetch(`${this.baseUrl}/api/managed-projects?${params}`);
      const result = await response.json();
      this.projects = result.data || [];
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      this.projects = [];
    }
  }

  async fetchDashboardStats() {
    try {
      const response = await fetch(`${this.baseUrl}/api/dashboard/stats`);
      const result = await response.json();
      this.stats = result.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      this.stats = null;
    }
  }

  async createProject(data) {
    try {
      const response = await fetch(`${this.baseUrl}/api/managed-projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.data) {
        this.projects.unshift(result.data);
        this.render();
        this.showToast('Project created', 'success');
      }
      return result.data;
    } catch (error) {
      this.showToast('Failed to create project', 'error');
      return null;
    }
  }

  async importProject(path) {
    try {
      const response = await fetch(`${this.baseUrl}/api/managed-projects/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const result = await response.json();
      if (result.data) {
        this.projects.unshift(result.data);
        this.render();
        this.showToast('Project imported', 'success');
      }
      return result.data;
    } catch (error) {
      this.showToast('Failed to import project', 'error');
      return null;
    }
  }

  async scanDirectory(path, depth = 2) {
    try {
      const response = await fetch(`${this.baseUrl}/api/managed-projects/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, depth }),
      });
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      this.showToast('Failed to scan directory', 'error');
      return [];
    }
  }

  async deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await fetch(`${this.baseUrl}/api/managed-projects/${id}`, { method: 'DELETE' });
      this.projects = this.projects.filter(p => p.id !== id);
      this.render();
      this.showToast('Project deleted', 'success');
    } catch (error) {
      this.showToast('Failed to delete project', 'error');
    }
  }

  async archiveProject(id) {
    try {
      const response = await fetch(`${this.baseUrl}/api/managed-projects/${id}/archive`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.data) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index > -1) this.projects[index] = result.data;
        this.render();
        this.showToast('Project archived', 'success');
      }
    } catch (error) {
      this.showToast('Failed to archive project', 'error');
    }
  }

  render() {
    const container = document.getElementById('project-manager');
    if (!container) return;

    container.innerHTML = `
      <div class="pm-container">
        ${this.renderHeader()}
        ${this.renderStats()}
        ${this.renderFilters()}
        ${this.renderProjectGrid()}
      </div>
      ${this.renderModals()}
    `;

    this.bindEvents();
  }

  renderHeader() {
    return `
      <div class="pm-header">
        <div class="pm-title">
          <h2>📁 Project Manager</h2>
          <span class="pm-count">${this.projects.length} projects</span>
        </div>
        <div class="pm-actions">
          <button class="btn-secondary" onclick="projectManager.showScanModal()">
            🔍 Scan Directory
          </button>
          <button class="btn-secondary" onclick="projectManager.showImportModal()">
            📥 Import
          </button>
          <button class="btn-primary" onclick="projectManager.showCreateModal()">
            ➕ New Project
          </button>
        </div>
      </div>
    `;
  }

  renderStats() {
    if (!this.stats) return '';

    return `
      <div class="pm-stats">
        <div class="pm-stat">
          <span class="pm-stat-value">${this.stats.totalProjects}</span>
          <span class="pm-stat-label">Total Projects</span>
        </div>
        <div class="pm-stat">
          <span class="pm-stat-value active">${this.stats.activeProjects}</span>
          <span class="pm-stat-label">Active</span>
        </div>
        <div class="pm-stat">
          <span class="pm-stat-value">${this.stats.completedFeatures}/${this.stats.totalFeatures}</span>
          <span class="pm-stat-label">Features</span>
        </div>
        <div class="pm-stat">
          <span class="pm-stat-value success">${this.stats.avgSuccessRate}%</span>
          <span class="pm-stat-label">Success Rate</span>
        </div>
        <div class="pm-stat">
          <span class="pm-stat-value">$${this.stats.totalCost.toFixed(2)}</span>
          <span class="pm-stat-label">Total Cost</span>
        </div>
        <div class="pm-stat">
          <span class="pm-stat-value">${this.stats.totalSessions}</span>
          <span class="pm-stat-label">Sessions</span>
        </div>
      </div>
    `;
  }

  renderFilters() {
    return `
      <div class="pm-filters">
        <div class="pm-search">
          <input type="text" 
                 id="pm-search-input"
                 placeholder="Search projects..." 
                 value="${this.filters.search}"
                 onkeyup="projectManager.handleSearch(event)">
        </div>
        <div class="pm-filter-buttons">
          <button class="filter-btn ${this.filters.status.includes('active') ? 'active' : ''}" 
                  onclick="projectManager.toggleStatusFilter('active')">Active</button>
          <button class="filter-btn ${this.filters.status.includes('paused') ? 'active' : ''}"
                  onclick="projectManager.toggleStatusFilter('paused')">Paused</button>
          <button class="filter-btn ${this.filters.status.includes('completed') ? 'active' : ''}"
                  onclick="projectManager.toggleStatusFilter('completed')">Completed</button>
          <button class="filter-btn ${this.filters.status.includes('archived') ? 'active' : ''}"
                  onclick="projectManager.toggleStatusFilter('archived')">Archived</button>
        </div>
      </div>
    `;
  }

  renderProjectGrid() {
    if (this.projects.length === 0) {
      return `
        <div class="pm-empty">
          <span class="pm-empty-icon">📂</span>
          <h3>No Projects Yet</h3>
          <p>Create a new project or import an existing one to get started.</p>
          <button class="btn-primary" onclick="projectManager.showCreateModal()">
            Create Your First Project
          </button>
        </div>
      `;
    }

    return `
      <div class="pm-grid">
        ${this.projects.map(p => this.renderProjectCard(p)).join('')}
      </div>
    `;
  }

  renderProjectCard(project) {
    const statusColors = {
      active: '#10b981',
      paused: '#f59e0b',
      completed: '#6366f1',
      archived: '#6b7280',
    };

    const progress = project.stats.totalFeatures > 0
      ? Math.round((project.stats.completedFeatures / project.stats.totalFeatures) * 100)
      : 0;

    return `
      <div class="pm-card" data-project-id="${project.id}">
        <div class="pm-card-header">
          <div class="pm-card-status" style="background: ${statusColors[project.status]}"></div>
          <div class="pm-card-title">
            <h3>${this.escapeHtml(project.name)}</h3>
            ${project.description ? `<p>${this.escapeHtml(project.description)}</p>` : ''}
          </div>
          <div class="pm-card-menu">
            <button class="pm-menu-btn" onclick="projectManager.toggleMenu('${project.id}')">⋮</button>
            <div class="pm-menu-dropdown" id="menu-${project.id}">
              <button onclick="projectManager.openProject('${project.id}')">Open</button>
              <button onclick="projectManager.editProject('${project.id}')">Edit</button>
              <button onclick="projectManager.archiveProject('${project.id}')">Archive</button>
              <button class="danger" onclick="projectManager.deleteProject('${project.id}')">Delete</button>
            </div>
          </div>
        </div>
        
        <div class="pm-card-path">${this.escapeHtml(project.path)}</div>
        
        <div class="pm-card-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text">${project.stats.completedFeatures}/${project.stats.totalFeatures} features (${progress}%)</span>
        </div>
        
        <div class="pm-card-stats">
          <div class="pm-card-stat">
            <span class="stat-icon">🔄</span>
            <span>${project.stats.totalSessions} sessions</span>
          </div>
          <div class="pm-card-stat">
            <span class="stat-icon">💰</span>
            <span>$${project.stats.totalCost.toFixed(2)}</span>
          </div>
          <div class="pm-card-stat">
            <span class="stat-icon">✓</span>
            <span>${project.stats.successRate}% success</span>
          </div>
        </div>
        
        ${project.tags.length > 0 ? `
          <div class="pm-card-tags">
            ${project.tags.map(t => `<span class="pm-tag">${this.escapeHtml(t)}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="pm-card-footer">
          <span class="pm-card-updated">Updated ${this.formatTimeAgo(new Date(project.updatedAt))}</span>
          <button class="btn-small" onclick="projectManager.startHarness('${project.id}')">
            ▶ Start Harness
          </button>
        </div>
      </div>
    `;
  }

  renderModals() {
    return `
      <div id="pm-modal" class="pm-modal hidden">
        <div class="pm-modal-content">
          <div class="pm-modal-header">
            <h3 id="pm-modal-title">Modal</h3>
            <button class="pm-modal-close" onclick="projectManager.closeModal()">&times;</button>
          </div>
          <div id="pm-modal-body" class="pm-modal-body"></div>
        </div>
      </div>
    `;
  }

  showCreateModal() {
    const modal = document.getElementById('pm-modal');
    const title = document.getElementById('pm-modal-title');
    const body = document.getElementById('pm-modal-body');

    title.textContent = 'Create New Project';
    body.innerHTML = `
      <form id="create-project-form" onsubmit="projectManager.handleCreateSubmit(event)">
        <div class="form-group">
          <label>Project Name *</label>
          <input type="text" id="project-name" required placeholder="My Awesome Project">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="project-description" placeholder="What is this project about?"></textarea>
        </div>
        <div class="form-group">
          <label>Project Path *</label>
          <input type="text" id="project-path" required placeholder="/path/to/project">
        </div>
        <div class="form-group">
          <label>Tags (comma-separated)</label>
          <input type="text" id="project-tags" placeholder="web, frontend, react">
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="projectManager.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Create Project</button>
        </div>
      </form>
    `;

    modal.classList.remove('hidden');
  }

  showImportModal() {
    const modal = document.getElementById('pm-modal');
    const title = document.getElementById('pm-modal-title');
    const body = document.getElementById('pm-modal-body');

    title.textContent = 'Import Project';
    body.innerHTML = `
      <form id="import-project-form" onsubmit="projectManager.handleImportSubmit(event)">
        <div class="form-group">
          <label>Project Path *</label>
          <input type="text" id="import-path" required placeholder="/path/to/existing/project">
          <p class="form-hint">Enter the full path to an existing project directory</p>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="projectManager.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Import</button>
        </div>
      </form>
    `;

    modal.classList.remove('hidden');
  }

  showScanModal() {
    const modal = document.getElementById('pm-modal');
    const title = document.getElementById('pm-modal-title');
    const body = document.getElementById('pm-modal-body');

    title.textContent = 'Scan Directory for Projects';
    body.innerHTML = `
      <div class="scan-container">
        <div class="form-group">
          <label>Directory Path</label>
          <div class="input-with-button">
            <input type="text" id="scan-path" placeholder="/path/to/scan">
            <button type="button" class="btn-primary" onclick="projectManager.handleScan()">Scan</button>
          </div>
        </div>
        <div id="scan-results" class="scan-results"></div>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  async handleCreateSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('project-name').value;
    const description = document.getElementById('project-description').value;
    const path = document.getElementById('project-path').value;
    const tagsStr = document.getElementById('project-tags').value;
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

    await this.createProject({ name, description, path, tags });
    this.closeModal();
  }

  async handleImportSubmit(event) {
    event.preventDefault();
    const path = document.getElementById('import-path').value;
    await this.importProject(path);
    this.closeModal();
  }

  async handleScan() {
    const path = document.getElementById('scan-path').value;
    if (!path) return;

    const results = document.getElementById('scan-results');
    results.innerHTML = '<div class="scanning">Scanning...</div>';

    const paths = await this.scanDirectory(path);
    
    if (paths.length === 0) {
      results.innerHTML = '<div class="no-results">No projects found</div>';
      return;
    }

    results.innerHTML = `
      <div class="scan-list">
        <p class="scan-count">Found ${paths.length} project(s):</p>
        ${paths.map(p => `
          <div class="scan-item">
            <span class="scan-path">${this.escapeHtml(p)}</span>
            <button class="btn-small" onclick="projectManager.importProject('${this.escapeHtml(p)}')">Import</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  handleSearch(event) {
    this.filters.search = event.target.value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.fetchProjects().then(() => this.render());
    }, 300);
  }

  async toggleStatusFilter(status) {
    const index = this.filters.status.indexOf(status);
    if (index > -1) {
      this.filters.status.splice(index, 1);
    } else {
      this.filters.status.push(status);
    }
    await this.fetchProjects();
    this.render();
  }

  closeModal() {
    document.getElementById('pm-modal').classList.add('hidden');
  }

  toggleMenu(projectId) {
    const menu = document.getElementById(`menu-${projectId}`);
    const wasVisible = menu.classList.contains('visible');
    
    // Close all menus
    document.querySelectorAll('.pm-menu-dropdown').forEach(m => m.classList.remove('visible'));
    
    if (!wasVisible) {
      menu.classList.add('visible');
    }
  }

  openProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      // Switch dashboard to this project
      window.currentProjectId = projectId;
      window.currentProjectPath = project.path;
      this.showToast(`Switched to ${project.name}`, 'info');
    }
  }

  editProject(projectId) {
    // TODO: Implement edit modal
    this.showToast('Edit coming soon', 'info');
  }

  async startHarness(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      const response = await fetch(`${this.baseUrl}/api/harnesses/${projectId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: project.path,
          mode: 'coding',
        }),
      });
      
      if (response.ok) {
        this.showToast(`Started harness for ${project.name}`, 'success');
      } else {
        throw new Error('Failed to start');
      }
    } catch (error) {
      this.showToast('Failed to start harness', 'error');
    }
  }

  bindEvents() {
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.pm-card-menu')) {
        document.querySelectorAll('.pm-menu-dropdown').forEach(m => m.classList.remove('visible'));
      }
    });
  }

  formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `pm-toast pm-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  addStyles() {
    if (document.getElementById('project-manager-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'project-manager-styles';
    styles.textContent = `
      .pm-container {
        padding: 1.5rem;
      }

      .pm-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .pm-title {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .pm-title h2 {
        margin: 0;
        font-size: 1.5rem;
      }

      .pm-count {
        background: rgba(99, 102, 241, 0.2);
        color: #818cf8;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.85rem;
      }

      .pm-actions {
        display: flex;
        gap: 0.75rem;
      }

      .pm-stats {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
        background: var(--color-surface, #1a2234);
        padding: 1rem;
        border-radius: 12px;
      }

      .pm-stat {
        text-align: center;
      }

      .pm-stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        display: block;
      }

      .pm-stat-value.active { color: #10b981; }
      .pm-stat-value.success { color: #6366f1; }

      .pm-stat-label {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
      }

      .pm-filters {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .pm-search {
        flex: 1;
        min-width: 200px;
      }

      .pm-search input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
        background: var(--color-surface, #1a2234);
        color: var(--color-text, #f1f5f9);
        font-size: 0.9rem;
      }

      .pm-filter-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .filter-btn {
        padding: 0.5rem 1rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-muted, #94a3b8);
        cursor: pointer;
        transition: all 0.2s;
      }

      .filter-btn:hover, .filter-btn.active {
        background: rgba(99, 102, 241, 0.2);
        border-color: #6366f1;
        color: #818cf8;
      }

      .pm-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
      }

      .pm-card {
        background: var(--color-surface, #1a2234);
        border-radius: 12px;
        padding: 1.25rem;
        border: 1px solid rgba(148, 163, 184, 0.1);
        transition: all 0.2s;
      }

      .pm-card:hover {
        border-color: rgba(99, 102, 241, 0.3);
        transform: translateY(-2px);
      }

      .pm-card-header {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .pm-card-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-top: 6px;
        flex-shrink: 0;
      }

      .pm-card-title {
        flex: 1;
      }

      .pm-card-title h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      .pm-card-title p {
        margin: 0.25rem 0 0;
        font-size: 0.85rem;
        color: var(--color-text-muted, #94a3b8);
      }

      .pm-card-menu {
        position: relative;
      }

      .pm-menu-btn {
        background: none;
        border: none;
        color: var(--color-text-muted, #94a3b8);
        cursor: pointer;
        font-size: 1.25rem;
        padding: 0.25rem;
      }

      .pm-menu-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--color-surface, #1a2234);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
        padding: 0.5rem 0;
        min-width: 120px;
        display: none;
        z-index: 10;
      }

      .pm-menu-dropdown.visible {
        display: block;
      }

      .pm-menu-dropdown button {
        width: 100%;
        padding: 0.5rem 1rem;
        background: none;
        border: none;
        text-align: left;
        color: var(--color-text, #f1f5f9);
        cursor: pointer;
      }

      .pm-menu-dropdown button:hover {
        background: rgba(99, 102, 241, 0.2);
      }

      .pm-menu-dropdown button.danger {
        color: #ef4444;
      }

      .pm-card-path {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
        font-family: monospace;
        margin-bottom: 0.75rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .pm-card-progress {
        margin-bottom: 0.75rem;
      }

      .progress-bar {
        height: 6px;
        background: rgba(148, 163, 184, 0.2);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 0.25rem;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        border-radius: 3px;
        transition: width 0.3s;
      }

      .progress-text {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
      }

      .pm-card-stats {
        display: flex;
        gap: 1rem;
        margin-bottom: 0.75rem;
      }

      .pm-card-stat {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.8rem;
        color: var(--color-text-muted, #94a3b8);
      }

      .pm-card-tags {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }

      .pm-tag {
        background: rgba(99, 102, 241, 0.2);
        color: #818cf8;
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
      }

      .pm-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 0.75rem;
        border-top: 1px solid rgba(148, 163, 184, 0.1);
      }

      .pm-card-updated {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
      }

      .pm-empty {
        text-align: center;
        padding: 4rem 2rem;
        background: var(--color-surface, #1a2234);
        border-radius: 12px;
      }

      .pm-empty-icon {
        font-size: 4rem;
        display: block;
        margin-bottom: 1rem;
      }

      .pm-empty h3 {
        margin: 0 0 0.5rem;
      }

      .pm-empty p {
        color: var(--color-text-muted, #94a3b8);
        margin: 0 0 1.5rem;
      }

      /* Modal */
      .pm-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .pm-modal.hidden {
        display: none;
      }

      .pm-modal-content {
        background: var(--color-bg, #0f172a);
        border-radius: 12px;
        width: 100%;
        max-width: 500px;
        max-height: 80vh;
        overflow: auto;
      }

      .pm-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      }

      .pm-modal-header h3 {
        margin: 0;
      }

      .pm-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--color-text-muted, #94a3b8);
        cursor: pointer;
      }

      .pm-modal-body {
        padding: 1.5rem;
      }

      .form-group {
        margin-bottom: 1rem;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }

      .form-group input, .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
        background: var(--color-surface, #1a2234);
        color: var(--color-text, #f1f5f9);
        font-size: 0.9rem;
      }

      .form-group textarea {
        min-height: 80px;
        resize: vertical;
      }

      .form-hint {
        font-size: 0.75rem;
        color: var(--color-text-muted, #94a3b8);
        margin-top: 0.25rem;
      }

      .form-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }

      .input-with-button {
        display: flex;
        gap: 0.5rem;
      }

      .input-with-button input {
        flex: 1;
      }

      .scan-results {
        margin-top: 1rem;
      }

      .scan-list {
        max-height: 300px;
        overflow-y: auto;
      }

      .scan-count {
        margin: 0 0 0.75rem;
        color: var(--color-text-muted, #94a3b8);
      }

      .scan-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: var(--color-surface, #1a2234);
        border-radius: 6px;
        margin-bottom: 0.5rem;
      }

      .scan-path {
        font-family: monospace;
        font-size: 0.8rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        margin-right: 1rem;
      }

      .btn-primary, .btn-secondary, .btn-small {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.2s;
      }

      .btn-primary {
        background: #6366f1;
        color: white;
      }

      .btn-primary:hover {
        background: #4f46e5;
      }

      .btn-secondary {
        background: rgba(148, 163, 184, 0.2);
        color: var(--color-text, #f1f5f9);
      }

      .btn-secondary:hover {
        background: rgba(148, 163, 184, 0.3);
      }

      .btn-small {
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
      }

      .pm-toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1002;
      }

      .pm-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      .pm-toast-success { background: #10b981; color: white; }
      .pm-toast-error { background: #ef4444; color: white; }
      .pm-toast-info { background: #3b82f6; color: white; }
    `;

    document.head.appendChild(styles);
  }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('project-manager')) {
    window.projectManager = new ProjectManagerUI();
  }
});

window.ProjectManagerUI = ProjectManagerUI;
