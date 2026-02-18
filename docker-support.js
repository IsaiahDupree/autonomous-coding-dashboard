// feat-118: Docker Deployment Support
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #docker-support-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .ds-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .ds-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .ds-badge { background: #0db7ed; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
    .ds-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .ds-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .ds-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .ds-services { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
    .ds-service { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 9px; padding: 14px; }
    .ds-service-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .ds-service-name { font-size: 14px; font-weight: 600; color: var(--color-text, #e0e0e0); display: flex; align-items: center; gap: 8px; }
    .ds-service-icon { font-size: 16px; }
    .ds-status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; }
    .ds-status-dot.up { background: #22c55e; }
    .ds-status-dot.down { background: #ef4444; }
    .ds-status-dot.unknown { background: #6b7280; }
    .ds-service-meta { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
    .ds-service-ports { font-size: 11px; font-family: monospace; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .ds-code-block { background: #0d1117; border: 1px solid var(--color-border, #2e2e3e); border-radius: 9px; padding: 14px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre; color: #e0e0e0; line-height: 1.6; position: relative; }
    .ds-copy-btn { position: absolute; top: 8px; right: 8px; background: var(--color-border, #2e2e3e); border: none; border-radius: 5px; padding: 4px 10px; font-size: 11px; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; transition: background 0.2s; }
    .ds-copy-btn:hover { background: var(--color-primary, #6366f1); color: #fff; }
    .ds-env-list { display: flex; flex-direction: column; gap: 6px; }
    .ds-env-item { display: flex; gap: 10px; align-items: center; background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 7px; padding: 8px 12px; }
    .ds-env-key { font-size: 12px; font-weight: 600; color: var(--color-text, #e0e0e0); font-family: monospace; min-width: 160px; }
    .ds-env-val { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); font-family: monospace; flex: 1; }
    .ds-env-req { font-size: 10px; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; }
    .ds-env-req.required { background: rgba(239,68,68,0.15); color: #ef4444; }
    .ds-env-req.optional { background: rgba(99,102,241,0.15); color: var(--color-primary, #6366f1); }
    .ds-btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .ds-btn { border: none; border-radius: 7px; font-size: 13px; font-weight: 600; padding: 9px 16px; cursor: pointer; transition: opacity 0.2s; }
    .ds-btn-primary { background: #0db7ed; color: #fff; }
    .ds-btn-secondary { background: var(--color-border, #2e2e3e); color: var(--color-text, #e0e0e0); }
    .ds-btn:hover { opacity: 0.8; }
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'docker-support-config';

  const SERVICES = [
    { id: 'svc-frontend', icon: '🌐', name: 'Frontend (Static)', image: 'nginx:alpine', ports: '3000:80', status: 'up', desc: 'Serves the dashboard HTML/CSS/JS' },
    { id: 'svc-backend', icon: '⚙️', name: 'Backend API', image: 'node:20-alpine', ports: '3001:3001', status: 'up', desc: 'Express API server with Prisma ORM' },
    { id: 'svc-postgres', icon: '🐘', name: 'PostgreSQL', image: 'postgres:16-alpine', ports: '5433:5432', status: 'up', desc: 'Primary database for all ACD data' },
    { id: 'svc-redis', icon: '🔴', name: 'Redis', image: 'redis:7-alpine', ports: '6379:6379', status: 'up', desc: 'Job queue and pub/sub messaging' },
    { id: 'svc-agent', icon: '🤖', name: 'Agent Service', image: 'python:3.11-slim', ports: '8000:8000', status: 'unknown', desc: 'Claude agent orchestrator' },
  ];

  const ENV_VARS = [
    { key: 'ANTHROPIC_API_KEY', val: 'sk-ant-...', required: true, desc: 'Anthropic API key for Claude' },
    { key: 'DATABASE_URL', val: 'postgresql://user:pass@postgres:5432/acd', required: true, desc: 'PostgreSQL connection URL' },
    { key: 'REDIS_URL', val: 'redis://redis:6379', required: true, desc: 'Redis connection URL' },
    { key: 'PORT', val: '3001', required: false, desc: 'Backend server port' },
    { key: 'NODE_ENV', val: 'production', required: false, desc: 'Node environment' },
    { key: 'OPENAI_API_KEY', val: 'sk-...', required: false, desc: 'Optional: OpenAI API key' },
  ];

  const DOCKER_COMPOSE = `version: '3.8'
services:
  frontend:
    image: nginx:alpine
    ports: ["3000:80"]
    volumes: [".:/usr/share/nginx/html:ro"]
    depends_on: [api]

  api:
    build: ./backend
    ports: ["3001:3001"]
    environment:
      DATABASE_URL: \${DATABASE_URL}
      REDIS_URL: redis://redis:6379
      ANTHROPIC_API_KEY: \${ANTHROPIC_API_KEY}
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: acd_user
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      POSTGRES_DB: acd_database
    ports: ["5433:5432"]
    volumes: [acd_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]

volumes:
  acd_data:
  redis_data:`;

  const DOCKERFILE = `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "src/index.js"]`;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  let state = loadState();
  let activeTab = 'services';

  function setTab(tab) { activeTab = tab; renderCard(); }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => { alert('Copied to clipboard!'); }).catch(() => { alert('Copy failed — please select and copy manually.'); });
  }

  function downloadDockerCompose() {
    const blob = new Blob([DOCKER_COMPOSE], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'docker-compose.yml'; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadDockerfile() {
    const blob = new Blob([DOCKERFILE], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Dockerfile'; a.click();
    URL.revokeObjectURL(url);
  }

  function renderCard() {
    const card = document.getElementById('docker-support-card');
    if (!card) return;

    let content = '';
    if (activeTab === 'services') {
      content = `<div class="ds-services">${SERVICES.map(s => `
        <div class="ds-service">
          <div class="ds-service-top">
            <div class="ds-service-name"><span class="ds-service-icon">${s.icon}</span>${s.name}</div>
            <span><span class="ds-status-dot ${s.status}"></span><span style="font-size:12px;color:var(--color-text-secondary,#a0a0b0)">${s.status}</span></span>
          </div>
          <div class="ds-service-meta">${s.desc}</div>
          <div class="ds-service-ports">Image: ${s.image} &nbsp;|&nbsp; Ports: ${s.ports}</div>
        </div>`).join('')}</div>
      <div class="ds-btn-row">
        <button class="ds-btn ds-btn-primary" onclick="window.dockerSupport.downloadDockerCompose()">⬇ docker-compose.yml</button>
        <button class="ds-btn ds-btn-secondary" onclick="window.dockerSupport.downloadDockerfile()">⬇ Dockerfile</button>
      </div>`;
    } else if (activeTab === 'compose') {
      content = `<div class="ds-code-block" style="position:relative">${DOCKER_COMPOSE}<button class="ds-copy-btn" onclick="window.dockerSupport.copyToClipboard(window.dockerSupport.getDockerCompose())">Copy</button></div>
      <div class="ds-btn-row"><button class="ds-btn ds-btn-primary" onclick="window.dockerSupport.downloadDockerCompose()">⬇ Download</button></div>`;
    } else if (activeTab === 'dockerfile') {
      content = `<div class="ds-code-block" style="position:relative">${DOCKERFILE}<button class="ds-copy-btn" onclick="window.dockerSupport.copyToClipboard(window.dockerSupport.getDockerfile())">Copy</button></div>
      <div class="ds-btn-row"><button class="ds-btn ds-btn-secondary" onclick="window.dockerSupport.downloadDockerfile()">⬇ Download</button></div>`;
    } else {
      const rows = ENV_VARS.map(e => `
        <div class="ds-env-item">
          <span class="ds-env-key">${e.key}</span>
          <span class="ds-env-val">${e.val}</span>
          <span class="ds-env-req ${e.required ? 'required' : 'optional'}">${e.required ? 'Required' : 'Optional'}</span>
        </div>`).join('');
      content = `<div class="ds-env-list">${rows}</div>
      <div class="ds-btn-row" style="margin-top:14px">
        <button class="ds-btn ds-btn-secondary" onclick="window.dockerSupport.downloadEnvExample()">⬇ .env.example</button>
      </div>`;
    }

    card.innerHTML = `
      <div class="ds-header">
        <h3>🐳 Docker Deployment</h3>
        <span class="ds-badge">🐳 ${SERVICES.filter(s => s.status === 'up').length}/${SERVICES.length} Up</span>
      </div>
      <div class="ds-tabs">
        <button class="ds-tab ${activeTab === 'services' ? 'active' : ''}" onclick="window.dockerSupport.setTab('services')">Services</button>
        <button class="ds-tab ${activeTab === 'compose' ? 'active' : ''}" onclick="window.dockerSupport.setTab('compose')">Compose</button>
        <button class="ds-tab ${activeTab === 'dockerfile' ? 'active' : ''}" onclick="window.dockerSupport.setTab('dockerfile')">Dockerfile</button>
        <button class="ds-tab ${activeTab === 'env' ? 'active' : ''}" onclick="window.dockerSupport.setTab('env')">Env Vars</button>
      </div>
      ${content}`;
  }

  function downloadEnvExample() {
    const content = ENV_VARS.map(e => `# ${e.desc}\n${e.key}=${e.val}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '.env.example'; a.click();
    URL.revokeObjectURL(url);
  }

  function init() {
    const main = document.querySelector('main.container');
    if (!main) return;
    const card = document.createElement('div');
    card.id = 'docker-support-card';
    main.insertBefore(card, main.firstChild);
    renderCard();
  }

  window.dockerSupport = {
    setTab,
    copyToClipboard,
    downloadDockerCompose,
    downloadDockerfile,
    downloadEnvExample,
    getDockerCompose: () => DOCKER_COMPOSE,
    getDockerfile: () => DOCKERFILE,
    getServices: () => [...SERVICES],
    getService: (id) => SERVICES.find(s => s.id === id) || null,
    getEnvVars: () => [...ENV_VARS],
    getState: () => ({ services: SERVICES.length, upServices: SERVICES.filter(s => s.status === 'up').length }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
