// Target Health Scoring System (feat-063)
(function() {
  'use strict';

  const STORAGE_KEY = 'target-health-config';
  let state = {
    targets: [],
    errorLog: [],
    lastCalculated: null,
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = { ...state, ...JSON.parse(saved) };
    } catch(e) {}
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // --- CSS ---
  const style = document.createElement('style');
  style.textContent = `
    #target-health-card {
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 12px;
      overflow: hidden;
    }
    #target-health-card .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      background: var(--color-bg-tertiary, #151928);
    }
    #target-health-card .card-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    #target-health-card .card-body {
      padding: 20px;
    }

    /* Overall health */
    .th-overall {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      padding: 16px;
      background: var(--color-bg-primary, #0a0e1a);
      border-radius: 8px;
      border: 1px solid var(--color-border, #2a2f3e);
    }
    .th-overall-score {
      flex-shrink: 0;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      font-weight: 700;
      position: relative;
    }
    .th-overall-ring {
      position: absolute;
      top: 0; left: 0;
      width: 72px;
      height: 72px;
    }
    .th-overall-info {
      flex: 1;
    }
    .th-overall-label {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #94a3b8);
      margin-bottom: 4px;
    }
    .th-overall-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--color-text-primary, #f1f5f9);
    }
    .th-overall-detail {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #94a3b8);
      margin-top: 4px;
    }

    /* Health badge */
    .th-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .th-badge-excellent {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .th-badge-good {
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .th-badge-fair {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .th-badge-poor {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .th-badge-critical {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .th-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    /* Metrics grid */
    .th-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .th-metric-card {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .th-metric-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--color-text-primary, #f1f5f9);
    }
    .th-metric-label {
      font-size: 0.7rem;
      color: var(--color-text-secondary, #94a3b8);
      margin-top: 2px;
    }

    /* Target list */
    .th-targets {
      margin-top: 16px;
    }
    .th-target-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      margin-bottom: 6px;
    }
    .th-target-name {
      flex: 1;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text-primary, #f1f5f9);
    }
    .th-target-bar {
      flex: 0 0 100px;
      height: 6px;
      background: var(--color-bg-secondary, #1a1f2e);
      border-radius: 3px;
      overflow: hidden;
    }
    .th-target-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .th-target-score {
      flex-shrink: 0;
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 36px;
      text-align: right;
    }
    .th-target-badge {
      flex-shrink: 0;
    }

    /* Section label */
    .th-section-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-text-secondary, #94a3b8);
      margin: 16px 0 10px;
    }

    /* Buttons */
    .th-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .th-btn-primary {
      background: var(--color-accent, #6366f1);
      color: #fff;
    }
    .th-btn-secondary {
      background: var(--color-bg-primary, #0a0e1a);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
    }
  `;
  document.head.appendChild(style);

  // --- Health Scoring Engine ---

  function calculateHealthScore(params) {
    const {
      completionRate = 0,    // 0-100: percentage of features completed
      errorRate = 0,          // 0-100: percentage of errors
      velocity = 0,           // features per session
      totalFeatures = 0,
      passedFeatures = 0,
      failedFeatures = 0,
      totalErrors = 0,
      totalSessions = 1,
    } = params;

    // Weighted score calculation
    // Completion rate: 50% weight
    const completionScore = completionRate;

    // Error rate: 30% weight (inverted - lower errors = higher score)
    const errorScore = Math.max(0, 100 - (errorRate * 2));

    // Velocity: 20% weight (normalized)
    const velocityScore = Math.min(100, velocity * 20);

    const weightedScore = Math.round(
      (completionScore * 0.5) +
      (errorScore * 0.3) +
      (velocityScore * 0.2)
    );

    const finalScore = Math.max(0, Math.min(100, weightedScore));

    return {
      score: finalScore,
      completionRate: Math.round(completionRate * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      velocity: Math.round(velocity * 10) / 10,
      badge: getBadge(finalScore),
      components: {
        completion: Math.round(completionScore),
        error: Math.round(errorScore),
        velocity: Math.round(velocityScore),
      },
      details: {
        totalFeatures,
        passedFeatures,
        failedFeatures,
        totalErrors,
        totalSessions,
      },
    };
  }

  function getBadge(score) {
    if (score >= 90) return { label: 'Excellent', class: 'th-badge-excellent', color: '#22c55e' };
    if (score >= 75) return { label: 'Good', class: 'th-badge-good', color: '#4ade80' };
    if (score >= 50) return { label: 'Fair', class: 'th-badge-fair', color: '#f59e0b' };
    if (score >= 25) return { label: 'Poor', class: 'th-badge-poor', color: '#ef4444' };
    return { label: 'Critical', class: 'th-badge-critical', color: '#f87171' };
  }

  function calculateCategoryHealth(features) {
    const categories = {};
    features.forEach(f => {
      if (!categories[f.category]) {
        categories[f.category] = { total: 0, passed: 0, errors: 0 };
      }
      categories[f.category].total++;
      if (f.passes) categories[f.category].passed++;
    });

    const results = {};
    for (const [cat, data] of Object.entries(categories)) {
      const rate = data.total > 0 ? (data.passed / data.total) * 100 : 0;
      const errorRate = data.total > 0 ? (data.errors / data.total) * 100 : 0;
      results[cat] = calculateHealthScore({
        completionRate: rate,
        errorRate,
        totalFeatures: data.total,
        passedFeatures: data.passed,
        failedFeatures: data.total - data.passed,
      });
    }
    return results;
  }

  // --- Data Collection ---
  function collectMetrics() {
    let features = [];

    // Try to load feature data
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/feature_list.json', false);
      xhr.send();
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        features = data.features || [];
      }
    } catch(e) {
      // Use demo data if fetch fails
      features = generateDemoFeatures();
    }

    const totalFeatures = features.length;
    const passedFeatures = features.filter(f => f.passes).length;
    const failedFeatures = totalFeatures - passedFeatures;
    const completionRate = totalFeatures > 0 ? (passedFeatures / totalFeatures) * 100 : 0;

    // Estimate error rate from failed features and error log
    const errorRate = totalFeatures > 0 ? (state.errorLog.length / totalFeatures) * 100 : 0;

    // Velocity (features per session - estimate from recent commits)
    const velocity = passedFeatures > 0 ? Math.min(passedFeatures / Math.max(state.targets.length || 1, 1), 10) : 0;

    const overall = calculateHealthScore({
      completionRate,
      errorRate,
      velocity,
      totalFeatures,
      passedFeatures,
      failedFeatures,
      totalErrors: state.errorLog.length,
      totalSessions: Math.max(state.targets.length, 1),
    });

    const categoryHealth = calculateCategoryHealth(features);

    state.lastCalculated = new Date().toISOString();
    saveState();

    return { overall, categories: categoryHealth, features };
  }

  function generateDemoFeatures() {
    const categories = ['core', 'ui', 'notifications', 'prd', 'targets', 'analytics'];
    const features = [];
    for (let i = 1; i <= 20; i++) {
      features.push({
        id: `demo-${i.toString().padStart(3, '0')}`,
        category: categories[i % categories.length],
        description: `Demo feature ${i}`,
        passes: i <= 12,
      });
    }
    return features;
  }

  function logError(message) {
    state.errorLog.push({
      message,
      timestamp: new Date().toISOString(),
    });
    if (state.errorLog.length > 100) state.errorLog.length = 100;
    saveState();
  }

  // --- Rendering ---
  function renderBadge(badge) {
    return `<span class="th-badge ${badge.class}">
      <span class="th-badge-dot" style="background:${badge.color}"></span>
      ${badge.label}
    </span>`;
  }

  function render() {
    const container = document.getElementById('target-health-widget');
    if (!container) return;

    const metrics = collectMetrics();
    const { overall, categories } = metrics;

    const circumference = 2 * Math.PI * 30;
    const dashOffset = circumference - (overall.score / 100) * circumference;

    container.innerHTML = `
      <div id="target-health-card">
        <div class="card-header">
          <h3>🏥 Target Health</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            ${renderBadge(overall.badge)}
            <button class="th-btn th-btn-secondary" onclick="window.targetHealth.refresh()">Refresh</button>
          </div>
        </div>
        <div class="card-body">
          <!-- Overall health -->
          <div class="th-overall">
            <div class="th-overall-score" id="th-overall-score">
              <svg class="th-overall-ring" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="var(--color-border, #2a2f3e)" stroke-width="4"/>
                <circle cx="36" cy="36" r="30" fill="none" stroke="${overall.badge.color}" stroke-width="4"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                  stroke-linecap="round" transform="rotate(-90 36 36)"/>
              </svg>
              <span style="color:${overall.badge.color};">${overall.score}</span>
            </div>
            <div class="th-overall-info">
              <div class="th-overall-label">Overall Health Score</div>
              <div class="th-overall-value" id="th-health-value">${overall.score}/100</div>
              <div class="th-overall-detail">
                Completion: ${overall.completionRate}% | Error Rate: ${overall.errorRate}% | Velocity: ${overall.velocity}
              </div>
            </div>
          </div>

          <!-- Metrics -->
          <div class="th-metrics" id="th-metrics">
            <div class="th-metric-card">
              <div class="th-metric-value">${overall.details.passedFeatures}</div>
              <div class="th-metric-label">Passed</div>
            </div>
            <div class="th-metric-card">
              <div class="th-metric-value">${overall.details.failedFeatures}</div>
              <div class="th-metric-label">Remaining</div>
            </div>
            <div class="th-metric-card">
              <div class="th-metric-value">${overall.completionRate}%</div>
              <div class="th-metric-label">Completion</div>
            </div>
            <div class="th-metric-card">
              <div class="th-metric-value">${overall.errorRate}%</div>
              <div class="th-metric-label">Error Rate</div>
            </div>
          </div>

          <!-- Category breakdown -->
          <div class="th-section-label">Category Health</div>
          <div class="th-targets" id="th-category-list">
            ${Object.entries(categories).map(([cat, health]) => `
              <div class="th-target-row">
                <span class="th-target-name">${cat}</span>
                <div class="th-target-bar">
                  <div class="th-target-fill" style="width:${health.score}%;background:${health.badge.color};"></div>
                </div>
                <span class="th-target-score" style="color:${health.badge.color};">${health.score}</span>
                <span class="th-target-badge">${renderBadge(health.badge)}</span>
              </div>
            `).join('')}
          </div>

          <!-- Component scores -->
          <div class="th-section-label">Score Components</div>
          <div class="th-targets" id="th-components">
            <div class="th-target-row">
              <span class="th-target-name">Completion Rate (50%)</span>
              <div class="th-target-bar">
                <div class="th-target-fill" style="width:${overall.components.completion}%;background:#6366f1;"></div>
              </div>
              <span class="th-target-score" style="color:#6366f1;">${overall.components.completion}</span>
            </div>
            <div class="th-target-row">
              <span class="th-target-name">Error Score (30%)</span>
              <div class="th-target-bar">
                <div class="th-target-fill" style="width:${overall.components.error}%;background:#22c55e;"></div>
              </div>
              <span class="th-target-score" style="color:#22c55e;">${overall.components.error}</span>
            </div>
            <div class="th-target-row">
              <span class="th-target-name">Velocity (20%)</span>
              <div class="th-target-bar">
                <div class="th-target-fill" style="width:${overall.components.velocity}%;background:#f59e0b;"></div>
              </div>
              <span class="th-target-score" style="color:#f59e0b;">${overall.components.velocity}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function refresh() {
    render();
  }

  // --- Public API ---
  window.targetHealth = {
    calculateHealthScore,
    getBadge,
    calculateCategoryHealth,
    collectMetrics,
    logError,
    refresh,
    getState: () => ({ ...state }),
  };

  // --- Init ---
  loadState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
