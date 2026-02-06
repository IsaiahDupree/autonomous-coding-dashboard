// feat-074: Automatic Commit Message Generation
(function () {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #commit-generator-card {
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .cg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .cg-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text, #e0e0e0);
    }
    .cg-form {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .cg-form-row {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
      align-items: center;
    }
    .cg-form-label {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      min-width: 90px;
    }
    .cg-form-input, .cg-form-select, .cg-form-textarea {
      flex: 1;
      background: var(--color-card-bg, #1e1e2e);
      border: 1px solid var(--color-border, #2e2e3e);
      color: var(--color-text, #e0e0e0);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      font-family: inherit;
    }
    .cg-form-textarea {
      resize: vertical;
      min-height: 60px;
    }
    .cg-generate-btn {
      padding: 8px 20px;
      background: var(--color-primary, #6366f1);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .cg-generate-btn:hover { opacity: 0.9; }

    /* Result */
    .cg-result {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .cg-result-title {
      font-size: 12px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-bottom: 8px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .cg-result-message {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--color-text, #e0e0e0);
      line-height: 1.6;
      white-space: pre-wrap;
      background: rgba(0,0,0,0.2);
      padding: 12px;
      border-radius: 6px;
    }
    .cg-result-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    .cg-copy-btn {
      padding: 4px 12px;
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--color-border, #2e2e3e);
      color: var(--color-text-secondary, #a0a0b0);
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }

    /* History */
    .cg-history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }
    .cg-history-item {
      background: var(--color-bg, #12121a);
      border: 1px solid var(--color-border, #2e2e3e);
      border-radius: 8px;
      padding: 10px 14px;
    }
    .cg-history-msg {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--color-text, #e0e0e0);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cg-history-meta {
      font-size: 11px;
      color: var(--color-text-secondary, #a0a0b0);
      margin-top: 4px;
    }
    .cg-type-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
    }
    .cg-type-badge.feat { background: rgba(34,197,94,0.15); color: #22c55e; }
    .cg-type-badge.fix { background: rgba(239,68,68,0.15); color: #ef4444; }
    .cg-type-badge.refactor { background: rgba(99,102,241,0.15); color: #6366f1; }
    .cg-type-badge.docs { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .cg-type-badge.test { background: rgba(6,182,212,0.15); color: #06b6d4; }
    .cg-type-badge.chore { background: rgba(255,255,255,0.08); color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  // ── State ────────────────────────────────────────────────────
  const STORAGE_KEY = 'commit-generator-config';
  let state = {
    history: [],
    lastGenerated: null,
  };

  // ── Conventional commit types ────────────────────────────────
  const COMMIT_TYPES = [
    { value: 'feat', label: 'feat - New feature', description: 'A new feature' },
    { value: 'fix', label: 'fix - Bug fix', description: 'A bug fix' },
    { value: 'refactor', label: 'refactor - Code change', description: 'Neither fixes a bug nor adds a feature' },
    { value: 'docs', label: 'docs - Documentation', description: 'Documentation changes' },
    { value: 'test', label: 'test - Tests', description: 'Adding or fixing tests' },
    { value: 'chore', label: 'chore - Maintenance', description: 'Other changes' },
    { value: 'style', label: 'style - Formatting', description: 'Code style changes' },
    { value: 'perf', label: 'perf - Performance', description: 'Performance improvement' },
    { value: 'ci', label: 'ci - CI/CD', description: 'CI/CD configuration changes' },
  ];

  // ── Generation logic ─────────────────────────────────────────
  function generateCommitMessage(options) {
    const opts = options || {};
    const type = opts.type || 'feat';
    const featureId = opts.featureId || '';
    const scope = opts.scope || '';
    const description = opts.description || '';
    const body = opts.body || '';
    const breaking = opts.breaking || false;

    // Build the conventional commit message
    let subject = type;
    if (scope) subject += `(${scope})`;
    if (breaking) subject += '!';
    subject += ': ';

    // Generate subject line
    if (description) {
      subject += description;
    } else {
      subject += generateSubjectFromFeatureId(featureId, type);
    }

    // Include feature ID reference
    let message = subject;
    if (featureId || body) {
      message += '\n';
      if (body) message += '\n' + body;
      if (featureId) message += '\n\nRefs: ' + featureId;
    }

    const result = {
      message,
      subject,
      type,
      scope,
      featureId,
      isConventional: true,
      hasFeatureId: featureId.length > 0,
      hasBody: body.length > 0,
      isBreaking: breaking,
      generatedAt: new Date().toISOString(),
    };

    state.lastGenerated = result;
    state.history.unshift({
      message: result.message,
      subject: result.subject,
      type,
      featureId,
      timestamp: result.generatedAt,
    });

    if (state.history.length > 50) state.history = state.history.slice(0, 50);
    saveState();
    render();

    return result;
  }

  function generateSubjectFromFeatureId(featureId, type) {
    if (!featureId) return 'update codebase';
    const actionMap = {
      feat: 'implement',
      fix: 'fix issue in',
      refactor: 'refactor',
      docs: 'document',
      test: 'add tests for',
      chore: 'maintain',
      style: 'format',
      perf: 'optimize',
      ci: 'update CI for',
    };
    const action = actionMap[type] || 'update';
    return `${action} ${featureId}`;
  }

  function generateFromDiff(diff) {
    const d = diff || {};
    const filesChanged = d.filesChanged || [];
    const additions = d.additions || 0;
    const deletions = d.deletions || 0;

    let type = 'feat';
    if (filesChanged.some(f => f.endsWith('.test.js') || f.endsWith('.spec.js'))) type = 'test';
    else if (filesChanged.some(f => f.endsWith('.md'))) type = 'docs';
    else if (deletions > additions * 2) type = 'refactor';
    else if (filesChanged.length === 1 && additions < 10) type = 'fix';

    const scope = detectScope(filesChanged);
    const description = generateDescFromFiles(filesChanged, type, additions, deletions);

    return generateCommitMessage({
      type,
      scope,
      description,
      featureId: d.featureId || '',
      body: `${filesChanged.length} file(s) changed, ${additions} insertions(+), ${deletions} deletions(-)`,
    });
  }

  function detectScope(files) {
    if (files.length === 0) return '';
    if (files.every(f => f.startsWith('test'))) return 'tests';
    if (files.every(f => f.startsWith('docs'))) return 'docs';
    if (files.every(f => f.endsWith('.css'))) return 'styles';
    if (files.some(f => f.includes('api'))) return 'api';
    return '';
  }

  function generateDescFromFiles(files, type, additions, deletions) {
    if (files.length === 0) return 'update codebase';
    if (files.length === 1) {
      const file = files[0].split('/').pop().replace(/\.[^.]+$/, '');
      const actions = { feat: 'add', fix: 'fix', refactor: 'refactor', docs: 'document', test: 'test' };
      return `${actions[type] || 'update'} ${file}`;
    }
    return `update ${files.length} files (+${additions}/-${deletions})`;
  }

  function getHistory() {
    return state.history;
  }

  function getLastGenerated() {
    return state.lastGenerated;
  }

  function getCommitTypes() {
    return COMMIT_TYPES;
  }

  function validateMessage(message) {
    const errors = [];
    if (!message || message.length === 0) {
      errors.push('Message cannot be empty');
      return { valid: false, errors };
    }

    const lines = message.split('\n');
    const subject = lines[0];

    // Check conventional format
    const conventionalPattern = /^(feat|fix|refactor|docs|test|chore|style|perf|ci)(\(.+\))?!?:\s.+/;
    if (!conventionalPattern.test(subject)) {
      errors.push('Subject must follow conventional commit format: type(scope): description');
    }

    if (subject.length > 72) {
      errors.push('Subject line should be <= 72 characters');
    }

    if (subject.endsWith('.')) {
      errors.push('Subject should not end with a period');
    }

    return { valid: errors.length === 0, errors, subjectLength: subject.length };
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('commit-generator-widget');
    if (!container) return;

    container.innerHTML = `
      <div id="commit-generator-card">
        <div class="cg-header">
          <h3>Commit Message Generator</h3>
        </div>

        <div class="cg-form" id="cg-form">
          <div class="cg-form-row">
            <span class="cg-form-label">Type</span>
            <select class="cg-form-select" id="cg-type">
              ${COMMIT_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="cg-form-row">
            <span class="cg-form-label">Feature ID</span>
            <input class="cg-form-input" id="cg-feature-id" placeholder="e.g. feat-074" value="">
          </div>
          <div class="cg-form-row">
            <span class="cg-form-label">Scope</span>
            <input class="cg-form-input" id="cg-scope" placeholder="e.g. api, ui (optional)" value="">
          </div>
          <div class="cg-form-row">
            <span class="cg-form-label">Description</span>
            <input class="cg-form-input" id="cg-description" placeholder="Short description" value="">
          </div>
          <div class="cg-form-row">
            <span class="cg-form-label">Body</span>
            <textarea class="cg-form-textarea" id="cg-body" placeholder="Detailed description (optional)"></textarea>
          </div>
          <button class="cg-generate-btn" id="cg-generate">Generate Message</button>
        </div>

        ${state.lastGenerated ? `
        <div class="cg-result" id="cg-result">
          <div class="cg-result-title">Generated Message</div>
          <div class="cg-result-message" id="cg-result-message">${escapeHtml(state.lastGenerated.message)}</div>
          <div class="cg-result-actions">
            <button class="cg-copy-btn" id="cg-copy">Copy to Clipboard</button>
            <span class="cg-type-badge ${state.lastGenerated.type}">${state.lastGenerated.type}</span>
            ${state.lastGenerated.hasFeatureId ? '<span style="font-size:11px;color:var(--color-text-secondary,#a0a0b0)">Feature ID included</span>' : ''}
          </div>
        </div>
        ` : ''}

        ${state.history.length > 0 ? `
        <div style="font-size:13px;font-weight:600;color:var(--color-text,#e0e0e0);margin-bottom:8px;">Recent Messages</div>
        <div class="cg-history-list" id="cg-history-list">
          ${state.history.slice(0, 10).map(h => `
            <div class="cg-history-item">
              <div class="cg-history-msg">${escapeHtml(h.subject || h.message.split('\\n')[0])}</div>
              <div class="cg-history-meta">
                <span class="cg-type-badge ${h.type}">${h.type}</span>
                ${h.featureId ? h.featureId + ' &middot; ' : ''}${new Date(h.timestamp).toLocaleString()}
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    `;

    document.getElementById('cg-generate').addEventListener('click', () => {
      const type = document.getElementById('cg-type').value;
      const featureId = document.getElementById('cg-feature-id').value;
      const scope = document.getElementById('cg-scope').value;
      const description = document.getElementById('cg-description').value;
      const body = document.getElementById('cg-body').value;
      generateCommitMessage({ type, featureId, scope, description, body });
    });

    const copyBtn = document.getElementById('cg-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (state.lastGenerated) {
          navigator.clipboard.writeText(state.lastGenerated.message).catch(() => {});
        }
      });
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Persistence ──────────────────────────────────────────────
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        history: state.history.slice(0, 50),
      }));
    } catch (e) { /* ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.history = parsed.history || [];
      }
    } catch (e) { /* ignore */ }
  }

  // ── Public API ───────────────────────────────────────────────
  window.commitGenerator = {
    generateCommitMessage,
    generateFromDiff,
    getHistory,
    getLastGenerated,
    getCommitTypes,
    validateMessage,
    getState() {
      return {
        historyCount: state.history.length,
        lastGenerated: state.lastGenerated,
      };
    },
  };

  // ── Init ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    render();
  });
})();
