// feat-111: Onboarding Wizard for New Users
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #onboarding-wizard-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .ow-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .ow-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .ow-badge { background: var(--color-primary, #6366f1); color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
    .ow-progress-bar { background: var(--color-bg, #12121a); border-radius: 99px; height: 8px; margin-bottom: 20px; overflow: hidden; }
    .ow-progress-fill { height: 100%; border-radius: 99px; background: var(--color-primary, #6366f1); transition: width 0.4s ease; }
    .ow-steps { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .ow-step { display: flex; align-items: flex-start; gap: 14px; background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 10px; padding: 14px; transition: border-color 0.2s; }
    .ow-step.active { border-color: var(--color-primary, #6366f1); }
    .ow-step.done { border-color: #22c55e; }
    .ow-step-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; background: var(--color-border, #2e2e3e); }
    .ow-step.active .ow-step-icon { background: var(--color-primary, #6366f1); }
    .ow-step.done .ow-step-icon { background: #22c55e; }
    .ow-step-body { flex: 1; }
    .ow-step-title { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); margin-bottom: 2px; }
    .ow-step-desc { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .ow-step-skip { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; text-decoration: underline; margin-top: 4px; display: inline-block; }
    .ow-actions { display: flex; gap: 10px; align-items: center; }
    .ow-btn { padding: 8px 18px; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .ow-btn-primary { background: var(--color-primary, #6366f1); color: #fff; }
    .ow-btn-secondary { background: var(--color-border, #2e2e3e); color: var(--color-text, #e0e0e0); }
    .ow-btn:hover { opacity: 0.85; }
    .ow-complete-msg { text-align: center; padding: 20px 0; }
    .ow-complete-icon { font-size: 40px; margin-bottom: 10px; }
    .ow-complete-title { font-size: 18px; font-weight: 700; color: var(--color-text, #e0e0e0); margin-bottom: 6px; }
    .ow-complete-sub { font-size: 13px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'onboarding-wizard-config';

  const STEPS = [
    { id: 'step-connect', icon: '🔗', title: 'Connect Your Project', desc: 'Add your first project to start tracking autonomous agent sessions.', key: 'connected' },
    { id: 'step-features', icon: '✅', title: 'Review Feature List', desc: 'Browse the feature list to see what needs to be built and prioritize your work.', key: 'features' },
    { id: 'step-harness', icon: '🤖', title: 'Start the Harness', desc: 'Launch the coding agent harness to begin automated feature implementation.', key: 'harness' },
    { id: 'step-monitor', icon: '📊', title: 'Monitor Progress', desc: 'Watch real-time progress on the dashboard as the agent works through features.', key: 'monitor' },
    { id: 'step-settings', icon: '⚙️', title: 'Configure Settings', desc: 'Customize API keys, notification preferences, and agent parameters.', key: 'settings' },
  ];

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  let state = loadState();

  function getCompletedCount() {
    return STEPS.filter(s => state[s.key]).length;
  }

  function completeStep(key) {
    state[key] = true;
    saveState(state);
    render();
  }

  function skipStep(key) {
    state['skip_' + key] = true;
    saveState(state);
    render();
  }

  function resetWizard() {
    state = {};
    saveState(state);
    render();
  }

  function isStepVisible(step) {
    return !state[step.key] && !state['skip_' + step.key];
  }

  function render() {
    const card = document.getElementById('onboarding-wizard-card');
    if (!card) return;
    const completed = getCompletedCount();
    const total = STEPS.length;
    const pct = Math.round((completed / total) * 100);
    const allDone = STEPS.every(s => state[s.key] || state['skip_' + s.key]);

    if (allDone) {
      card.innerHTML = `
        <div class="ow-header">
          <h3>🧭 Onboarding Wizard</h3>
          <span class="ow-badge">Complete</span>
        </div>
        <div class="ow-complete-msg">
          <div class="ow-complete-icon">🎉</div>
          <div class="ow-complete-title">You're all set!</div>
          <div class="ow-complete-sub">You've completed the onboarding. The dashboard is ready to use.</div>
          <div style="margin-top:16px">
            <button class="ow-btn ow-btn-secondary" onclick="window.onboardingWizard.reset()">Restart Wizard</button>
          </div>
        </div>`;
      return;
    }

    const stepsHtml = STEPS.map(step => {
      const done = !!state[step.key];
      const skipped = !!state['skip_' + step.key];
      const cls = done ? 'done' : (!skipped && isStepVisible(step) ? 'active' : '');
      const iconInner = done ? '✓' : (skipped ? '—' : step.icon);
      return `
        <div class="ow-step ${cls}" id="${step.id}">
          <div class="ow-step-icon">${iconInner}</div>
          <div class="ow-step-body">
            <div class="ow-step-title">${step.title}</div>
            <div class="ow-step-desc">${step.desc}</div>
            ${!done && !skipped ? `<span class="ow-step-skip" onclick="window.onboardingWizard.skipStep('${step.key}')">Skip this step</span>` : ''}
          </div>
          ${!done && !skipped ? `<button class="ow-btn ow-btn-primary" onclick="window.onboardingWizard.completeStep('${step.key}')">Mark Done</button>` : ''}
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="ow-header">
        <h3>🧭 Onboarding Wizard</h3>
        <span class="ow-badge">${completed}/${total} Complete</span>
      </div>
      <div class="ow-progress-bar"><div class="ow-progress-fill" id="ow-fill" style="width:${pct}%"></div></div>
      <div class="ow-steps">${stepsHtml}</div>
      <div class="ow-actions">
        <button class="ow-btn ow-btn-secondary" onclick="window.onboardingWizard.reset()">Reset</button>
        <span style="font-size:12px;color:var(--color-text-secondary,#a0a0b0)">${pct}% complete</span>
      </div>`;
  }

  function init() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'onboarding-wizard-card';
    main.insertBefore(card, main.firstChild);
    render();
  }

  window.onboardingWizard = {
    completeStep,
    skipStep,
    reset: resetWizard,
    getState: () => ({ ...state }),
    getSteps: () => STEPS.map(s => ({ ...s, done: !!state[s.key], skipped: !!state['skip_' + s.key] })),
    getProgress: () => ({ completed: getCompletedCount(), total: STEPS.length, pct: Math.round((getCompletedCount() / STEPS.length) * 100) }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
