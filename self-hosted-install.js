// feat-120: Self-Hosted Installation Script
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #self-hosted-install-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .shi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .shi-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .shi-badge { background: #22c55e; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
    .shi-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .shi-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .shi-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .shi-prereqs { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    .shi-prereq { display: flex; align-items: center; gap: 12px; background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px 14px; }
    .shi-prereq-icon { font-size: 18px; flex-shrink: 0; }
    .shi-prereq-body { flex: 1; }
    .shi-prereq-name { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .shi-prereq-ver { font-size: 11px; color: var(--color-text-secondary, #a0a0b0); margin-top: 2px; }
    .shi-prereq-status { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .shi-prereq-status.ok { background: rgba(34,197,94,0.15); color: #22c55e; }
    .shi-prereq-status.missing { background: rgba(239,68,68,0.15); color: #ef4444; }
    .shi-prereq-status.optional { background: rgba(99,102,241,0.15); color: var(--color-primary, #6366f1); }
    .shi-code { background: #0d1117; border: 1px solid var(--color-border, #2e2e3e); border-radius: 9px; padding: 14px 16px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre; color: #e0e0e0; line-height: 1.7; position: relative; margin-bottom: 10px; }
    .shi-copy-btn { position: absolute; top: 8px; right: 8px; background: var(--color-border, #2e2e3e); border: none; border-radius: 5px; padding: 4px 10px; font-size: 11px; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; transition: background 0.2s; }
    .shi-copy-btn:hover { background: var(--color-primary, #6366f1); color: #fff; }
    .shi-steps { display: flex; flex-direction: column; gap: 12px; }
    .shi-step { display: flex; gap: 14px; }
    .shi-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--color-primary, #6366f1); color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .shi-step-body { flex: 1; padding-top: 4px; }
    .shi-step-title { font-size: 13px; font-weight: 600; color: var(--color-text, #e0e0e0); margin-bottom: 4px; }
    .shi-step-desc { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-bottom: 6px; }
    .shi-step-cmd { background: #0d1117; border: 1px solid var(--color-border, #2e2e3e); border-radius: 6px; padding: 8px 12px; font-family: monospace; font-size: 12px; color: #22c55e; }
    .shi-wizard { display: flex; flex-direction: column; gap: 12px; }
    .shi-wizard-row { display: flex; flex-direction: column; gap: 4px; }
    .shi-wizard-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary, #a0a0b0); }
    .shi-wizard-input { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 7px; padding: 9px 12px; font-size: 13px; color: var(--color-text, #e0e0e0); outline: none; }
    .shi-wizard-input:focus { border-color: var(--color-primary, #6366f1); }
    .shi-btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .shi-btn { border: none; border-radius: 7px; font-size: 13px; font-weight: 600; padding: 9px 18px; cursor: pointer; transition: opacity 0.2s; }
    .shi-btn-primary { background: #22c55e; color: #fff; }
    .shi-btn-secondary { background: var(--color-border, #2e2e3e); color: var(--color-text, #e0e0e0); }
    .shi-btn:hover { opacity: 0.8; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'self-hosted-install-config';

  const PREREQS = [
    { id: 'node', icon: '🟢', name: 'Node.js', ver: 'v18+ required', status: 'ok' },
    { id: 'npm', icon: '📦', name: 'npm / pnpm', ver: 'v8+ required', status: 'ok' },
    { id: 'git', icon: '🐙', name: 'Git', ver: 'any version', status: 'ok' },
    { id: 'postgres', icon: '🐘', name: 'PostgreSQL', ver: 'v14+ required', status: 'ok' },
    { id: 'docker', icon: '🐳', name: 'Docker', ver: 'optional, for containerized setup', status: 'optional' },
    { id: 'redis', icon: '🔴', name: 'Redis', ver: 'optional, for job queue', status: 'optional' },
  ];

  const INSTALL_SCRIPT = `#!/bin/bash
# Autonomous Coding Dashboard - Self-Hosted Installer
# Usage: bash install.sh

set -e
echo "🤖 ACD Self-Hosted Installer"
echo "============================="

# Check dependencies
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git required"; exit 1; }
echo "✅ Dependencies OK"

# Clone repo
git clone https://github.com/your-org/autonomous-coding-dashboard.git acd
cd acd

# Install dependencies
npm install
cd backend && npm install && cd ..

# Setup environment
cp .env.example .env
echo ""
echo "⚙️  Configuration wizard:"
read -p "Anthropic API Key: " ANTHROPIC_KEY
read -p "Database URL [postgresql://localhost/acd]: " DB_URL
DB_URL=\${DB_URL:-postgresql://localhost/acd}

sed -i "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=\$ANTHROPIC_KEY|" .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=\$DB_URL|" .env

# Setup database
cd backend
npx prisma migrate deploy
npx prisma generate
cd ..

# Start services
echo ""
echo "✅ Installation complete!"
echo "   Run: node simple-backend.js &"
echo "   Then open: http://localhost:3000"
`;

  const MANUAL_STEPS = [
    { title: 'Clone the repository', desc: 'Download the source code from GitHub.', cmd: 'git clone https://github.com/your-org/acd.git && cd acd' },
    { title: 'Install dependencies', desc: 'Install Node.js packages for frontend and backend.', cmd: 'npm install && cd backend && npm install && cd ..' },
    { title: 'Configure environment', desc: 'Copy the example env file and fill in your values.', cmd: 'cp .env.example .env && nano .env' },
    { title: 'Setup database', desc: 'Run Prisma migrations to create the database schema.', cmd: 'cd backend && npx prisma migrate deploy && npx prisma generate' },
    { title: 'Start the server', desc: 'Launch the backend API and serve the frontend.', cmd: 'node simple-backend.js' },
    { title: 'Open the dashboard', desc: 'Navigate to the dashboard in your browser.', cmd: 'open http://localhost:3000' },
  ];

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  let state = loadState();
  let activeTab = 'prereqs';

  function setTab(tab) { activeTab = tab; renderCard(); }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('Copied!')).catch(() => alert('Copy failed'));
  }

  function downloadInstallScript() {
    const blob = new Blob([INSTALL_SCRIPT], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'install.sh'; a.click();
    URL.revokeObjectURL(url);
  }

  function generateCustomScript() {
    const port = document.getElementById('shi-port')?.value || '3000';
    const dbUrl = document.getElementById('shi-db')?.value || 'postgresql://localhost/acd';
    const custom = INSTALL_SCRIPT.replace('postgresql://localhost/acd', dbUrl).replace('http://localhost:3000', `http://localhost:${port}`);
    copyToClipboard(custom);
    alert('Custom install script copied to clipboard!');
  }

  function renderCard() {
    const card = document.getElementById('self-hosted-install-card');
    if (!card) return;

    let content = '';
    if (activeTab === 'prereqs') {
      const prereqHtml = PREREQS.map(p => `
        <div class="shi-prereq">
          <div class="shi-prereq-icon">${p.icon}</div>
          <div class="shi-prereq-body">
            <div class="shi-prereq-name">${p.name}</div>
            <div class="shi-prereq-ver">${p.ver}</div>
          </div>
          <span class="shi-prereq-status ${p.status}">${p.status === 'ok' ? '✓ OK' : p.status === 'optional' ? 'Optional' : '✗ Missing'}</span>
        </div>`).join('');
      content = `<div class="shi-prereqs">${prereqHtml}</div>
        <div class="shi-btn-row">
          <button class="shi-btn shi-btn-primary" onclick="window.selfHostedInstall.setTab('script')">View Install Script →</button>
        </div>`;
    } else if (activeTab === 'script') {
      content = `<div class="shi-code" style="position:relative;max-height:300px;overflow-y:auto">${INSTALL_SCRIPT.replace(/</g, '&lt;').replace(/>/g, '&gt;')}<button class="shi-copy-btn" onclick="window.selfHostedInstall.copyToClipboard(window.selfHostedInstall.getScript())">Copy</button></div>
        <div class="shi-btn-row">
          <button class="shi-btn shi-btn-primary" onclick="window.selfHostedInstall.downloadScript()">⬇ Download install.sh</button>
          <button class="shi-btn shi-btn-secondary" onclick="window.selfHostedInstall.setTab('manual')">Manual Steps →</button>
        </div>`;
    } else if (activeTab === 'manual') {
      const stepsHtml = MANUAL_STEPS.map((s, i) => `
        <div class="shi-step">
          <div class="shi-step-num">${i + 1}</div>
          <div class="shi-step-body">
            <div class="shi-step-title">${s.title}</div>
            <div class="shi-step-desc">${s.desc}</div>
            <div class="shi-step-cmd">$ ${s.cmd}</div>
          </div>
        </div>`).join('');
      content = `<div class="shi-steps">${stepsHtml}</div>`;
    } else {
      content = `<div class="shi-wizard">
        <div class="shi-wizard-row"><div class="shi-wizard-label">Dashboard Port</div><input class="shi-wizard-input" id="shi-port" value="3000" placeholder="3000"></div>
        <div class="shi-wizard-row"><div class="shi-wizard-label">Database URL</div><input class="shi-wizard-input" id="shi-db" value="postgresql://localhost/acd" placeholder="postgresql://user:pass@host/db"></div>
        <div class="shi-wizard-row"><div class="shi-wizard-label">API Port</div><input class="shi-wizard-input" id="shi-api-port" value="3001" placeholder="3001"></div>
        <div class="shi-btn-row">
          <button class="shi-btn shi-btn-primary" onclick="window.selfHostedInstall.generateCustomScript()">Generate Custom Script</button>
        </div>
      </div>`;
    }

    card.innerHTML = `
      <div class="shi-header">
        <h3>🖥️ Self-Hosted Installation</h3>
        <span class="shi-badge">Bash Installer</span>
      </div>
      <div class="shi-tabs">
        <button class="shi-tab ${activeTab === 'prereqs' ? 'active' : ''}" onclick="window.selfHostedInstall.setTab('prereqs')">Prerequisites</button>
        <button class="shi-tab ${activeTab === 'script' ? 'active' : ''}" onclick="window.selfHostedInstall.setTab('script')">Script</button>
        <button class="shi-tab ${activeTab === 'manual' ? 'active' : ''}" onclick="window.selfHostedInstall.setTab('manual')">Manual</button>
        <button class="shi-tab ${activeTab === 'wizard' ? 'active' : ''}" onclick="window.selfHostedInstall.setTab('wizard')">Wizard</button>
      </div>
      ${content}`;
  }

  function init() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'self-hosted-install-card';
    main.insertBefore(card, main.firstChild);
    renderCard();
  }

  window.selfHostedInstall = {
    setTab,
    copyToClipboard,
    downloadScript: downloadInstallScript,
    generateCustomScript,
    getScript: () => INSTALL_SCRIPT,
    getPrereqs: () => [...PREREQS],
    getPrereq: (id) => PREREQS.find(p => p.id === id) || null,
    getManualSteps: () => [...MANUAL_STEPS],
    getState: () => ({ prereqCount: PREREQS.length, okCount: PREREQS.filter(p => p.status === 'ok').length, stepCount: MANUAL_STEPS.length }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
