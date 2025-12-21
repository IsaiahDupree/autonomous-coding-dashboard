/**
 * Git Timeline Component
 * ======================
 * 
 * Displays commit history with visual indicators for agent vs user commits.
 * Integrates with the dashboard to show real-time git activity.
 */

class GitTimeline {
  constructor(containerId = 'git-timeline') {
    this.container = document.getElementById(containerId);
    this.commits = [];
    this.repoPath = '/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard';
    this.baseUrl = 'http://localhost:3001';
    this.autoRefresh = true;
    this.refreshInterval = null;
    
    if (this.container) {
      this.init();
    }
  }

  async init() {
    await this.fetchCommits();
    this.render();
    this.startAutoRefresh();
  }

  async fetchCommits(limit = 20) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/git/commits?path=${encodeURIComponent(this.repoPath)}&limit=${limit}`
      );
      const result = await response.json();
      
      if (result.data) {
        this.commits = result.data;
        this.render();
      }
    } catch (error) {
      console.error('Failed to fetch commits:', error);
    }
  }

  async fetchStats() {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/git/stats?path=${encodeURIComponent(this.repoPath)}`
      );
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return null;
    }
  }

  render() {
    if (!this.container) return;

    if (this.commits.length === 0) {
      this.container.innerHTML = `
        <div class="git-empty">
          <span>📭</span>
          <p>No commits found</p>
        </div>
      `;
      return;
    }

    const html = this.commits.map(commit => this.renderCommit(commit)).join('');
    this.container.innerHTML = html;
  }

  renderCommit(commit) {
    const timeAgo = this.formatTimeAgo(new Date(commit.author.date));
    const isAgent = commit.isAgentCommit;
    
    return `
      <div class="timeline-item ${isAgent ? 'agent-commit' : 'user-commit'}">
        <div class="timeline-marker ${isAgent ? 'agent' : 'user'}">
          ${isAgent ? '🤖' : '👤'}
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="commit-sha" title="${commit.sha}">${commit.shortSha}</span>
            <span class="commit-time">${timeAgo}</span>
          </div>
          <div class="commit-message">${this.escapeHtml(commit.message)}</div>
          <div class="commit-author">
            <span class="author-name">${this.escapeHtml(commit.author.name)}</span>
            ${isAgent ? '<span class="agent-badge">Agent</span>' : ''}
          </div>
        </div>
      </div>
    `;
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

  startAutoRefresh(interval = 30000) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    if (this.autoRefresh) {
      this.refreshInterval = setInterval(() => this.fetchCommits(), interval);
    }
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  setRepoPath(path) {
    this.repoPath = path;
    this.fetchCommits();
  }
}

/**
 * Git Stats Widget
 * Shows commit statistics
 */
class GitStatsWidget {
  constructor(containerId = 'git-stats') {
    this.container = document.getElementById(containerId);
    this.baseUrl = 'http://localhost:3001';
    this.repoPath = '/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard';
    
    if (this.container) {
      this.init();
    }
  }

  async init() {
    await this.fetchAndRender();
  }

  async fetchAndRender() {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/git/stats?path=${encodeURIComponent(this.repoPath)}`
      );
      const result = await response.json();
      
      if (result.data) {
        this.render(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch git stats:', error);
    }
  }

  render(stats) {
    if (!this.container) return;

    const agentPercent = stats.total > 0 
      ? Math.round((stats.agentCommits / stats.total) * 100) 
      : 0;

    this.container.innerHTML = `
      <div class="git-stats-grid">
        <div class="git-stat">
          <div class="git-stat-value">${stats.total}</div>
          <div class="git-stat-label">Total Commits</div>
        </div>
        <div class="git-stat">
          <div class="git-stat-value agent-color">${stats.agentCommits}</div>
          <div class="git-stat-label">Agent Commits</div>
        </div>
        <div class="git-stat">
          <div class="git-stat-value user-color">${stats.userCommits}</div>
          <div class="git-stat-label">User Commits</div>
        </div>
        <div class="git-stat">
          <div class="git-stat-value">${agentPercent}%</div>
          <div class="git-stat-label">Agent Ratio</div>
        </div>
      </div>
      <div class="git-ratio-bar">
        <div class="ratio-agent" style="width: ${agentPercent}%"></div>
        <div class="ratio-user" style="width: ${100 - agentPercent}%"></div>
      </div>
    `;
  }
}

// Add styles
function addGitTimelineStyles() {
  if (document.getElementById('git-timeline-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'git-timeline-styles';
  styles.textContent = `
    .git-empty {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted, #94a3b8);
    }
    
    .git-empty span {
      font-size: 2rem;
      display: block;
      margin-bottom: 0.5rem;
    }
    
    .timeline-item {
      display: flex;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }
    
    .timeline-item:last-child {
      border-bottom: none;
    }
    
    .timeline-marker {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1rem;
    }
    
    .timeline-marker.agent {
      background: rgba(99, 102, 241, 0.2);
    }
    
    .timeline-marker.user {
      background: rgba(16, 185, 129, 0.2);
    }
    
    .timeline-content {
      flex: 1;
      min-width: 0;
    }
    
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }
    
    .commit-sha {
      font-family: var(--font-family-mono, monospace);
      font-size: 0.75rem;
      color: var(--color-primary, #6366f1);
      background: rgba(99, 102, 241, 0.1);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }
    
    .commit-time {
      font-size: 0.75rem;
      color: var(--color-text-muted, #94a3b8);
    }
    
    .commit-message {
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .commit-author {
      font-size: 0.75rem;
      color: var(--color-text-muted, #94a3b8);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .agent-badge {
      background: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 600;
    }
    
    .agent-commit .commit-message {
      color: #c7d2fe;
    }
    
    /* Git Stats Widget */
    .git-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .git-stat {
      text-align: center;
    }
    
    .git-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text, #f1f5f9);
    }
    
    .git-stat-value.agent-color {
      color: #818cf8;
    }
    
    .git-stat-value.user-color {
      color: #10b981;
    }
    
    .git-stat-label {
      font-size: 0.75rem;
      color: var(--color-text-muted, #94a3b8);
    }
    
    .git-ratio-bar {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      background: rgba(148, 163, 184, 0.2);
    }
    
    .ratio-agent {
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      transition: width 0.5s ease;
    }
    
    .ratio-user {
      background: #10b981;
      transition: width 0.5s ease;
    }
  `;

  document.head.appendChild(styles);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  addGitTimelineStyles();
  
  // Initialize git timeline if container exists
  if (document.getElementById('git-timeline')) {
    window.gitTimeline = new GitTimeline();
  }
  
  // Initialize git stats if container exists
  if (document.getElementById('git-stats')) {
    window.gitStats = new GitStatsWidget();
  }
});

// Export for manual initialization
window.GitTimeline = GitTimeline;
window.GitStatsWidget = GitStatsWidget;
