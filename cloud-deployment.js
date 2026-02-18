// feat-119: One-Click Cloud Deployment
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #cloud-deployment-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .cd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .cd-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .cd-badge { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; }
    .cd-platforms { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .cd-platform { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 10px; padding: 16px; cursor: pointer; transition: all 0.2s; text-align: center; }
    .cd-platform:hover { border-color: var(--color-primary, #6366f1); transform: translateY(-2px); }
    .cd-platform.selected { border-color: var(--color-primary, #6366f1); background: rgba(99,102,241,0.1); }
    .cd-platform-icon { font-size: 26px; margin-bottom: 8px; }
    .cd-platform-name { font-size: 14px; font-weight: 700; color: var(--color-text, #e0e0e0); margin-bottom: 3px; }
    .cd-platform-tagline { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); }
    .cd-platform-free { font-size: 10px; color: #22c55e; font-weight: 600; margin-top: 4px; }
    .cd-config-section { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    .cd-config-title { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); margin-bottom: 12px; }
    .cd-steps { display: flex; flex-direction: column; gap: 8px; }
    .cd-step { display: flex; align-items: flex-start; gap: 10px; }
    .cd-step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--color-primary, #6366f1); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .cd-step-text { font-size: 13px; color: var(--color-text, #e0e0e0); }
    .cd-step-sub { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); margin-top: 2px; }
    .cd-env-form { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
    .cd-env-row { display: flex; gap: 8px; align-items: center; }
    .cd-env-key { font-size: 12px; font-family: monospace; color: var(--color-text, #e0e0e0); min-width: 140px; }
    .cd-env-input { flex: 1; background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 6px; padding: 7px 10px; font-size: 12px; color: var(--color-text, #e0e0e0); outline: none; }
    .cd-env-input:focus { border-color: var(--color-primary, #6366f1); }
    .cd-deploy-btn { width: 100%; border: none; border-radius: 9px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .cd-deploy-btn:hover { opacity: 0.85; }
    .cd-deploy-railway { background: linear-gradient(135deg, #0f0f0f, #2a2a2a); color: #fff; border: 1px solid #333; }
    .cd-deploy-render { background: linear-gradient(135deg, #46e3b7, #1a5f4a); color: #fff; }
    .cd-deploy-vercel { background: #000; color: #fff; }
    .cd-deploy-fly { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; }
    .cd-deploy-heroku { background: #79589f; color: #fff; }
    .cd-deploy-default { background: var(--color-primary, #6366f1); color: #fff; }
    .cd-recent { display: flex; flex-direction: column; gap: 8px; }
    .cd-recent-item { display: flex; justify-content: space-between; align-items: center; background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px 14px; }
    .cd-recent-name { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .cd-recent-meta { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); margin-top: 2px; }
    .cd-recent-status { font-size: 11px; padding: 3px 9px; border-radius: 4px; font-weight: 600; }
    .cd-recent-status.live { background: rgba(34,197,94,0.15); color: #22c55e; }
    .cd-recent-status.building { background: rgba(234,179,8,0.15); color: #eab308; }
    .cd-recent-status.failed { background: rgba(239,68,68,0.15); color: #ef4444; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'cloud-deployment-config';

  const PLATFORMS = [
    { id: 'railway', icon: '🚂', name: 'Railway', tagline: 'Deploy in seconds', free: true, deployUrl: 'https://railway.app/new', steps: ['Connect GitHub repo', 'Set env variables', 'Deploy automatically'] },
    { id: 'render', icon: '🟢', name: 'Render', tagline: 'Cloud for modern apps', free: true, deployUrl: 'https://render.com', steps: ['Create new Web Service', 'Connect GitHub repo', 'Configure build & start commands'] },
    { id: 'vercel', icon: '▲', name: 'Vercel', tagline: 'Frontend + serverless', free: true, deployUrl: 'https://vercel.com/new', steps: ['Import Git repository', 'Configure project settings', 'Deploy with one click'] },
    { id: 'fly', icon: '✈️', name: 'Fly.io', tagline: 'Run full-stack apps', free: true, deployUrl: 'https://fly.io', steps: ['Install flyctl CLI', 'Run fly launch', 'Set secrets & deploy'] },
    { id: 'heroku', icon: '🟣', name: 'Heroku', tagline: 'Platform as a service', free: false, deployUrl: 'https://heroku.com', steps: ['Create Heroku app', 'Connect to GitHub', 'Enable auto-deploys'] },
  ];

  const RECENT_DEPLOYMENTS = [
    { platform: 'Railway', url: 'acd-prod.railway.app', date: '2026-02-10', status: 'live' },
    { platform: 'Render', url: 'acd-staging.onrender.com', date: '2026-01-28', status: 'live' },
    { platform: 'Vercel', url: 'acd-preview.vercel.app', date: '2026-01-15', status: 'building' },
  ];

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  let state = loadState();
  let selectedPlatform = state.selectedPlatform || null;

  function selectPlatform(id) {
    selectedPlatform = id;
    state.selectedPlatform = id;
    saveState(state);
    renderCard();
  }

  function deployToPlatform(id) {
    const platform = PLATFORMS.find(p => p.id === id);
    if (!platform) return;
    state['deployed_' + id] = new Date().toISOString();
    saveState(state);
    window.open(platform.deployUrl, '_blank');
  }

  function renderCard() {
    const card = document.getElementById('cloud-deployment-card');
    if (!card) return;

    const platform = PLATFORMS.find(p => p.id === selectedPlatform);
    const deployBtnClass = selectedPlatform ? `cd-deploy-${selectedPlatform}` : 'cd-deploy-default';

    const configSection = platform ? `
      <div class="cd-config-section">
        <div class="cd-config-title">Deploy to ${platform.name}</div>
        <div class="cd-steps">
          ${platform.steps.map((s, i) => `<div class="cd-step"><div class="cd-step-num">${i+1}</div><div><div class="cd-step-text">${s}</div></div></div>`).join('')}
        </div>
        <div class="cd-env-form">
          <div style="font-size:12px;font-weight:600;color:var(--color-text-secondary,#a0a0b0);margin-bottom:4px">Environment Variables</div>
          <div class="cd-env-row"><span class="cd-env-key">ANTHROPIC_API_KEY</span><input class="cd-env-input" type="password" placeholder="sk-ant-..."></div>
          <div class="cd-env-row"><span class="cd-env-key">DATABASE_URL</span><input class="cd-env-input" placeholder="postgresql://..."></div>
          <div class="cd-env-row"><span class="cd-env-key">NODE_ENV</span><input class="cd-env-input" value="production"></div>
        </div>
      </div>
      <button class="cd-deploy-btn ${deployBtnClass}" onclick="window.cloudDeployment.deploy('${selectedPlatform}')">
        ${platform.icon} Deploy to ${platform.name}
      </button>` : `
      <div style="background:var(--color-bg,#12121a);border:1px solid var(--color-border,#2e2e3e);border-radius:8px;padding:16px;text-align:center;color:var(--color-text-secondary,#a0a0b0);font-size:13px">
        Select a platform above to configure deployment
      </div>`;

    const recentHtml = RECENT_DEPLOYMENTS.map(d => `
      <div class="cd-recent-item">
        <div>
          <div class="cd-recent-name">${d.platform}</div>
          <div class="cd-recent-meta">${d.url} · ${d.date}</div>
        </div>
        <span class="cd-recent-status ${d.status}">${d.status}</span>
      </div>`).join('');

    card.innerHTML = `
      <div class="cd-header">
        <h3>☁️ Cloud Deployment</h3>
        <span class="cd-badge">One-Click Deploy</span>
      </div>
      <div class="cd-platforms">
        ${PLATFORMS.map(p => `
          <div class="cd-platform ${selectedPlatform === p.id ? 'selected' : ''}" onclick="window.cloudDeployment.selectPlatform('${p.id}')">
            <div class="cd-platform-icon">${p.icon}</div>
            <div class="cd-platform-name">${p.name}</div>
            <div class="cd-platform-tagline">${p.tagline}</div>
            ${p.free ? '<div class="cd-platform-free">Free tier available</div>' : ''}
          </div>`).join('')}
      </div>
      ${configSection}
      <div style="margin-top:16px">
        <div style="font-size:12px;font-weight:600;color:var(--color-text-secondary,#a0a0b0);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Recent Deployments</div>
        <div class="cd-recent">${recentHtml}</div>
      </div>`;
  }

  function init() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'cloud-deployment-card';
    main.insertBefore(card, main.firstChild);
    renderCard();
  }

  window.cloudDeployment = {
    selectPlatform,
    deploy: deployToPlatform,
    getPlatforms: () => [...PLATFORMS],
    getPlatform: (id) => PLATFORMS.find(p => p.id === id) || null,
    getRecentDeployments: () => [...RECENT_DEPLOYMENTS],
    getState: () => ({ selectedPlatform, platforms: PLATFORMS.length, deployedCount: RECENT_DEPLOYMENTS.length }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
