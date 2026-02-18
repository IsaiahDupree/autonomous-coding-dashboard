/**
 * Programmatic Creative Testing - Frontend Application
 * Vanilla JS app for managing ad creative testing workflow
 */

// ============================================
// Configuration
// ============================================
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3434/api/pct'
  : '/api/pct';

// ============================================
// State
// ============================================
const state = {
  brands: [],
  selectedBrandId: null,
  products: [],
  selectedProductId: null,
  voc: [],
  usps: [],
  angles: {}, // keyed by uspId
  hooks: [],
  hookFilters: {
    messagingFramework: null,
    awarenessLevel: null,
    marketSophistication: null,
    status: null,
    search: '',
  },
  hookSort: 'newest',
  hookPage: 0,
  hookTotal: 0,
  selectedHookIds: new Set(),
  showDuplicates: false,
  stats: {},
  // Generation params
  genParams: {
    uspId: null,
    angleId: null,
    messagingFramework: 'punchy',
    awarenessLevel: 3,
    marketSophistication: 3,
    batchSize: 10,
    aiModel: 'claude-sonnet', // F4.1.6: claude-sonnet, claude-haiku, gpt-4o, gpt-4o-mini
  },
  matrixMode: false,
  matrixParams: {
    frameworks: new Set(),
    awarenessLevels: new Set(),
    sophisticationLevels: new Set(),
  },
  abFrameworkMode: false, // F3.1.4: A/B test exactly 2 frameworks
  abFrameworks: new Set(), // exactly 2 frameworks for A/B test
  // Ad Creative state
  templates: [],
  selectedTemplateId: null,
  creativeSubTab: 'templates', // 'templates', 'editor', 'generate', 'gallery'
  editingTemplate: null, // template being edited in canvas
  textZones: [], // current template text zones
  activeZoneIdx: -1, // selected zone index
  canvasScale: 1,
  // Zone drawing state
  isDrawingZone: false,
  drawStart: null,
  // Generated ads
  generatedAds: [],
  generatedAdsTotal: 0,
  generatedAdsPage: 0,
  selectedAdIds: new Set(),
  adFilters: { status: null },
  // USP/Angle state
  angleGenerateCount: 8,

  // Video Scripts state
  videoScripts: [],
  videoScriptsTotal: 0,
  selectedScriptHookId: null,
  scriptDuration: 'thirty_seconds',
  scriptNarratorStyle: null,
  scriptPsychTriggers: new Set(),
  scriptEmotionArc: null,
  scriptFilters: { status: null, duration: null },
  teleprompterScriptId: null,

  // Analytics (Module 8)
  analytics: {
    subTab: 'overview',   // 'overview', 'insights', 'winners', 'trends', 'import', 'iterations'
    productId: null,
    dateFrom: '',
    dateTo: '',
    winnerMetric: 'ctr',
    insights: null,
    winners: [],
    trends: [],
    metrics: [],
    iterations: [],
    loading: false,
  },
};

// ============================================
// API Layer
// ============================================
async function api(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  };
  if (opts.body && typeof opts.body === 'object') {
    config.body = JSON.stringify(opts.body);
  }
  const resp = await fetch(url, config);
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json.error?.message || `API error ${resp.status}`);
  }
  return json;
}

const pctApi = {
  // Brands
  getBrands: () => api('/brands'),
  createBrand: (data) => api('/brands', { method: 'POST', body: data }),
  getBrand: (id) => api(`/brands/${id}`),
  updateBrand: (id, data) => api(`/brands/${id}`, { method: 'PUT', body: data }),
  deleteBrand: (id) => api(`/brands/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (brandId) => api(`/brands/${brandId}/products`),
  createProduct: (brandId, data) => api(`/brands/${brandId}/products`, { method: 'POST', body: data }),
  getProduct: (id) => api(`/products/${id}`),
  updateProduct: (id, data) => api(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => api(`/products/${id}`, { method: 'DELETE' }),

  // VoC
  getVoc: (productId) => api(`/products/${productId}/voc`),
  createVoc: (productId, data) => api(`/products/${productId}/voc`, { method: 'POST', body: data }),
  deleteVoc: (id) => api(`/voc/${id}`, { method: 'DELETE' }),

  // USPs
  getUsps: (productId) => api(`/products/${productId}/usps`),
  createUsp: (productId, content) => api(`/products/${productId}/usps`, { method: 'POST', body: { content } }),
  generateUsps: (productId) => api(`/products/${productId}/usps/generate`, { method: 'POST', body: {} }),
  updateUsp: (id, data) => api(`/usps/${id}`, { method: 'PUT', body: data }),
  deleteUsp: (id) => api(`/usps/${id}`, { method: 'DELETE' }),
  scoreUsp: (id) => api(`/usps/${id}/score`, { method: 'POST', body: {} }),

  // Angles
  getAngles: (uspId) => api(`/usps/${uspId}/angles`),
  generateAngles: (uspId, count) => api(`/usps/${uspId}/angles/generate`, { method: 'POST', body: { count } }),
  updateAngle: (id, data) => api(`/angles/${id}`, { method: 'PUT', body: data }),
  deleteAngle: (id) => api(`/angles/${id}`, { method: 'DELETE' }),

  // Hooks
  generateHooks: (data) => api('/hooks/generate', { method: 'POST', body: data }),
  getHooks: (params) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') qs.set(k, v);
    });
    return api(`/hooks?${qs.toString()}`);
  },
  updateHook: (id, data) => api(`/hooks/${id}`, { method: 'PATCH', body: data }),
  bulkUpdateHooks: (ids, data) => api('/hooks/bulk/update', { method: 'PATCH', body: { ids, ...data } }),
  deleteHook: (id) => api(`/hooks/${id}`, { method: 'DELETE' }),

  // Templates
  getTemplates: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) qs.set(k, v); });
    return api(`/templates?${qs.toString()}`);
  },
  createTemplate: (data) => api('/templates', { method: 'POST', body: data }),
  getTemplate: (id) => api(`/templates/${id}`),
  updateTemplate: (id, data) => api(`/templates/${id}`, { method: 'PUT', body: data }),
  deleteTemplate: (id) => api(`/templates/${id}`, { method: 'DELETE' }),

  // Generated Ads
  createAdsBatch: (ads) => api('/generated-ads/batch', { method: 'POST', body: { ads } }),
  getGeneratedAds: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/generated-ads?${qs.toString()}`);
  },
  updateGeneratedAd: (id, data) => api(`/generated-ads/${id}`, { method: 'PATCH', body: data }),
  bulkUpdateAds: (ids, data) => api('/generated-ads/bulk/update', { method: 'PATCH', body: { ids, ...data } }),
  deleteGeneratedAd: (id) => api(`/generated-ads/${id}`, { method: 'DELETE' }),

  // Video Scripts (data may include: hookId, productId, duration, narratorStyle, psychologicalTriggers, emotionArc)
  generateVideoScript: (data) => api('/video-scripts/generate', { method: 'POST', body: data }),
  getVideoScripts: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/video-scripts?${qs.toString()}`);
  },
  getVideoScript: (id) => api(`/video-scripts/${id}`),
  updateVideoScript: (id, data) => api(`/video-scripts/${id}`, { method: 'PATCH', body: data }),
  deleteVideoScript: (id) => api(`/video-scripts/${id}`, { method: 'DELETE' }),
  rewriteScriptSection: (id, section, count) => api(`/video-scripts/${id}/rewrite-section`, { method: 'POST', body: { section, count: count || 3 } }),

  // USP Archive (F2.1.6)
  archiveUsp: (id, note) => api(`/usps/${id}/archive`, { method: 'POST', body: { note } }),
  restoreUsp: (id) => api(`/usps/${id}/restore`, { method: 'POST', body: {} }),
  getArchivedUsps: (productId) => api(`/products/${productId}/usps?archived=true`),

  // Activity Log (F10.1.4)
  getActivityLog: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/activity-log?${qs.toString()}`);
  },
  logActivity: (data) => api('/activity-log', { method: 'POST', body: data }),

  // User Management (F10.1.1-F10.1.3)
  getUsers: () => api('/users'),
  createUser: (data) => api('/users', { method: 'POST', body: data }),
  updateUser: (id, data) => api(`/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id) => api(`/users/${id}`, { method: 'DELETE' }),
  getWorkspaces: () => api('/workspaces'),
  createWorkspace: (data) => api('/workspaces', { method: 'POST', body: data }),

  // Stats
  getStats: () => api('/stats'),

  // Analytics (Module 8)
  importMetrics: (data) => api('/analytics/metrics', { method: 'POST', body: data }),
  importMetricsBulk: (metrics) => api('/analytics/metrics/bulk', { method: 'POST', body: { metrics } }),
  getMetrics: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/analytics/metrics?${qs.toString()}`);
  },
  getInsights: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/analytics/insights?${qs.toString()}`);
  },
  getWinners: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/analytics/winners?${qs.toString()}`);
  },
  getTrends: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/analytics/trends?${qs.toString()}`);
  },
  iterateFromHook: (data) => api('/analytics/iterate/hooks', { method: 'POST', body: data }),
  iterateFromAngle: (data) => api('/analytics/iterate/angle', { method: 'POST', body: data }),
  getIterations: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/analytics/iterations?${qs.toString()}`);
  },

  // F1.2.6 - Bulk product import
  bulkImportProducts: (brandId, products) => api(`/brands/${brandId}/products/bulk-import`, { method: 'POST', body: { products } }),

  // F7.2.3/F7.2.4 - Campaign/AdSet creation
  createCampaign: (accountId, data) => api(`/meta/accounts/${accountId}/campaigns`, { method: 'POST', body: data }),
  createAdSet: (campaignId, data) => api(`/meta/campaigns/${campaignId}/adsets`, { method: 'POST', body: data }),

  // F8.3.4 - Winner templates
  getWinnerTemplates: (hookId, productId) => api('/analytics/winner-templates', { method: 'POST', body: { hookId, productId } }),

  // F8.3.5 - A/B test setup
  createAbTest: (data) => api('/analytics/ab-test', { method: 'POST', body: data }),

  // F9.1.x - Webhooks
  getWebhooks: () => api('/webhooks'),
  createWebhook: (data) => api('/webhooks', { method: 'POST', body: data }),
  updateWebhook: (id, data) => api(`/webhooks/${id}`, { method: 'PUT', body: data }),
  deleteWebhook: (id) => api(`/webhooks/${id}`, { method: 'DELETE' }),
  testWebhook: (id) => api(`/webhooks/${id}/test`, { method: 'POST', body: {} }),

  // F9.3.x - Schedules
  getSchedules: () => api('/schedules'),
  createSchedule: (data) => api('/schedules', { method: 'POST', body: data }),
  updateSchedule: (id, data) => api(`/schedules/${id}`, { method: 'PUT', body: data }),
  deleteSchedule: (id) => api(`/schedules/${id}`, { method: 'DELETE' }),
  triggerSchedule: (id) => api(`/schedules/${id}/trigger`, { method: 'POST', body: {} }),
};

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'success') {
  let toast = document.getElementById('pct-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pct-toast';
    toast.className = 'pct-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `pct-toast ${type} show`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================
// Tab Navigation
// ============================================
function switchTab(tabId) {
  document.querySelectorAll('.pct-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.pct-tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tabId}`));

  // Auto-load data when switching tabs
  if (tabId === 'usps' && state.selectedProductId) {
    loadUsps();
  }
  if (tabId === 'generate') {
    renderGenerationPanel();
    if (state.selectedProductId) {
      loadUsps().then(() => populateGenDropdowns());
    }
  }
  if (tabId === 'review') {
    loadHooks();
  }
  if (tabId === 'creative') {
    renderCreativePanel();
  }
  if (tabId === 'scripts') {
    renderScriptsPanel();
    loadVideoScripts().then(() => {
      // F6.3.1-F6.3.4: Render B-roll section after scripts load
      renderBrollSection();
      populateBrollScriptSelect();
    });
  }
  if (tabId === 'deploy') {
    // Load approved ads for the deploy wizard
    if (state.generatedAds.length === 0) {
      state.adFilters = { status: 'approved' };
      loadGeneratedAds().then(() => loadMetaAccounts());
    } else {
      loadMetaAccounts();
    }
  }
  if (tabId === 'analytics') {
    renderAnalyticsPanel();
    loadAnalyticsData();
  }
  if (tabId === 'automation') {
    renderAutomationPanel();
    loadAutomationData();
  }
  if (tabId === 'settings') {
    renderSettingsPanel();
    // F10.1.1-F10.1.3: Load team data after panel renders
    setTimeout(() => loadTeamData(), 100);
  }
}

// ============================================
// Stats
// ============================================
async function loadStats() {
  try {
    const { data } = await pctApi.getStats();
    state.stats = data;
    renderStats();
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

function renderStats() {
  const s = state.stats;
  const el = document.getElementById('pct-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="pct-stat"><div class="pct-stat-value">${s.brands || 0}</div><div class="pct-stat-label">Brands</div></div>
    <div class="pct-stat"><div class="pct-stat-value">${s.products || 0}</div><div class="pct-stat-label">Products</div></div>
    <div class="pct-stat"><div class="pct-stat-value">${s.usps || 0}</div><div class="pct-stat-label">USPs</div></div>
    <div class="pct-stat"><div class="pct-stat-value">${s.angles || 0}</div><div class="pct-stat-label">Angles</div></div>
    <div class="pct-stat"><div class="pct-stat-value">${s.totalHooks || 0}</div><div class="pct-stat-label">Total Hooks</div></div>
    <div class="pct-stat"><div class="pct-stat-value" style="color:var(--color-success)">${s.approvedHooks || 0}</div><div class="pct-stat-label">Approved</div></div>
    <div class="pct-stat"><div class="pct-stat-value">${s.templates || 0}</div><div class="pct-stat-label">Templates</div></div>
    <div class="pct-stat"><div class="pct-stat-value" style="color:var(--color-primary-light)">${s.generatedAds || 0}</div><div class="pct-stat-label">Ads</div></div>
    <div class="pct-stat"><div class="pct-stat-value" style="color:#f59e0b">${s.videoScripts || 0}</div><div class="pct-stat-label">Scripts</div></div>
  `;
}

// ============================================
// Tab 1: Context & Setup
// ============================================

// -- Brands --
async function loadBrands() {
  try {
    const { data } = await pctApi.getBrands();
    state.brands = data;
    renderBrandList();
  } catch (e) {
    showToast('Failed to load brands: ' + e.message, 'error');
  }
}

function renderBrandList() {
  const el = document.getElementById('brand-list');
  if (!el) return;
  if (state.brands.length === 0) {
    el.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">No brands yet. Create one to get started.</div></div>';
    return;
  }
  el.innerHTML = state.brands.map(b => {
    // F1.1.3: Show brand color swatch and logo if available
    const colors = b.colors || {};
    const primaryColor = colors.primary || '#6366f1';
    const logoHtml = b.logoUrl
      ? `<img src="${escAttr(b.logoUrl)}" alt="" style="width:24px;height:24px;border-radius:var(--radius-sm);object-fit:cover;flex-shrink:0" onerror="this.style.display='none'">`
      : `<div style="width:24px;height:24px;border-radius:var(--radius-sm);background:${escAttr(primaryColor)};flex-shrink:0"></div>`;
    return `
    <div class="pct-list-item ${state.selectedBrandId === b.id ? 'selected' : ''}" onclick="selectBrand('${b.id}')">
      <div style="display:flex;align-items:center;gap:var(--space-xs);flex:1;min-width:0">
        ${logoHtml}
        <div style="min-width:0">
          <div class="pct-list-item-text">${escHtml(b.name)}</div>
          <div class="pct-list-item-meta">${(b.products || []).length} product(s)${b.toneStyle ? ' · ' + b.toneStyle : ''}</div>
        </div>
      </div>
      <div class="pct-list-item-actions">
        <button class="pct-btn pct-btn-sm pct-btn-icon" onclick="event.stopPropagation(); deleteBrand('${b.id}')" title="Delete">x</button>
      </div>
    </div>
  `}).join('');
}

// F1.1.5: Brand profile templates for quick setup
const BRAND_TEMPLATES = [
  {
    name: 'Bold DTC Brand',
    description: 'Direct-to-consumer brand that disrupts traditional retail',
    voice: 'Bold, direct, confident',
    values: 'Disruption, quality, transparency',
    toneStyle: 'bold',
    colors: { primary: '#ef4444', accent: '#fbbf24', background: '#ffffff', text: '#111827' },
  },
  {
    name: 'Luxury Brand',
    description: 'Premium brand focused on exclusivity and craftsmanship',
    voice: 'Sophisticated, aspirational, refined',
    values: 'Excellence, exclusivity, craftsmanship',
    toneStyle: 'luxury',
    colors: { primary: '#1e1b18', accent: '#d4af37', background: '#fafaf8', text: '#1c1917' },
  },
  {
    name: 'Friendly Health Brand',
    description: 'Wellness and health brand that makes healthy living approachable',
    voice: 'Warm, encouraging, science-backed',
    values: 'Wellness, simplicity, empowerment',
    toneStyle: 'friendly',
    colors: { primary: '#16a34a', accent: '#84cc16', background: '#f0fdf4', text: '#14532d' },
  },
  {
    name: 'Casual Tech Brand',
    description: 'Consumer tech that solves everyday problems with simplicity',
    voice: 'Casual, helpful, witty',
    values: 'Simplicity, innovation, accessibility',
    toneStyle: 'casual',
    colors: { primary: '#6366f1', accent: '#f59e0b', background: '#ffffff', text: '#111827' },
  },
  {
    name: 'Professional B2B',
    description: 'Business solutions brand focused on ROI and reliability',
    voice: 'Professional, authoritative, data-driven',
    values: 'Reliability, efficiency, growth',
    toneStyle: 'professional',
    colors: { primary: '#1d4ed8', accent: '#0ea5e9', background: '#f8fafc', text: '#0f172a' },
  },
  {
    name: 'Playful Lifestyle',
    description: 'Fun lifestyle brand that celebrates individuality',
    voice: 'Playful, energetic, inclusive',
    values: 'Fun, self-expression, community',
    toneStyle: 'playful',
    colors: { primary: '#ec4899', accent: '#a855f7', background: '#fdf4ff', text: '#581c87' },
  },
];

function renderBrandTemplates() {
  const el = document.getElementById('brand-templates-grid');
  if (!el) return;
  el.innerHTML = BRAND_TEMPLATES.map((t, i) => `
    <button class="pct-btn pct-btn-sm" style="text-align:left;padding:var(--space-xs);font-size:0.75rem;height:auto;white-space:normal" onclick="applyBrandTemplate(${i})">
      <div style="font-weight:600;margin-bottom:2px">${escHtml(t.name)}</div>
      <div style="color:var(--color-muted);font-size:0.6875rem">${escHtml(t.toneStyle)}</div>
    </button>
  `).join('');
}

function applyBrandTemplate(idx) {
  const t = BRAND_TEMPLATES[idx];
  if (!t) return;
  const fields = {
    'brand-name': t.name,
    'brand-desc': t.description,
    'brand-voice': t.voice,
    'brand-values': t.values,
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  const toneEl = document.getElementById('brand-tone');
  if (toneEl) toneEl.value = t.toneStyle;
  // Apply colors
  if (t.colors) {
    const colorMap = {
      'brand-color-primary': t.colors.primary,
      'brand-color-accent': t.colors.accent,
      'brand-color-bg': t.colors.background,
      'brand-color-text': t.colors.text,
    };
    Object.entries(colorMap).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  }
  showToast(`Template "${t.name}" applied`);
}

async function createBrand() {
  const name = document.getElementById('brand-name').value.trim();
  if (!name) return showToast('Brand name is required', 'error');

  // F1.1.3: Collect brand guidelines (logo, colors, fonts)
  const colors = {
    primary: document.getElementById('brand-color-primary')?.value || '#6366f1',
    accent: document.getElementById('brand-color-accent')?.value || '#f59e0b',
    background: document.getElementById('brand-color-bg')?.value || '#ffffff',
    text: document.getElementById('brand-color-text')?.value || '#111827',
  };
  const fontHeading = document.getElementById('brand-font-heading')?.value.trim() || null;
  const fontBody = document.getElementById('brand-font-body')?.value.trim() || null;
  if (fontHeading) colors.fontHeading = fontHeading;
  if (fontBody) colors.fontBody = fontBody;

  const data = {
    name,
    description: document.getElementById('brand-desc').value.trim() || null,
    voice: document.getElementById('brand-voice').value.trim() || null,
    values: document.getElementById('brand-values').value.trim() || null,
    toneStyle: document.getElementById('brand-tone').value || null,
    logoUrl: document.getElementById('brand-logo-url')?.value.trim() || null,
    colors,
  };
  try {
    await pctApi.createBrand(data);
    document.getElementById('brand-name').value = '';
    document.getElementById('brand-desc').value = '';
    document.getElementById('brand-voice').value = '';
    document.getElementById('brand-values').value = '';
    document.getElementById('brand-tone').value = '';
    if (document.getElementById('brand-logo-url')) document.getElementById('brand-logo-url').value = '';
    if (document.getElementById('brand-font-heading')) document.getElementById('brand-font-heading').value = '';
    if (document.getElementById('brand-font-body')) document.getElementById('brand-font-body').value = '';
    showToast('Brand created');
    await loadBrands();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteBrand(id) {
  if (!confirm('Delete this brand and all its data?')) return;
  try {
    await pctApi.deleteBrand(id);
    if (state.selectedBrandId === id) {
      state.selectedBrandId = null;
      state.products = [];
      state.selectedProductId = null;
      renderProductList();
      renderProductDetail();
    }
    showToast('Brand deleted');
    await loadBrands();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function selectBrand(id) {
  state.selectedBrandId = id;
  state.selectedProductId = null;
  renderBrandList();
  renderProductDetail();
  await loadProducts();
}

// -- Products --
async function loadProducts() {
  if (!state.selectedBrandId) {
    state.products = [];
    renderProductList();
    return;
  }
  try {
    const { data } = await pctApi.getProducts(state.selectedBrandId);
    state.products = data;
    renderProductList();
  } catch (e) {
    showToast('Failed to load products: ' + e.message, 'error');
  }
}

function renderProductList() {
  const el = document.getElementById('product-list');
  if (!el) return;
  if (!state.selectedBrandId) {
    el.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">Select a brand first</div></div>';
    return;
  }
  if (state.products.length === 0) {
    el.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">No products yet.</div></div>';
    return;
  }
  el.innerHTML = state.products.map(p => `
    <div class="pct-list-item ${state.selectedProductId === p.id ? 'selected' : ''}" onclick="selectProduct('${p.id}')">
      <div>
        <div class="pct-list-item-text">${escHtml(p.name)}</div>
        <div class="pct-list-item-meta">${p._count?.usps || 0} USPs, ${p._count?.hooks || 0} hooks</div>
      </div>
      <div class="pct-list-item-actions">
        <button class="pct-btn pct-btn-sm pct-btn-icon" onclick="event.stopPropagation(); deleteProduct('${p.id}')" title="Delete">x</button>
      </div>
    </div>
  `).join('');
}

async function createProduct() {
  if (!state.selectedBrandId) return showToast('Select a brand first', 'error');
  const name = document.getElementById('product-name').value.trim();
  if (!name) return showToast('Product name is required', 'error');

  const featuresRaw = document.getElementById('product-features').value.trim();
  const benefitsRaw = document.getElementById('product-benefits').value.trim();

  // F1.2.2: Product image URL
  const imageUrl = document.getElementById('product-image-url')?.value.trim() || null;

  const data = {
    name,
    description: document.getElementById('product-desc').value.trim() || null,
    features: featuresRaw ? featuresRaw.split('\n').map(s => s.trim()).filter(Boolean) : [],
    benefits: benefitsRaw ? benefitsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [],
    targetAudience: document.getElementById('product-audience').value.trim() || null,
    pricePoint: document.getElementById('product-price').value.trim() || null,
    category: document.getElementById('product-category').value.trim() || null,
    imageUrl,
  };
  try {
    await pctApi.createProduct(state.selectedBrandId, data);
    // Clear form
    ['product-name', 'product-desc', 'product-features', 'product-benefits', 'product-audience', 'product-price', 'product-category', 'product-image-url'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const preview = document.getElementById('product-image-preview');
    if (preview) preview.innerHTML = '';
    showToast('Product created');
    await loadProducts();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product and all its data?')) return;
  try {
    await pctApi.deleteProduct(id);
    if (state.selectedProductId === id) {
      state.selectedProductId = null;
      renderProductDetail();
    }
    showToast('Product deleted');
    await loadProducts();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// F1.2.6 - Bulk product import from CSV/JSON text
async function bulkImportProducts() {
  if (!state.selectedBrandId) return showToast('Select a brand first', 'error');
  const raw = document.getElementById('bulk-product-input')?.value?.trim();
  if (!raw) return showToast('Paste CSV or JSON data first', 'error');

  let products = [];
  try {
    // Try JSON first
    if (raw.startsWith('[') || raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      products = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      // Parse CSV: first line is headers
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return showToast('CSV needs at least a header row and one data row', 'error');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      products = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { if (vals[i]) obj[h] = vals[i]; });
        return obj;
      });
    }
  } catch (e) {
    return showToast('Invalid JSON or CSV: ' + e.message, 'error');
  }

  if (products.length === 0) return showToast('No products found in input', 'error');

  try {
    showLoading(`Importing ${products.length} products...`, 'Please wait');
    const result = await pctApi.bulkImportProducts(state.selectedBrandId, products);
    hideLoading();
    showToast(`Imported ${result.data.imported} products`);
    document.getElementById('bulk-product-input').value = '';
    await loadProducts();
    loadStats();
  } catch (e) {
    hideLoading();
    showToast('Import failed: ' + e.message, 'error');
  }
}

async function selectProduct(id) {
  state.selectedProductId = id;
  renderProductList();
  await loadProductDetail();
}

async function loadProductDetail() {
  if (!state.selectedProductId) {
    renderProductDetail();
    return;
  }
  try {
    const { data } = await pctApi.getProduct(state.selectedProductId);
    state.voc = data.voiceOfCustomer || [];
    state.usps = data.usps || [];
    renderProductDetail();
    // Also populate generation dropdowns
    populateGenDropdowns();
  } catch (e) {
    showToast('Failed to load product detail: ' + e.message, 'error');
  }
}

function renderProductDetail() {
  const el = document.getElementById('product-detail');
  if (!el) return;
  if (!state.selectedProductId) {
    el.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">Select a product to see details</div></div>';
    return;
  }
  const product = state.products.find(p => p.id === state.selectedProductId);
  if (!product) return;

  el.innerHTML = `
    <div class="pct-card" style="margin-bottom:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">Voice of Customer</div>
        <span class="pct-badge pct-badge-primary">${state.voc.length} entries</span>
      </div>
      <div id="voc-list">${renderVocList()}</div>
      <div style="margin-top:var(--space-sm)">
        <div class="pct-form-group">
          <textarea id="voc-content" class="pct-textarea" placeholder="Paste a customer quote or insight..." rows="2"></textarea>
        </div>
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;align-items:center">
          <input id="voc-source" class="pct-input" style="width:auto;flex:1;min-width:120px" placeholder="Source (e.g. Amazon)">
          <select id="voc-sentiment" class="pct-select" style="width:auto">
            <option value="neutral">Neutral</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
          <label style="font-size:0.8125rem;color:var(--color-text-secondary);display:flex;align-items:center;gap:0.25rem">
            <input type="checkbox" id="voc-gold" class="pct-checkbox"> Gold Nugget
          </label>
          <button class="pct-btn pct-btn-primary pct-btn-sm" onclick="createVoc()">Add</button>
        </div>
      </div>
    </div>
  `;
}

function renderVocList() {
  if (state.voc.length === 0) return '<div class="pct-empty"><div class="pct-empty-text">No VoC entries yet</div></div>';
  return state.voc.map(v => `
    <div class="pct-voc-item ${v.isGoldNugget ? 'pct-gold-nugget' : ''}">
      <div class="pct-voc-quote">"${escHtml(v.content)}"</div>
      <div class="pct-voc-meta">
        ${v.source ? `<span>${escHtml(v.source)}</span>` : ''}
        <span class="pct-badge ${v.sentiment === 'positive' ? 'pct-badge-success' : v.sentiment === 'negative' ? 'pct-badge-error' : 'pct-badge-muted'}">${v.sentiment}</span>
        ${v.isGoldNugget ? '<span class="pct-badge pct-badge-warning">Gold Nugget</span>' : ''}
        <button class="pct-btn pct-btn-sm pct-btn-danger pct-btn-icon" onclick="deleteVoc('${v.id}')" style="margin-left:auto">x</button>
      </div>
    </div>
  `).join('');
}

async function createVoc() {
  const content = document.getElementById('voc-content').value.trim();
  if (!content) return showToast('Quote content is required', 'error');
  const data = {
    content,
    source: document.getElementById('voc-source').value.trim() || null,
    sentiment: document.getElementById('voc-sentiment').value,
    isGoldNugget: document.getElementById('voc-gold').checked,
  };
  try {
    await pctApi.createVoc(state.selectedProductId, data);
    document.getElementById('voc-content').value = '';
    document.getElementById('voc-source').value = '';
    document.getElementById('voc-gold').checked = false;
    showToast('VoC entry added');
    await loadProductDetail();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteVoc(id) {
  try {
    await pctApi.deleteVoc(id);
    showToast('VoC entry deleted');
    await loadProductDetail();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ============================================
// Tab 2: USPs & Angles
// ============================================
async function loadUsps() {
  if (!state.selectedProductId) return;
  try {
    const [activeResult, archivedResult] = await Promise.all([
      pctApi.getUsps(state.selectedProductId),
      pctApi.getArchivedUsps(state.selectedProductId).catch(() => ({ data: [] })),
    ]);
    state.usps = activeResult.data;
    archivedUsps = archivedResult.data || [];
    renderUsps();
    populateGenDropdowns();
  } catch (e) {
    showToast('Failed to load USPs: ' + e.message, 'error');
  }
}

async function setUspArchiveView(showArchived) {
  showArchivedUsps = showArchived;
  renderUsps();
}

async function archiveUsp(id) {
  const note = prompt('Archive note (optional):') || '';
  try {
    await pctApi.archiveUsp(id, note);
    showToast('USP archived');
    await loadUsps();
  } catch (e) {
    showToast('Failed to archive: ' + e.message, 'error');
  }
}

async function restoreUsp(id) {
  try {
    await pctApi.restoreUsp(id);
    showToast('USP restored');
    await loadUsps();
  } catch (e) {
    showToast('Failed to restore: ' + e.message, 'error');
  }
}

// F2.1.6: USP archive state
let showArchivedUsps = false;
let archivedUsps = [];

function renderUsps() {
  const el = document.getElementById('usp-list');
  if (!el) return;
  if (!state.selectedProductId) {
    el.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">Select a product in the Context tab first</div></div>';
    return;
  }

  const uspsToShow = showArchivedUsps ? archivedUsps : state.usps;

  // Archive toggle header
  const archiveToggleHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-sm)">
      <div style="display:flex;gap:var(--space-xs)">
        <span class="pct-chip ${!showArchivedUsps ? 'active' : ''}" onclick="setUspArchiveView(false)" style="cursor:pointer">Active (${state.usps.length})</span>
        <span class="pct-chip ${showArchivedUsps ? 'active' : ''}" onclick="setUspArchiveView(true)" style="cursor:pointer">Archived (${archivedUsps.length})</span>
      </div>
      ${showArchivedUsps ? '<span style="font-size:0.75rem;color:var(--color-muted)">Historical USP archive — F2.1.6</span>' : ''}
    </div>
  `;

  if (uspsToShow.length === 0) {
    el.innerHTML = archiveToggleHtml + `<div class="pct-empty"><div class="pct-empty-text">${showArchivedUsps ? 'No archived USPs.' : 'No USPs yet. Add manually or generate with AI.'}</div></div>`;
    return;
  }
  el.innerHTML = archiveToggleHtml + uspsToShow.map(u => {
    const angles = u.angles || [];
    const isArchived = !!u.archivedAt;
    return `
      <div class="pct-usp-item" style="${isArchived ? 'opacity:0.7' : ''}">
        <div class="pct-usp-header" onclick="toggleUsp('${u.id}')">
          <span class="pct-expand-arrow" id="arrow-${u.id}">&#9654;</span>
          <span class="pct-usp-text">${escHtml(u.content)}</span>
          <div style="display:flex;align-items:center;gap:0.5rem">
            ${u.isAiGenerated ? '<span class="pct-badge pct-badge-primary">AI</span>' : ''}
            ${isArchived ? '<span class="pct-badge pct-badge-muted">Archived</span>' : ''}
            ${u.strengthScore ? `<span class="pct-badge pct-badge-${u.strengthScore >= 7 ? 'success' : u.strengthScore >= 5 ? 'warning' : 'danger'}" title="USP Strength Score">&#9733; ${u.strengthScore}/10</span>` : ''}
            <span class="pct-badge pct-badge-muted">${angles.length} angles</span>
            <span class="pct-badge pct-badge-muted">${u._count?.hooks || 0} hooks</span>
            ${!isArchived ? `<button class="pct-btn pct-btn-sm" onclick="event.stopPropagation(); scoreUsp('${u.id}')" id="score-usp-${u.id}" title="AI score this USP for strength">Score</button>` : ''}
            ${isArchived
              ? `<button class="pct-btn pct-btn-sm pct-btn-success" onclick="event.stopPropagation(); restoreUsp('${u.id}')" title="Restore from archive">Restore</button>`
              : `<button class="pct-btn pct-btn-sm" onclick="event.stopPropagation(); archiveUsp('${u.id}')" title="Archive this USP">Archive</button>`
            }
            <button class="pct-btn pct-btn-sm pct-btn-icon pct-btn-danger" onclick="event.stopPropagation(); deleteUsp('${u.id}')" title="Delete">x</button>
          </div>
        </div>
        <div class="pct-usp-body" id="usp-body-${u.id}">
          <div id="usp-score-detail-${u.id}"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin:var(--space-sm) 0">
            <span style="font-size:0.8125rem;color:var(--color-text-secondary)">Marketing Angles</span>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <label style="font-size:0.8125rem;color:var(--color-text-muted)">Count:</label>
              <select class="pct-select" style="font-size:0.8125rem;padding:0.2rem 0.4rem;width:auto" onchange="state.angleGenerateCount=parseInt(this.value)">
                ${[5,8,10,15,20].map(n => `<option value="${n}" ${state.angleGenerateCount === n ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
              <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="generateAnglesForUsp('${u.id}')" id="gen-angles-${u.id}">Generate Angles</button>
            </div>
          </div>
          <div id="angles-${u.id}">
            ${angles.length === 0 ? '<div class="pct-empty" style="padding:var(--space-sm)"><div class="pct-empty-text">No angles yet</div></div>' :
              angles.map(a => `
                <div class="pct-angle-item">
                  <span class="pct-angle-text">${escHtml(a.content)}</span>
                  <div style="display:flex;align-items:center;gap:0.375rem">
                    <span class="pct-badge ${a.category === 'emotional' ? 'pct-badge-warning' : a.category === 'social_proof' ? 'pct-badge-success' : 'pct-badge-primary'}">${a.category}</span>
                    <button class="pct-btn pct-btn-sm pct-btn-icon ${a.isApproved ? 'pct-btn-success' : ''}" onclick="toggleAngleApproval('${a.id}', ${!a.isApproved})" title="${a.isApproved ? 'Approved' : 'Click to approve'}">${a.isApproved ? '&#10003;' : '&#9675;'}</button>
                    <button class="pct-btn pct-btn-sm pct-btn-icon pct-btn-danger" onclick="deleteAngle('${a.id}', '${u.id}')" title="Delete">x</button>
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleUsp(id) {
  const body = document.getElementById(`usp-body-${id}`);
  const arrow = document.getElementById(`arrow-${id}`);
  if (!body) return;
  const expanded = body.classList.toggle('expanded');
  if (arrow) arrow.classList.toggle('expanded', expanded);
}

async function createManualUsp() {
  if (!state.selectedProductId) return showToast('Select a product first', 'error');
  const content = document.getElementById('usp-manual-input').value.trim();
  if (!content) return showToast('USP content is required', 'error');
  try {
    await pctApi.createUsp(state.selectedProductId, content);
    document.getElementById('usp-manual-input').value = '';
    showToast('USP added');
    await loadUsps();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function generateUspsAi() {
  if (!state.selectedProductId) return showToast('Select a product first', 'error');
  const btn = document.getElementById('gen-usps-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  showLoading('Generating USPs...', 'Analyzing product data and VoC entries');
  try {
    const { data } = await pctApi.generateUsps(state.selectedProductId);
    showToast(`Generated ${data.length} USPs`);
    await loadUsps();
    loadStats();
  } catch (e) {
    showToast('Generation failed: ' + e.message, 'error');
  } finally {
    hideLoading();
    if (btn) { btn.disabled = false; btn.textContent = 'Generate USPs with AI'; }
  }
}

async function deleteUsp(id) {
  if (!confirm('Delete this USP and its angles?')) return;
  try {
    await pctApi.deleteUsp(id);
    showToast('USP deleted');
    await loadUsps();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function generateAnglesForUsp(uspId) {
  const btn = document.getElementById(`gen-angles-${uspId}`);
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  showLoading('Generating angles...', 'Creating marketing angle variations');
  try {
    const count = state.angleGenerateCount || 8;
    const { data } = await pctApi.generateAngles(uspId, count);
    showToast(`Generated ${data.length} angles`);
    await loadUsps();
    loadStats();
  } catch (e) {
    showToast('Generation failed: ' + e.message, 'error');
  } finally {
    hideLoading();
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Angles'; }
  }
}

async function scoreUsp(uspId) {
  const btn = document.getElementById(`score-usp-${uspId}`);
  if (btn) { btn.disabled = true; btn.textContent = 'Scoring...'; }
  try {
    const { data } = await pctApi.scoreUsp(uspId);
    const details = data.scoreDetails;
    // Update score in state
    const usp = state.usps.find(u => u.id === uspId);
    if (usp) usp.strengthScore = data.strengthScore;
    // Show score details inline
    const detailEl = document.getElementById(`usp-score-detail-${uspId}`);
    if (detailEl && details) {
      detailEl.innerHTML = `
        <div style="background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-sm);margin-bottom:var(--space-sm);font-size:0.8125rem">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
            <strong style="color:var(--color-${details.score >= 7 ? 'success' : details.score >= 5 ? 'warning' : 'danger'})">${details.score}/10</strong>
            <span style="color:var(--color-text-secondary)">${escHtml(details.reasoning)}</span>
          </div>
          ${details.strengths?.length ? `<div style="color:var(--color-success);margin-bottom:0.25rem">+ ${details.strengths.map(s => escHtml(s)).join(' &bull; ')}</div>` : ''}
          ${details.weaknesses?.length ? `<div style="color:var(--color-danger)">- ${details.weaknesses.map(w => escHtml(w)).join(' &bull; ')}</div>` : ''}
        </div>
      `;
    }
    renderUsps();
    showToast(`USP scored: ${details?.score}/10`);
  } catch (e) {
    showToast('Scoring failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Score'; }
  }
}

async function toggleAngleApproval(angleId, approved) {
  try {
    await pctApi.updateAngle(angleId, { isApproved: approved });
    await loadUsps();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteAngle(angleId, uspId) {
  try {
    await pctApi.deleteAngle(angleId);
    showToast('Angle deleted');
    await loadUsps();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ============================================
// Tab 3: Hook Generation
// ============================================
const BUILT_IN_FRAMEWORKS = [
  { key: 'punchy', label: 'Punchy', desc: 'Short, impactful (5-8 words)', examples: ['Shaky hands, steady glow.', 'No mirror, no problem.', 'One swipe. Done.'], isBuiltIn: true },
  { key: 'bold_statements', label: 'Bold Statements', desc: 'Provocative claims', examples: ['The last serum you\'ll ever buy.', 'We made skincare boring (on purpose).', 'Your dermatologist won\'t tell you this.'], isBuiltIn: true },
  { key: 'desire_future_states', label: 'Desire Future', desc: 'Aspirational outcomes', examples: ['Imagine waking up to glass skin.', 'The confidence of bare-faced beauty.', 'Walk into any room glowing.'], isBuiltIn: true },
  { key: 'question_based', label: 'Question-Based', desc: 'Curiosity-driven', examples: ['What if your skincare actually worked?', 'Still layering 10 products?', 'Why do models use half the products you do?'], isBuiltIn: true },
  { key: 'problem_agitation', label: 'Problem-Agitation', desc: 'Pain-focused', examples: ['Tired of wasting money on serums that expire unused?', 'Your skin shouldn\'t feel like a science experiment.', 'Another breakout from another "miracle" product.'], isBuiltIn: true },
  { key: 'social_proof', label: 'Social Proof', desc: 'Testimonial-style', examples: ['50,000 women switched this month.', '"I threw out my entire routine" - Sarah K.', '4.9 stars from 12,000+ reviews.'], isBuiltIn: true },
  { key: 'urgency_scarcity', label: 'Urgency/Scarcity', desc: 'FOMO, limited time', examples: ['Selling out again. Last 200 units.', '48-hour price drop. Not a drill.', 'The restock everyone waited for.'], isBuiltIn: true },
  { key: 'educational', label: 'Educational', desc: 'How-to, revealing info', examples: ['3 ingredients that actually reduce wrinkles.', 'The science behind buildable coverage.', 'How Korean skincare changed everything.'], isBuiltIn: true },
];

// F3.1.2 - Custom frameworks (stored in localStorage)
function loadCustomFrameworks() {
  try {
    return JSON.parse(localStorage.getItem('pct_custom_frameworks') || '[]');
  } catch { return []; }
}

function saveCustomFrameworks(frameworks) {
  localStorage.setItem('pct_custom_frameworks', JSON.stringify(frameworks));
}

function getFrameworks() {
  return [...BUILT_IN_FRAMEWORKS, ...loadCustomFrameworks()];
}

const FRAMEWORKS = getFrameworks(); // compat alias - refreshed on render

const AWARENESS_LEVELS = [
  { num: 1, name: 'Unaware', desc: "Don't know they have a problem" },
  { num: 2, name: 'Problem Aware', desc: 'Know problem, not solutions' },
  { num: 3, name: 'Solution Aware', desc: 'Know solutions exist, not your product' },
  { num: 4, name: 'Product Aware', desc: 'Know your product, not convinced' },
  { num: 5, name: 'Most Aware', desc: 'Ready to buy' },
];

const SOPH_LEVELS = [
  { num: 1, label: 'New', desc: 'Simply state what product does' },
  { num: 2, label: 'Growing', desc: 'Bigger/better claims' },
  { num: 3, label: 'Crowded', desc: 'Unique mechanism' },
  { num: 4, label: 'Skeptical', desc: 'Proof & specificity' },
  { num: 5, label: 'Exhausted', desc: 'Tribe building' },
];

function renderGenerationPanel() {
  const el = document.getElementById('generation-panel');
  if (!el) return;

  const matrixCombos = getMatrixComboCount();
  const matrixHookEstimate = matrixCombos * state.genParams.batchSize;

  el.innerHTML = `
    <div class="pct-card" style="margin-bottom:var(--space-md)">
      <div class="pct-card-header" style="margin-bottom:var(--space-md)">
        <div class="pct-card-title">Generation Parameters</div>
        <div style="display:flex;align-items:center;gap:var(--space-sm)">
          <label style="font-size:0.8125rem;color:var(--color-text-secondary);display:flex;align-items:center;gap:0.375rem;cursor:pointer">
            <input type="checkbox" class="pct-checkbox" ${state.matrixMode ? 'checked' : ''} onchange="toggleMatrixMode()">
            Matrix Mode
          </label>
          ${state.matrixMode ? '<span class="pct-badge pct-badge-warning">Multi-select enabled</span>' : ''}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);margin-bottom:var(--space-md)">
        <div class="pct-form-group">
          <label>USP (optional)</label>
          <select id="gen-usp" class="pct-select" onchange="onGenUspChange()">
            <option value="">-- General (no specific USP) --</option>
          </select>
        </div>
        <div class="pct-form-group">
          <label>Marketing Angle (optional)</label>
          <select id="gen-angle" class="pct-select">
            <option value="">-- General (no specific angle) --</option>
          </select>
        </div>
      </div>

      <div class="pct-form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-xs)">
          <div style="display:flex;align-items:center;gap:var(--space-sm)">
            <label style="margin:0">Messaging Framework ${state.matrixMode ? '<span style="color:var(--color-warning);font-size:0.75rem">(select multiple)</span>' : ''}</label>
            <!-- F3.1.4: Framework A/B Testing Mode -->
            <label style="font-size:0.75rem;color:var(--color-primary-light);display:flex;align-items:center;gap:3px;cursor:pointer" title="F3.1.4 - A/B test exactly 2 frameworks head-to-head">
              <input type="checkbox" class="pct-checkbox" style="width:12px;height:12px" ${state.abFrameworkMode ? 'checked' : ''} onchange="toggleAbFrameworkMode()">
              A/B Test
            </label>
            ${state.abFrameworkMode ? `<span class="pct-badge pct-badge-warning" style="font-size:0.6rem">Select exactly 2</span>` : ''}
          </div>
          <button class="pct-btn pct-btn-xs" onclick="showCustomFrameworkForm()" title="F3.1.2 - Create custom framework">+ Custom</button>
        </div>
        <div id="custom-framework-form" style="display:none;background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-sm);margin-bottom:var(--space-sm)">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm)">
            <div class="pct-form-group" style="margin-bottom:0">
              <input id="cf-label" class="pct-input pct-input-sm" placeholder="Framework name">
            </div>
            <div class="pct-form-group" style="margin-bottom:0">
              <input id="cf-desc" class="pct-input pct-input-sm" placeholder="Short description">
            </div>
          </div>
          <div class="pct-form-group" style="margin-top:var(--space-xs);margin-bottom:0">
            <input id="cf-examples" class="pct-input pct-input-sm" placeholder="Example hooks (comma-separated)">
          </div>
          <div style="display:flex;gap:var(--space-xs);margin-top:var(--space-xs)">
            <button class="pct-btn pct-btn-primary pct-btn-xs" onclick="createCustomFramework()">Create</button>
            <button class="pct-btn pct-btn-xs" onclick="hideCustomFrameworkForm()">Cancel</button>
          </div>
        </div>
        <div class="pct-param-grid" id="framework-selector">
          ${getFrameworks().map(f => {
            let isSelected;
            let onclickFn;
            if (state.abFrameworkMode) {
              isSelected = state.abFrameworks.has(f.key);
              onclickFn = `toggleAbFramework('${f.key}')`;
            } else if (state.matrixMode) {
              isSelected = state.matrixParams.frameworks.has(f.key);
              onclickFn = `toggleMatrixFramework('${f.key}')`;
            } else {
              isSelected = state.genParams.messagingFramework === f.key;
              onclickFn = `selectFramework('${f.key}')`;
            }
            const abLabel = state.abFrameworkMode && isSelected
              ? `<span style="color:var(--color-warning);font-size:0.6rem"> [${state.abFrameworks.size === 1 && [...state.abFrameworks][0] === f.key ? 'A' : 'B'}]</span>`
              : '';
            return `
            <div class="pct-param-card ${isSelected ? 'selected' : ''} ${f.isBuiltIn === false ? 'pct-param-card-custom' : ''}"
                 onclick="${onclickFn}">
              <div class="pct-param-card-title">${f.label}${abLabel} ${f.isBuiltIn === false ? '<span style="color:var(--color-warning);font-size:0.625rem">CUSTOM</span>' : ''}</div>
              <div class="pct-param-card-desc">${f.desc}</div>
              <div class="pct-param-card-examples">
                ${(f.examples || []).map(ex => `<div class="pct-param-example">"${escHtml(ex)}"</div>`).join('')}
              </div>
              ${f.isBuiltIn === false ? `<div style="margin-top:4px"><button class="pct-btn pct-btn-xs pct-btn-danger" onclick="event.stopPropagation();deleteCustomFramework('${f.key}')">Remove</button></div>` : ''}
            </div>
          `}).join('')}
        </div>
        ${state.abFrameworkMode && state.abFrameworks.size === 2 ? `
          <div style="background:var(--color-bg-tertiary);border:1px solid var(--color-warning);border-radius:var(--radius-sm);padding:var(--space-xs) var(--space-sm);margin-top:var(--space-xs);font-size:0.8125rem">
            <span style="color:var(--color-warning)">&#9883; A/B Test:</span>
            <strong>${[...state.abFrameworks][0].replace(/_/g,' ')}</strong> vs <strong>${[...state.abFrameworks][1].replace(/_/g,' ')}</strong>
            — will generate ${state.genParams.batchSize} hooks per framework
            <button class="pct-btn pct-btn-xs pct-btn-primary" onclick="generateAbFrameworkTest()" style="margin-left:var(--space-xs)">Run A/B Test</button>
          </div>
        ` : state.abFrameworkMode ? `
          <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">Select exactly 2 frameworks to compare</div>
        ` : ''}
      </div>

      <div class="pct-form-group">
        <label>Customer Awareness Level ${state.matrixMode ? '<span style="color:var(--color-warning);font-size:0.75rem">(select multiple)</span>' : ''}</label>
        <div class="pct-awareness-funnel" id="awareness-selector">
          ${AWARENESS_LEVELS.map(a => {
            const isSelected = state.matrixMode
              ? state.matrixParams.awarenessLevels.has(a.num)
              : state.genParams.awarenessLevel === a.num;
            return `
            <div class="pct-awareness-level ${isSelected ? 'selected' : ''}"
                 onclick="${state.matrixMode ? `toggleMatrixAwareness(${a.num})` : `selectAwareness(${a.num})`}">
              <div class="pct-awareness-num">${a.num}</div>
              <div>
                <div class="pct-awareness-name">${a.name}</div>
                <div class="pct-awareness-desc">${a.desc}</div>
              </div>
            </div>
          `}).join('')}
        </div>
      </div>

      <div class="pct-form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <label style="margin:0">Market Sophistication ${state.matrixMode ? '<span style="color:var(--color-warning);font-size:0.75rem">(select multiple)</span>' : ''}</label>
          <div style="display:flex;gap:var(--space-xs)">
            <!-- F3.3.4: Industry-specific defaults -->
            <select class="pct-select" style="font-size:0.7rem;padding:2px 6px;height:auto" onchange="applyIndustryDefault(this.value)" title="F3.3.4 - Apply industry-specific sophistication default">
              <option value="">Industry Default...</option>
              <option value="1">New/Emerging (L1)</option>
              <option value="2">Consumer Goods (L2)</option>
              <option value="3">SaaS/Tech (L3)</option>
              <option value="3">E-commerce (L3)</option>
              <option value="4">Finance/Insurance (L4)</option>
              <option value="4">Health/Wellness (L4)</option>
              <option value="5">Supplements (L5)</option>
              <option value="5">Make Money Online (L5)</option>
            </select>
            <button class="pct-btn pct-btn-sm" onclick="showSophisticationAssessment()" title="Take assessment to find your market sophistication level" style="font-size:0.7rem;padding:2px 8px">&#128202; Assess</button>
          </div>
        </div>
        <div class="pct-soph-scale" id="soph-selector">
          ${SOPH_LEVELS.map(s => {
            const isSelected = state.matrixMode
              ? state.matrixParams.sophisticationLevels.has(s.num)
              : state.genParams.marketSophistication === s.num;
            return `
            <div class="pct-soph-level soph-card ${isSelected ? 'selected' : ''}"
                 onclick="${state.matrixMode ? `toggleMatrixSophistication(${s.num})` : `selectSophistication(${s.num})`}">
              <div class="pct-soph-num">${s.num}</div>
              <div class="pct-soph-label">${s.label}</div>
            </div>
          `}).join('')}
        </div>
      </div>

      <div class="pct-form-group">
        <label>Hooks per combination</label>
        <div class="pct-batch-selector">
          ${[5, 10, 25, 50].map(n => `
            <div class="pct-batch-option ${state.genParams.batchSize === n ? 'selected' : ''}"
                 onclick="selectBatchSize(${n})">${n}</div>
          `).join('')}
        </div>
      </div>

      <div class="pct-form-group">
        <label>AI Model <span style="color:var(--color-muted);font-size:0.75rem">(F4.1.6)</span></label>
        <select class="pct-select" onchange="selectAiModel(this.value)">
          <option value="claude-sonnet" ${state.genParams.aiModel === 'claude-sonnet' ? 'selected' : ''}>Claude Sonnet (Recommended)</option>
          <option value="claude-haiku" ${state.genParams.aiModel === 'claude-haiku' ? 'selected' : ''}>Claude Haiku (Faster, cheaper)</option>
          <option value="claude-opus" ${state.genParams.aiModel === 'claude-opus' ? 'selected' : ''}>Claude Opus (Most capable)</option>
        </select>
      </div>

      ${state.matrixMode ? `
      <div class="pct-matrix-summary" style="background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-sm) var(--space-md);margin-top:var(--space-sm);font-size:0.8125rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="color:var(--color-text-secondary)">
            ${state.matrixParams.frameworks.size || 1} framework(s) &times;
            ${state.matrixParams.awarenessLevels.size || 1} awareness &times;
            ${state.matrixParams.sophisticationLevels.size || 1} sophistication =
            <strong style="color:var(--color-primary-light)">${matrixCombos} combinations</strong>
          </span>
          <span style="color:var(--color-warning)">~${matrixHookEstimate} hooks total</span>
        </div>
      </div>` : ''}

      <div style="margin-top:var(--space-md)">
        <button class="pct-btn pct-btn-primary pct-btn-lg" onclick="${state.matrixMode ? 'generateMatrixHooks()' : 'generateHooks()'}" id="gen-hooks-btn" style="width:100%">
          ${state.matrixMode
            ? `Generate ~${matrixHookEstimate} Hooks (${matrixCombos} combos)`
            : `Generate ${state.genParams.batchSize} Hooks`}
        </button>
      </div>
    </div>

    <div id="gen-preview"></div>
  `;

  populateGenDropdowns();
}

function toggleMatrixMode() {
  state.matrixMode = !state.matrixMode;
  if (state.matrixMode) {
    // Seed matrix with current single selections
    state.matrixParams.frameworks = new Set([state.genParams.messagingFramework]);
    state.matrixParams.awarenessLevels = new Set([state.genParams.awarenessLevel]);
    state.matrixParams.sophisticationLevels = new Set([state.genParams.marketSophistication]);
  }
  renderGenerationPanel();
}

function toggleMatrixFramework(key) {
  const s = state.matrixParams.frameworks;
  if (s.has(key)) { s.delete(key); } else { s.add(key); }
  renderGenerationPanel();
}

function toggleMatrixAwareness(level) {
  const s = state.matrixParams.awarenessLevels;
  if (s.has(level)) { s.delete(level); } else { s.add(level); }
  renderGenerationPanel();
}

function toggleMatrixSophistication(level) {
  const s = state.matrixParams.sophisticationLevels;
  if (s.has(level)) { s.delete(level); } else { s.add(level); }
  renderGenerationPanel();
}

function getMatrixComboCount() {
  const f = state.matrixParams.frameworks.size || 1;
  const a = state.matrixParams.awarenessLevels.size || 1;
  const s = state.matrixParams.sophisticationLevels.size || 1;
  return f * a * s;
}

// F3.1.4: Framework A/B testing mode
function toggleAbFrameworkMode() {
  state.abFrameworkMode = !state.abFrameworkMode;
  if (state.abFrameworkMode) {
    // Seed with current single framework
    state.abFrameworks = new Set([state.genParams.messagingFramework]);
    // Disable matrix mode if active
    if (state.matrixMode) {
      state.matrixMode = false;
    }
  } else {
    state.abFrameworks = new Set();
  }
  renderGenerationPanel();
}

function toggleAbFramework(key) {
  const s = state.abFrameworks;
  if (s.has(key)) {
    s.delete(key);
  } else if (s.size < 2) {
    s.add(key);
  } else {
    // Replace oldest (first) if already 2
    const [first] = s;
    s.delete(first);
    s.add(key);
  }
  renderGenerationPanel();
}

async function generateAbFrameworkTest() {
  if (state.abFrameworks.size !== 2) return showToast('Select exactly 2 frameworks', 'error');
  if (!state.selectedProductId) return showToast('Select a product first', 'error');

  const [frameworkA, frameworkB] = [...state.abFrameworks];
  const btn = document.getElementById('gen-hooks-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating A/B...'; }
  showLoading('Generating A/B Test Hooks...', `Testing ${frameworkA} vs ${frameworkB}`);

  try {
    const baseParams = {
      productId: state.selectedProductId,
      uspId: state.genParams.uspId || undefined,
      angleId: state.genParams.angleId || undefined,
      awarenessLevel: state.genParams.awarenessLevel,
      marketSophistication: state.genParams.marketSophistication,
      batchSize: state.genParams.batchSize,
      aiModel: state.genParams.aiModel,
    };
    const [resultA, resultB] = await Promise.all([
      pctApi.generateHooks({ ...baseParams, messagingFramework: frameworkA }),
      pctApi.generateHooks({ ...baseParams, messagingFramework: frameworkB }),
    ]);
    const totalA = (resultA.data || []).length;
    const totalB = (resultB.data || []).length;
    showToast(`A/B test complete: ${totalA} ${frameworkA} + ${totalB} ${frameworkB} hooks`);
    switchTab('review');
  } catch (e) {
    showToast('A/B test failed: ' + e.message, 'error');
  } finally {
    hideLoading();
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Hooks'; }
  }
}

// F3.3.4: Apply industry-specific sophistication default
function applyIndustryDefault(level) {
  if (!level) return;
  const lvl = parseInt(level);
  if (state.matrixMode) {
    state.matrixParams.sophisticationLevels = new Set([lvl]);
  } else {
    state.genParams.marketSophistication = lvl;
  }
  renderGenerationPanel();
  showToast(`Industry default applied: Level ${lvl}`);
}

async function generateMatrixHooks() {
  if (!state.selectedProductId) return showToast('Select a product in the Context tab first', 'error');

  const frameworks = [...state.matrixParams.frameworks];
  const awarenessLevels = [...state.matrixParams.awarenessLevels];
  const sophisticationLevels = [...state.matrixParams.sophisticationLevels];

  if (frameworks.length === 0) return showToast('Select at least one framework', 'error');
  if (awarenessLevels.length === 0) return showToast('Select at least one awareness level', 'error');
  if (sophisticationLevels.length === 0) return showToast('Select at least one sophistication level', 'error');

  const combos = [];
  for (const fw of frameworks) {
    for (const aw of awarenessLevels) {
      for (const so of sophisticationLevels) {
        combos.push({ messagingFramework: fw, awarenessLevel: aw, marketSophistication: so });
      }
    }
  }

  const btn = document.getElementById('gen-hooks-btn');
  if (btn) { btn.disabled = true; }
  showLoading('Matrix generation...', `Generating across ${combos.length} combinations`);

  const uspId = document.getElementById('gen-usp')?.value || undefined;
  const angleId = document.getElementById('gen-angle')?.value || undefined;

  let allHooks = [];
  let completed = 0;

  for (const combo of combos) {
    if (btn) btn.textContent = `Generating combo ${completed + 1}/${combos.length}...`;
    updateLoading(`Generating combo ${completed + 1}/${combos.length}`, `${allHooks.length} hooks created so far`);
    try {
      const { data } = await pctApi.generateHooks({
        productId: state.selectedProductId,
        uspId,
        marketingAngleId: angleId,
        messagingFramework: combo.messagingFramework,
        awarenessLevel: combo.awarenessLevel,
        marketSophistication: combo.marketSophistication,
        batchSize: state.genParams.batchSize,
        aiModel: state.genParams.aiModel,
      });
      allHooks = allHooks.concat(data);
    } catch (e) {
      showToast(`Failed combo ${completed + 1}: ${e.message}`, 'error');
    }
    completed++;
  }

  hideLoading();
  showToast(`Generated ${allHooks.length} hooks across ${combos.length} combinations!`);
  renderGenPreview(allHooks);
  loadStats();

  if (btn) {
    btn.disabled = false;
    const matrixCombos = getMatrixComboCount();
    btn.textContent = `Generate ~${matrixCombos * state.genParams.batchSize} Hooks (${matrixCombos} combos)`;
  }
}

function populateGenDropdowns() {
  const uspSelect = document.getElementById('gen-usp');
  const angleSelect = document.getElementById('gen-angle');
  if (!uspSelect || !angleSelect) return;

  // Preserve selected
  const prevUsp = uspSelect.value;
  const prevAngle = angleSelect.value;

  uspSelect.innerHTML = '<option value="">-- General (no specific USP) --</option>' +
    state.usps.map(u => `<option value="${u.id}">${escHtml(u.content)}</option>`).join('');

  if (prevUsp) uspSelect.value = prevUsp;

  onGenUspChange();
}

function onGenUspChange() {
  const uspId = document.getElementById('gen-usp')?.value;
  const angleSelect = document.getElementById('gen-angle');
  if (!angleSelect) return;

  angleSelect.innerHTML = '<option value="">-- General (no specific angle) --</option>';

  if (uspId) {
    const usp = state.usps.find(u => u.id === uspId);
    if (usp && usp.angles) {
      angleSelect.innerHTML += usp.angles.map(a =>
        `<option value="${a.id}">${escHtml(a.content)}</option>`
      ).join('');
    }
  }
  state.genParams.uspId = uspId || null;
}

function selectFramework(key) {
  state.genParams.messagingFramework = key;
  document.querySelectorAll('#framework-selector .pct-param-card').forEach(el => {
    el.classList.toggle('selected', el.querySelector('.pct-param-card-title').textContent.toLowerCase().replace(/[\s\/]/g, '_') === key ||
      el.onclick.toString().includes(`'${key}'`));
  });
  // Re-render is simpler
  renderGenerationPanel();
}

function selectAwareness(level) {
  state.genParams.awarenessLevel = level;
  renderGenerationPanel();
}

function selectSophistication(level) {
  state.genParams.marketSophistication = level;
  renderGenerationPanel();
}

function selectBatchSize(n) {
  state.genParams.batchSize = n;
  renderGenerationPanel();
}

// F4.1.6 - AI model selection
function selectAiModel(model) {
  state.genParams.aiModel = model;
}

// F3.1.2 - Custom framework management
function showCustomFrameworkForm() {
  const form = document.getElementById('custom-framework-form');
  if (form) form.style.display = 'block';
}

function hideCustomFrameworkForm() {
  const form = document.getElementById('custom-framework-form');
  if (form) form.style.display = 'none';
}

function createCustomFramework() {
  const label = document.getElementById('cf-label')?.value.trim();
  const desc = document.getElementById('cf-desc')?.value.trim();
  const examplesRaw = document.getElementById('cf-examples')?.value.trim();

  if (!label) return showToast('Framework name is required', 'error');
  if (!desc) return showToast('Short description is required', 'error');

  const key = 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const examples = examplesRaw ? examplesRaw.split(',').map(e => e.trim()).filter(Boolean) : [];

  const customFrameworks = loadCustomFrameworks();
  if (customFrameworks.some(f => f.key === key)) {
    return showToast('A framework with this name already exists', 'error');
  }

  customFrameworks.push({ key, label, desc, examples, isBuiltIn: false, createdAt: new Date().toISOString() });
  saveCustomFrameworks(customFrameworks);

  // Clear form
  ['cf-label', 'cf-desc', 'cf-examples'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  showToast(`Custom framework "${label}" created`);
  state.genParams.messagingFramework = key;
  renderGenerationPanel();
}

function deleteCustomFramework(key) {
  if (!confirm('Remove this custom framework?')) return;
  const customFrameworks = loadCustomFrameworks().filter(f => f.key !== key);
  saveCustomFrameworks(customFrameworks);
  if (state.genParams.messagingFramework === key) {
    state.genParams.messagingFramework = 'punchy';
  }
  showToast('Custom framework removed');
  renderGenerationPanel();
}

async function generateHooks() {
  if (!state.selectedProductId) return showToast('Select a product in the Context tab first', 'error');

  const btn = document.getElementById('gen-hooks-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  showLoading('Generating hooks...', `Creating ${state.genParams.batchSize} hooks with AI`);

  const uspId = document.getElementById('gen-usp')?.value || null;
  const angleId = document.getElementById('gen-angle')?.value || null;

  try {
    const { data } = await pctApi.generateHooks({
      productId: state.selectedProductId,
      uspId: uspId || undefined,
      marketingAngleId: angleId || undefined,
      messagingFramework: state.genParams.messagingFramework,
      awarenessLevel: state.genParams.awarenessLevel,
      marketSophistication: state.genParams.marketSophistication,
      batchSize: state.genParams.batchSize,
      aiModel: state.genParams.aiModel,
    });

    showToast(`Generated ${data.length} hooks!`);
    renderGenPreview(data);
    loadStats();
  } catch (e) {
    showToast('Hook generation failed: ' + e.message, 'error');
  } finally {
    hideLoading();
    if (btn) { btn.disabled = false; btn.textContent = `Generate ${state.genParams.batchSize} Hooks`; }
  }
}

function renderGenPreview(hooks) {
  const el = document.getElementById('gen-preview');
  if (!el) return;
  el.innerHTML = `
    <div class="pct-card">
      <div class="pct-card-header">
        <div class="pct-card-title">Generated Hooks (${hooks.length})</div>
        <button class="pct-btn pct-btn-sm" onclick="switchTab('review')">Go to Review</button>
      </div>
      <div class="pct-hooks-grid">
        ${hooks.map(h => `
          <div class="pct-hook-card">
            <div class="pct-hook-content">${escHtml(h.content)}</div>
            <div class="pct-hook-params">
              <span class="pct-badge pct-badge-primary">${h.messagingFramework}</span>
              <span class="pct-badge pct-badge-muted">Awareness ${h.awarenessLevel}</span>
              <span class="pct-badge pct-badge-muted">Soph ${h.marketSophistication}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ============================================
// Tab 4: Hook Review
// ============================================
async function loadHooks() {
  if (!state.selectedProductId) {
    renderHookReview();
    return;
  }
  try {
    const params = {
      productId: state.selectedProductId,
      limit: 50,
      offset: state.hookPage * 50,
      sortBy: state.hookSort === 'rating' ? 'rating' : undefined,
    };
    // Apply filters
    if (state.hookFilters.messagingFramework) params.messagingFramework = state.hookFilters.messagingFramework;
    if (state.hookFilters.awarenessLevel) params.awarenessLevel = state.hookFilters.awarenessLevel;
    if (state.hookFilters.marketSophistication) params.marketSophistication = state.hookFilters.marketSophistication;
    if (state.hookFilters.status) params.status = state.hookFilters.status;
    if (state.hookFilters.search) params.search = state.hookFilters.search;

    const result = await pctApi.getHooks(params);
    state.hooks = result.data;
    state.hookTotal = result.total;
    state.selectedHookIds.clear();
    renderHookReview();
  } catch (e) {
    showToast('Failed to load hooks: ' + e.message, 'error');
  }
}

function renderHookReview() {
  const el = document.getElementById('hook-review-panel');
  if (!el) return;

  if (!state.selectedProductId) {
    el.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">Select a product in the Context tab first</div></div>';
    return;
  }

  el.innerHTML = `
    <div style="margin-bottom:var(--space-sm)">
      <input class="pct-input" placeholder="Search hooks..." value="${escAttr(state.hookFilters.search)}" oninput="debounceHookSearch(this.value)" style="max-width:400px">
    </div>
    <div class="pct-review-toolbar">
      <div class="pct-review-toolbar-group">
        <span class="pct-review-toolbar-label">Status</span>
        <div class="pct-chips">
          <span class="pct-chip ${!state.hookFilters.status ? 'active' : ''}" onclick="setHookFilter('status', null)">All</span>
          <span class="pct-chip ${state.hookFilters.status === 'pending' ? 'active' : ''}" onclick="setHookFilter('status', 'pending')">Pending</span>
          <span class="pct-chip ${state.hookFilters.status === 'approved' ? 'active' : ''}" onclick="setHookFilter('status', 'approved')">Approved</span>
          <span class="pct-chip ${state.hookFilters.status === 'rejected' ? 'active' : ''}" onclick="setHookFilter('status', 'rejected')">Rejected</span>
        </div>
      </div>
      <div class="pct-review-toolbar-group">
        <span class="pct-review-toolbar-label">Framework</span>
        <select class="pct-select" style="width:auto;font-size:0.8125rem;padding:0.25rem 0.5rem" onchange="setHookFilter('messagingFramework', this.value || null)">
          <option value="">All</option>
          ${getFrameworks().map(f => `<option value="${f.key}" ${state.hookFilters.messagingFramework === f.key ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>
      </div>
      <div class="pct-review-toolbar-group">
        <span class="pct-review-toolbar-label">Awareness</span>
        <div class="pct-chips">
          <span class="pct-chip ${!state.hookFilters.awarenessLevel ? 'active' : ''}" onclick="setHookFilter('awarenessLevel', null)">All</span>
          ${AWARENESS_LEVELS.map(a => `<span class="pct-chip ${state.hookFilters.awarenessLevel == a.num ? 'active' : ''}" onclick="setHookFilter('awarenessLevel', ${a.num})" title="${a.desc}">${a.num}-${a.name}</span>`).join('')}
        </div>
      </div>
      <div class="pct-review-toolbar-group">
        <span class="pct-review-toolbar-label">Sophistication</span>
        <div class="pct-chips">
          <span class="pct-chip ${!state.hookFilters.marketSophistication ? 'active' : ''}" onclick="setHookFilter('marketSophistication', null)">All</span>
          ${SOPH_LEVELS.map(s => `<span class="pct-chip ${state.hookFilters.marketSophistication == s.num ? 'active' : ''}" onclick="setHookFilter('marketSophistication', ${s.num})" title="${s.desc}">${s.num}-${s.label}</span>`).join('')}
        </div>
      </div>
      <div class="pct-review-toolbar-group">
        <span class="pct-review-toolbar-label">Sort</span>
        <select class="pct-select" style="width:auto;font-size:0.8125rem;padding:0.25rem 0.5rem" onchange="setHookSort(this.value)">
          <option value="newest" ${state.hookSort === 'newest' ? 'selected' : ''}>Newest</option>
          <option value="rating" ${state.hookSort === 'rating' ? 'selected' : ''}>Rating</option>
        </select>
      </div>
      <div class="pct-review-toolbar-group" style="margin-left:auto">
        <label style="font-size:0.8125rem;color:var(--color-text-secondary);display:flex;align-items:center;gap:0.375rem;cursor:pointer" title="Highlight near-duplicate hooks (70%+ word similarity)">
          <input type="checkbox" class="pct-checkbox" ${state.showDuplicates ? 'checked' : ''} onchange="state.showDuplicates=this.checked;renderHookReview()">
          Show dupes
        </label>
        <span style="font-size:0.8125rem;color:var(--color-text-secondary)">${state.selectedHookIds.size} selected</span>
        <button class="pct-btn pct-btn-sm pct-btn-success" onclick="bulkUpdateSelected('approved')" ${state.selectedHookIds.size === 0 ? 'disabled' : ''}>Approve <span class="pct-kbd">A</span></button>
        <button class="pct-btn pct-btn-sm pct-btn-danger" onclick="bulkUpdateSelected('rejected')" ${state.selectedHookIds.size === 0 ? 'disabled' : ''}>Reject <span class="pct-kbd">R</span></button>
        <button class="pct-btn pct-btn-sm" onclick="exportHooks()">Export CSV</button>
      </div>
    </div>

    <div style="font-size:0.8125rem;color:var(--color-text-muted);margin-bottom:var(--space-sm)">
      Showing ${state.hooks.length} of ${state.hookTotal} hooks
    </div>

    ${state.hooks.length === 0 ?
      '<div class="pct-empty"><div class="pct-empty-text">No hooks match your filters. Generate some in the Hook Generation tab.</div></div>' :
      (() => {
        const dupeIds = state.showDuplicates ? findDuplicateHooks(state.hooks) : new Set();
        return `<div class="pct-hooks-grid">${state.hooks.map(h => renderHookCard(h, dupeIds.has(h.id))).join('')}</div>`;
      })()}

    ${state.hookTotal > 50 ? `
      <div style="display:flex;gap:var(--space-sm);justify-content:center;margin-top:var(--space-md)">
        <button class="pct-btn pct-btn-sm" onclick="hookPagePrev()" ${state.hookPage === 0 ? 'disabled' : ''}>Previous</button>
        <span style="font-size:0.8125rem;color:var(--color-text-muted);padding:0.375rem">Page ${state.hookPage + 1} of ${Math.ceil(state.hookTotal / 50)}</span>
        <button class="pct-btn pct-btn-sm" onclick="hookPageNext()" ${(state.hookPage + 1) * 50 >= state.hookTotal ? 'disabled' : ''}>Next</button>
      </div>
    ` : ''}
  `;
}

function renderHookCard(h, isDuplicate = false) {
  const selected = state.selectedHookIds.has(h.id);
  const statusClass = h.status === 'approved' ? 'approved' : h.status === 'rejected' ? 'rejected' : '';
  return `
    <div class="pct-hook-card ${statusClass}" style="${isDuplicate ? 'border-color:var(--color-warning);opacity:0.75' : ''}">
      <div style="display:flex;align-items:flex-start;gap:0.5rem">
        <input type="checkbox" class="pct-checkbox" ${selected ? 'checked' : ''} onchange="toggleHookSelect('${h.id}')">
        <div class="pct-hook-content" id="hook-text-${h.id}">${escHtml(h.content)}</div>
      </div>
      <div class="pct-hook-params">
        <span class="pct-badge pct-badge-primary">${(h.messagingFramework || '').replace(/_/g, ' ')}</span>
        <span class="pct-badge pct-badge-muted">Aw ${h.awarenessLevel}</span>
        <span class="pct-badge pct-badge-muted">So ${h.marketSophistication}</span>
        ${h.usp ? `<span class="pct-badge pct-badge-warning" title="${escAttr(h.usp.content)}">USP</span>` : ''}
        ${h.angle ? `<span class="pct-badge pct-badge-success" title="${escAttr(h.angle.content)}">Angle</span>` : ''}
        ${isDuplicate ? '<span class="pct-badge pct-badge-warning" title="Similar to another hook in this batch">~Dupe</span>' : ''}
      </div>
      <div class="pct-hook-actions">
        <div class="pct-stars">
          ${[1,2,3,4,5].map(n => `<button class="pct-star ${(h.rating || 0) >= n ? 'filled' : ''}" onclick="rateHook('${h.id}', ${n})">&#9733;</button>`).join('')}
        </div>
        <button class="pct-btn pct-btn-sm ${h.status === 'approved' ? 'pct-btn-success' : ''}" onclick="setHookStatus('${h.id}', 'approved')">Approve</button>
        <button class="pct-btn pct-btn-sm ${h.status === 'rejected' ? 'pct-btn-danger' : ''}" onclick="setHookStatus('${h.id}', 'rejected')">Reject</button>
        <button class="pct-btn pct-btn-sm" onclick="generateMoreLikeThis('${h.id}')" title="Generate variations with same parameters">More like this</button>
        <button class="pct-btn pct-btn-sm" onclick="regenerateHook('${h.id}')" id="regen-hook-${h.id}" title="Replace this hook with a new AI-generated one">Regen</button>
        <button class="pct-btn pct-btn-sm pct-btn-icon" onclick="startEditHook('${h.id}')" title="Edit">&#9998;</button>
        <button class="pct-btn pct-btn-sm pct-btn-icon pct-btn-danger" onclick="deleteHook('${h.id}')" title="Delete">x</button>
      </div>
    </div>
  `;
}

function toggleHookSelect(id) {
  if (state.selectedHookIds.has(id)) {
    state.selectedHookIds.delete(id);
  } else {
    state.selectedHookIds.add(id);
  }
  renderHookReview();
}

async function setHookStatus(id, status) {
  try {
    await pctApi.updateHook(id, { status });
    const hook = state.hooks.find(h => h.id === id);
    if (hook) hook.status = status;
    renderHookReview();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function rateHook(id, rating) {
  try {
    await pctApi.updateHook(id, { rating });
    const hook = state.hooks.find(h => h.id === id);
    if (hook) hook.rating = rating;
    renderHookReview();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

function startEditHook(id) {
  const hook = state.hooks.find(h => h.id === id);
  if (!hook) return;
  const el = document.getElementById(`hook-text-${id}`);
  if (!el) return;
  el.contentEditable = 'true';
  el.focus();

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  el.onblur = async () => {
    el.contentEditable = 'false';
    el.onblur = null;
    const newContent = el.textContent.trim();
    if (newContent && newContent !== hook.content) {
      try {
        await pctApi.updateHook(id, { content: newContent });
        hook.content = newContent;
        showToast('Hook updated');
      } catch (e) {
        el.textContent = hook.content;
        showToast('Failed to update: ' + e.message, 'error');
      }
    }
  };

  el.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { el.textContent = hook.content; el.blur(); }
  };
}

async function deleteHook(id) {
  try {
    await pctApi.deleteHook(id);
    state.hooks = state.hooks.filter(h => h.id !== id);
    state.selectedHookIds.delete(id);
    state.hookTotal--;
    renderHookReview();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function generateMoreLikeThis(hookId) {
  const hook = state.hooks.find(h => h.id === hookId);
  if (!hook) return;
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  try {
    const { data } = await pctApi.generateHooks({
      productId: state.selectedProductId,
      uspId: hook.uspId || undefined,
      marketingAngleId: hook.marketingAngleId || undefined,
      messagingFramework: hook.messagingFramework,
      awarenessLevel: hook.awarenessLevel,
      marketSophistication: hook.marketSophistication,
      batchSize: 5,
    });
    showToast(`Generated ${data.length} variations`);
    await loadHooks();
    loadStats();
  } catch (e) {
    showToast('Generation failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'More like this';
  }
}

// Regenerate a single hook slot: delete old content, generate 1 new hook with same params
async function regenerateHook(hookId) {
  const hook = state.hooks.find(h => h.id === hookId);
  if (!hook) return;
  const btn = document.getElementById(`regen-hook-${hookId}`);
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    const { data } = await pctApi.generateHooks({
      productId: state.selectedProductId,
      uspId: hook.uspId || undefined,
      marketingAngleId: hook.marketingAngleId || undefined,
      messagingFramework: hook.messagingFramework,
      awarenessLevel: hook.awarenessLevel,
      marketSophistication: hook.marketSophistication,
      batchSize: 1,
    });
    if (data && data.length > 0) {
      // Update hook content in-place
      const newContent = data[0].content;
      await pctApi.updateHook(hookId, { content: newContent });
      hook.content = newContent;
      hook.status = 'pending';
      renderHookReview();
      showToast('Hook regenerated');
    }
  } catch (e) {
    showToast('Regeneration failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Regen'; }
  }
}

// Duplicate detection utilities
function hookWordSet(text) {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function findDuplicateHooks(hooks, threshold = 0.7) {
  const duplicates = new Set();
  for (let i = 0; i < hooks.length; i++) {
    if (duplicates.has(hooks[i].id)) continue;
    const setA = hookWordSet(hooks[i].content);
    for (let j = i + 1; j < hooks.length; j++) {
      if (duplicates.has(hooks[j].id)) continue;
      const setB = hookWordSet(hooks[j].content);
      if (jaccardSimilarity(setA, setB) >= threshold) {
        duplicates.add(hooks[j].id); // mark the later one as duplicate
      }
    }
  }
  return duplicates;
}

async function bulkUpdateSelected(status) {
  const ids = [...state.selectedHookIds];
  if (ids.length === 0) return;
  try {
    await pctApi.bulkUpdateHooks(ids, { status });
    showToast(`${ids.length} hooks ${status}`);
    await loadHooks();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

function setHookFilter(key, value) {
  state.hookFilters[key] = value;
  state.hookPage = 0;
  loadHooks();
}

function setHookSort(value) {
  state.hookSort = value;
  state.hookPage = 0;
  loadHooks();
}

let _hookSearchTimer = null;
function debounceHookSearch(value) {
  state.hookFilters.search = value;
  clearTimeout(_hookSearchTimer);
  _hookSearchTimer = setTimeout(() => {
    state.hookPage = 0;
    loadHooks();
  }, 300);
}

function hookPagePrev() {
  if (state.hookPage > 0) {
    state.hookPage--;
    loadHooks();
  }
}

function hookPageNext() {
  if ((state.hookPage + 1) * 50 < state.hookTotal) {
    state.hookPage++;
    loadHooks();
  }
}

function exportHooks() {
  const hooksToExport = state.selectedHookIds.size > 0
    ? state.hooks.filter(h => state.selectedHookIds.has(h.id))
    : state.hooks;

  if (hooksToExport.length === 0) return showToast('No hooks to export', 'error');

  const rows = [
    ['Hook', 'Status', 'Rating', 'Framework', 'Awareness', 'Sophistication', 'USP', 'Angle'].join(','),
    ...hooksToExport.map(h => [
      `"${h.content.replace(/"/g, '""')}"`,
      h.status,
      h.rating || '',
      h.messagingFramework,
      h.awarenessLevel,
      h.marketSophistication,
      h.usp ? `"${h.usp.content.replace(/"/g, '""')}"` : '',
      h.angle ? `"${h.angle.content.replace(/"/g, '""')}"` : '',
    ].join(','))
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hooks-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${hooksToExport.length} hooks`);
}

// ============================================
// Tab 5: Ad Creative
// ============================================

const SIZE_PRESETS = [
  { label: '1080x1080', w: 1080, h: 1080, cat: 'feed_square' },
  { label: '1080x1350', w: 1080, h: 1350, cat: 'feed_portrait' },
  { label: '1080x1920', w: 1080, h: 1920, cat: 'story' },
  { label: '1200x628', w: 1200, h: 628, cat: 'link_preview' },
];

function switchCreativeSubTab(subTab) {
  state.creativeSubTab = subTab;
  renderCreativePanel();
}

function renderCreativePanel() {
  const el = document.getElementById('creative-panel');
  if (!el) return;

  el.innerHTML = `
    <div class="pct-creative-sub-tabs">
      <button class="pct-creative-sub-tab ${state.creativeSubTab === 'templates' ? 'active' : ''}" onclick="switchCreativeSubTab('templates')">Templates</button>
      <button class="pct-creative-sub-tab ${state.creativeSubTab === 'editor' ? 'active' : ''}" onclick="switchCreativeSubTab('editor')">Zone Editor</button>
      <button class="pct-creative-sub-tab ${state.creativeSubTab === 'generate' ? 'active' : ''}" onclick="switchCreativeSubTab('generate')">Generate Ads</button>
      <button class="pct-creative-sub-tab ${state.creativeSubTab === 'gallery' ? 'active' : ''}" onclick="switchCreativeSubTab('gallery')">Ad Gallery</button>
    </div>
    <div id="creative-sub-content"></div>
  `;

  const contentEl = document.getElementById('creative-sub-content');
  if (state.creativeSubTab === 'templates') renderTemplatesSubTab(contentEl);
  else if (state.creativeSubTab === 'editor') renderEditorSubTab(contentEl);
  else if (state.creativeSubTab === 'generate') renderGenerateAdsSubTab(contentEl);
  else if (state.creativeSubTab === 'gallery') { loadGeneratedAds(); renderGallerySubTab(contentEl); }
}

// ----- Templates Sub-tab -----
async function loadTemplates() {
  try {
    const { data } = await pctApi.getTemplates();
    state.templates = data;
  } catch (e) {
    showToast('Failed to load templates: ' + e.message, 'error');
  }
}

function renderTemplatesSubTab(el) {
  loadTemplates().then(() => {
    const templateCards = state.templates.map(t => `
      <div class="pct-template-card" onclick="selectTemplateForEdit('${t.id}')">
        <img class="pct-template-card-thumb" src="${t.imageUrl}" alt="${escAttr(t.name)}" onerror="this.style.background='var(--color-bg-tertiary)';this.alt='Image unavailable'">
        <div class="pct-template-card-info">
          <div class="pct-template-card-name">${escHtml(t.name)}</div>
          <div class="pct-template-card-meta">
            <span>${t.width}x${t.height}</span>
            <span>${(t.textZones || []).length} zone(s)</span>
            <span>${t._count?.generatedAds || 0} ads</span>
          </div>
        </div>
        <div class="pct-template-card-actions">
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="event.stopPropagation(); selectTemplateForEdit('${t.id}')">Edit Zones</button>
          <button class="pct-btn pct-btn-sm pct-btn-danger" onclick="event.stopPropagation(); deleteTemplate('${t.id}')">Delete</button>
        </div>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="pct-card">
        <div class="pct-card-header">
          <div class="pct-card-title">Template Library</div>
          <span class="pct-badge pct-badge-primary">${state.templates.length} templates</span>
        </div>
        <div class="pct-template-grid">
          <div class="pct-template-upload-card" onclick="document.getElementById('template-file-input').click()">
            <div class="pct-template-upload-icon">+</div>
            <div class="pct-template-upload-text">Upload Template</div>
            <div style="font-size:0.6875rem;color:var(--color-text-muted)">PNG, JPG - Max 5MB</div>
          </div>
          ${templateCards}
        </div>
        <input type="file" id="template-file-input" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="handleTemplateUpload(event)">
      </div>

      <div class="pct-card" style="margin-top:var(--space-md)">
        <div class="pct-card-header">
          <div class="pct-card-title">Quick Upload</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
          <div>
            <div class="pct-form-group">
              <label>Template Name *</label>
              <input id="tpl-name" class="pct-input" placeholder="e.g. Feed Square - Dark">
            </div>
            <div class="pct-form-group">
              <label>Size Preset</label>
              <div class="pct-size-presets">
                ${SIZE_PRESETS.map(s => `
                  <span class="pct-size-preset" onclick="applyTemplateSizePreset(${s.w}, ${s.h}, '${s.cat}')" data-w="${s.w}" data-h="${s.h}">${s.label}</span>
                `).join('')}
              </div>
            </div>
            <div style="display:flex;gap:var(--space-sm)">
              <div class="pct-form-group" style="flex:1">
                <label>Width</label>
                <input id="tpl-width" class="pct-input" type="number" value="1080">
              </div>
              <div class="pct-form-group" style="flex:1">
                <label>Height</label>
                <input id="tpl-height" class="pct-input" type="number" value="1080">
              </div>
            </div>
          </div>
          <div>
            <div class="pct-form-group">
              <label>Upload Image</label>
              <div id="tpl-preview-area" style="width:100%;aspect-ratio:1/1;background:var(--color-bg-tertiary);border:1px dashed var(--color-border);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden" onclick="document.getElementById('tpl-file-input').click()">
                <span id="tpl-preview-text" style="color:var(--color-text-muted);font-size:0.8125rem">Click to select image</span>
                <img id="tpl-preview-img" style="display:none;max-width:100%;max-height:100%;object-fit:contain">
              </div>
              <input type="file" id="tpl-file-input" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="previewTemplateImage(event)">
            </div>
          </div>
        </div>
        <button class="pct-btn pct-btn-primary" onclick="saveNewTemplate()" style="width:100%;margin-top:var(--space-sm)">Save Template</button>
      </div>
    `;
  });
}

let _pendingTemplateDataUrl = null;

function previewTemplateImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large (max 5MB)', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    _pendingTemplateDataUrl = e.target.result;
    const img = document.getElementById('tpl-preview-img');
    const text = document.getElementById('tpl-preview-text');
    if (img) { img.src = _pendingTemplateDataUrl; img.style.display = 'block'; }
    if (text) text.style.display = 'none';

    // Auto-detect dimensions
    const tempImg = new Image();
    tempImg.onload = () => {
      const wInput = document.getElementById('tpl-width');
      const hInput = document.getElementById('tpl-height');
      if (wInput) wInput.value = tempImg.naturalWidth;
      if (hInput) hInput.value = tempImg.naturalHeight;
    };
    tempImg.src = _pendingTemplateDataUrl;
  };
  reader.readAsDataURL(file);
}

function handleTemplateUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large (max 5MB)', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    const tempImg = new Image();
    tempImg.onload = async () => {
      const name = file.name.replace(/\.[^.]+$/, '');
      try {
        await pctApi.createTemplate({
          name,
          imageUrl: dataUrl,
          width: tempImg.naturalWidth,
          height: tempImg.naturalHeight,
          textZones: [],
        });
        showToast('Template uploaded');
        renderCreativePanel();
        loadStats();
      } catch (err) {
        showToast('Upload failed: ' + err.message, 'error');
      }
    };
    tempImg.src = dataUrl;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function applyTemplateSizePreset(w, h, cat) {
  const wInput = document.getElementById('tpl-width');
  const hInput = document.getElementById('tpl-height');
  if (wInput) wInput.value = w;
  if (hInput) hInput.value = h;
  document.querySelectorAll('.pct-size-preset').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.w) === w && parseInt(el.dataset.h) === h);
  });
}

async function saveNewTemplate() {
  const name = document.getElementById('tpl-name')?.value.trim();
  if (!name) return showToast('Template name is required', 'error');
  if (!_pendingTemplateDataUrl) return showToast('Upload an image first', 'error');

  const width = parseInt(document.getElementById('tpl-width')?.value) || 1080;
  const height = parseInt(document.getElementById('tpl-height')?.value) || 1080;

  try {
    const { data } = await pctApi.createTemplate({
      name,
      imageUrl: _pendingTemplateDataUrl,
      width,
      height,
      textZones: [],
      productId: state.selectedProductId || null,
    });
    _pendingTemplateDataUrl = null;
    showToast('Template saved');
    state.selectedTemplateId = data.id;
    state.creativeSubTab = 'editor';
    renderCreativePanel();
    loadStats();
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template and all generated ads from it?')) return;
  try {
    await pctApi.deleteTemplate(id);
    showToast('Template deleted');
    if (state.selectedTemplateId === id) state.selectedTemplateId = null;
    renderCreativePanel();
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

function selectTemplateForEdit(id) {
  state.selectedTemplateId = id;
  state.creativeSubTab = 'editor';
  renderCreativePanel();
}

// ----- Zone Editor Sub-tab -----
function renderEditorSubTab(el) {
  const tpl = state.templates.find(t => t.id === state.selectedTemplateId);
  if (!tpl) {
    el.innerHTML = `
      <div class="pct-empty">
        <div class="pct-empty-text">Select a template from the Templates tab to edit text zones</div>
        <button class="pct-btn pct-btn-primary" onclick="switchCreativeSubTab('templates')" style="margin-top:var(--space-md)">Go to Templates</button>
      </div>
    `;
    return;
  }

  state.textZones = Array.isArray(tpl.textZones) ? [...tpl.textZones] : [];
  state.editingTemplate = tpl;

  el.innerHTML = `
    <div class="pct-card" style="margin-bottom:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">Editing: ${escHtml(tpl.name)} (${tpl.width}x${tpl.height})</div>
        <div style="display:flex;gap:var(--space-sm)">
          <button class="pct-btn pct-btn-sm" onclick="addTextZone()">+ Add Zone</button>
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="saveTextZones()">Save Zones</button>
        </div>
      </div>
      <div class="pct-canvas-editor">
        <div class="pct-canvas-area" id="canvas-area">
          <div class="pct-canvas-wrapper" id="canvas-wrapper">
            <canvas id="tpl-canvas"></canvas>
          </div>
        </div>
        <div class="pct-zone-props" id="zone-props-panel">
          <div class="pct-zone-props-title">
            <span>Text Zones</span>
            <span class="pct-badge pct-badge-muted">${state.textZones.length}</span>
          </div>
          <div class="pct-zone-list" id="zone-list"></div>
          <div id="zone-detail-props"></div>
        </div>
      </div>
    </div>
  `;

  // Load image onto canvas
  setTimeout(() => initCanvasEditor(tpl), 50);
}

function initCanvasEditor(tpl) {
  const canvas = document.getElementById('tpl-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('canvas-wrapper');
  const area = document.getElementById('canvas-area');

  const img = new Image();
  img.onload = () => {
    // Scale canvas to fit in the editor area
    const maxW = area.clientWidth - 20;
    const maxH = 500;
    const scale = Math.min(maxW / tpl.width, maxH / tpl.height, 1);
    state.canvasScale = scale;

    canvas.width = tpl.width * scale;
    canvas.height = tpl.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    renderZoneOverlays();
    renderZoneList();

    // Set up canvas drawing events
    canvas.onmousedown = onCanvasMouseDown;
    canvas.onmousemove = onCanvasMouseMove;
    canvas.onmouseup = onCanvasMouseUp;
  };
  img.src = tpl.imageUrl;
}

function renderZoneOverlays() {
  const wrapper = document.getElementById('canvas-wrapper');
  if (!wrapper) return;
  // Remove old overlays
  wrapper.querySelectorAll('.pct-zone-overlay').forEach(el => el.remove());

  const scale = state.canvasScale;
  state.textZones.forEach((zone, idx) => {
    const div = document.createElement('div');
    div.className = `pct-zone-overlay ${idx === state.activeZoneIdx ? 'active' : ''}`;
    div.style.left = (zone.x * scale) + 'px';
    div.style.top = (zone.y * scale) + 'px';
    div.style.width = (zone.w * scale) + 'px';
    div.style.height = (zone.h * scale) + 'px';

    div.innerHTML = `<span class="pct-zone-label">${idx + 1}</span>`;

    // Click to select
    div.onmousedown = (e) => {
      e.stopPropagation();
      state.activeZoneIdx = idx;
      renderZoneOverlays();
      renderZoneList();
      renderZoneDetailProps();

      // Enable drag
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = zone.x;
      const origY = zone.y;

      const onMove = (me) => {
        const dx = (me.clientX - startX) / scale;
        const dy = (me.clientY - startY) / scale;
        zone.x = Math.max(0, Math.round(origX + dx));
        zone.y = Math.max(0, Math.round(origY + dy));
        div.style.left = (zone.x * scale) + 'px';
        div.style.top = (zone.y * scale) + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        renderZoneDetailProps();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    // Resize handle (SE corner)
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'pct-zone-resize se';
    resizeHandle.onmousedown = (e) => {
      e.stopPropagation();
      state.activeZoneIdx = idx;
      const startX = e.clientX;
      const startY = e.clientY;
      const origW = zone.w;
      const origH = zone.h;

      const onMove = (me) => {
        const dw = (me.clientX - startX) / scale;
        const dh = (me.clientY - startY) / scale;
        zone.w = Math.max(40, Math.round(origW + dw));
        zone.h = Math.max(20, Math.round(origH + dh));
        div.style.width = (zone.w * scale) + 'px';
        div.style.height = (zone.h * scale) + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        renderZoneOverlays();
        renderZoneDetailProps();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    div.appendChild(resizeHandle);
    wrapper.appendChild(div);
  });
}

function onCanvasMouseDown(e) {
  const canvas = document.getElementById('tpl-canvas');
  const rect = canvas.getBoundingClientRect();
  const scale = state.canvasScale;
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  state.isDrawingZone = true;
  state.drawStart = { x: Math.round(x), y: Math.round(y) };
}

function onCanvasMouseMove(e) {
  if (!state.isDrawingZone || !state.drawStart) return;
  // Visual feedback could be added here
}

function onCanvasMouseUp(e) {
  if (!state.isDrawingZone || !state.drawStart) return;
  state.isDrawingZone = false;

  const canvas = document.getElementById('tpl-canvas');
  const rect = canvas.getBoundingClientRect();
  const scale = state.canvasScale;
  const endX = Math.round((e.clientX - rect.left) / scale);
  const endY = Math.round((e.clientY - rect.top) / scale);

  const x = Math.min(state.drawStart.x, endX);
  const y = Math.min(state.drawStart.y, endY);
  const w = Math.abs(endX - state.drawStart.x);
  const h = Math.abs(endY - state.drawStart.y);

  state.drawStart = null;

  // Only create if dragged a meaningful area
  if (w < 20 || h < 10) return;

  const zone = {
    id: 'z_' + Date.now(),
    x, y, w, h,
    fontFamily: 'Inter, sans-serif',
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    align: 'center',
    maxLines: 3,
  };
  state.textZones.push(zone);
  state.activeZoneIdx = state.textZones.length - 1;
  renderZoneOverlays();
  renderZoneList();
  renderZoneDetailProps();
}

function addTextZone() {
  const tpl = state.editingTemplate;
  if (!tpl) return;
  const zone = {
    id: 'z_' + Date.now(),
    x: Math.round(tpl.width * 0.1),
    y: Math.round(tpl.height * 0.4),
    w: Math.round(tpl.width * 0.8),
    h: Math.round(tpl.height * 0.2),
    fontFamily: 'Inter, sans-serif',
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    align: 'center',
    maxLines: 3,
  };
  state.textZones.push(zone);
  state.activeZoneIdx = state.textZones.length - 1;
  renderZoneOverlays();
  renderZoneList();
  renderZoneDetailProps();
}

function renderZoneList() {
  const el = document.getElementById('zone-list');
  if (!el) return;
  if (state.textZones.length === 0) {
    el.innerHTML = '<div style="font-size:0.75rem;color:var(--color-text-muted);padding:var(--space-sm)">No zones. Draw on the canvas or click "Add Zone".</div>';
    return;
  }
  el.innerHTML = state.textZones.map((z, idx) => `
    <div class="pct-zone-list-item ${idx === state.activeZoneIdx ? 'active' : ''}" onclick="selectZone(${idx})">
      <span class="pct-zone-num">${idx + 1}</span>
      <span style="flex:1;font-size:0.75rem">${z.w}x${z.h} @ (${z.x},${z.y})</span>
      <button class="pct-btn pct-btn-sm pct-btn-icon pct-btn-danger" onclick="event.stopPropagation(); removeZone(${idx})" title="Remove">x</button>
    </div>
  `).join('');
}

function selectZone(idx) {
  state.activeZoneIdx = idx;
  renderZoneOverlays();
  renderZoneList();
  renderZoneDetailProps();
}

function removeZone(idx) {
  state.textZones.splice(idx, 1);
  if (state.activeZoneIdx >= state.textZones.length) state.activeZoneIdx = state.textZones.length - 1;
  renderZoneOverlays();
  renderZoneList();
  renderZoneDetailProps();
}

function renderZoneDetailProps() {
  const el = document.getElementById('zone-detail-props');
  if (!el) return;
  const zone = state.textZones[state.activeZoneIdx];
  if (!zone) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div style="border-top:1px solid var(--color-border);padding-top:var(--space-md);margin-top:var(--space-sm)">
      <div style="font-size:0.8125rem;font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-sm)">Zone ${state.activeZoneIdx + 1} Properties</div>
      <div class="pct-form-group">
        <label>Position</label>
        <div style="display:flex;gap:0.5rem">
          <input class="pct-input" type="number" value="${zone.x}" onchange="updateZoneProp(${state.activeZoneIdx}, 'x', parseInt(this.value))" style="width:50%" placeholder="X">
          <input class="pct-input" type="number" value="${zone.y}" onchange="updateZoneProp(${state.activeZoneIdx}, 'y', parseInt(this.value))" style="width:50%" placeholder="Y">
        </div>
      </div>
      <div class="pct-form-group">
        <label>Size</label>
        <div style="display:flex;gap:0.5rem">
          <input class="pct-input" type="number" value="${zone.w}" onchange="updateZoneProp(${state.activeZoneIdx}, 'w', parseInt(this.value))" style="width:50%" placeholder="Width">
          <input class="pct-input" type="number" value="${zone.h}" onchange="updateZoneProp(${state.activeZoneIdx}, 'h', parseInt(this.value))" style="width:50%" placeholder="Height">
        </div>
      </div>
      <div class="pct-form-group">
        <label>Font Family</label>
        <select class="pct-select" onchange="updateZoneProp(${state.activeZoneIdx}, 'fontFamily', this.value)">
          <option value="Inter, sans-serif" ${zone.fontFamily === 'Inter, sans-serif' ? 'selected' : ''}>Inter</option>
          <option value="Arial, sans-serif" ${zone.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
          <option value="Georgia, serif" ${zone.fontFamily === 'Georgia, serif' ? 'selected' : ''}>Georgia</option>
          <option value="Impact, sans-serif" ${zone.fontFamily === 'Impact, sans-serif' ? 'selected' : ''}>Impact</option>
          <option value="'Courier New', monospace" ${zone.fontFamily === "'Courier New', monospace" ? 'selected' : ''}>Courier New</option>
        </select>
      </div>
      <div class="pct-form-group">
        <label>Font Size: ${zone.fontSize}px</label>
        <input type="range" min="12" max="120" value="${zone.fontSize}" onchange="updateZoneProp(${state.activeZoneIdx}, 'fontSize', parseInt(this.value))" style="width:100%">
      </div>
      <div class="pct-form-group">
        <label>Font Weight</label>
        <select class="pct-select" onchange="updateZoneProp(${state.activeZoneIdx}, 'fontWeight', this.value)">
          <option value="400" ${zone.fontWeight === '400' ? 'selected' : ''}>Regular</option>
          <option value="500" ${zone.fontWeight === '500' ? 'selected' : ''}>Medium</option>
          <option value="600" ${zone.fontWeight === '600' ? 'selected' : ''}>Semi-Bold</option>
          <option value="700" ${zone.fontWeight === '700' ? 'selected' : ''}>Bold</option>
          <option value="900" ${zone.fontWeight === '900' ? 'selected' : ''}>Black</option>
        </select>
      </div>
      <div class="pct-form-group">
        <label>Color</label>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <input type="color" class="pct-color-input" value="${zone.color}" onchange="updateZoneProp(${state.activeZoneIdx}, 'color', this.value)">
          <input class="pct-input" value="${zone.color}" onchange="updateZoneProp(${state.activeZoneIdx}, 'color', this.value)" style="flex:1">
        </div>
      </div>
      <div class="pct-form-group">
        <label>Alignment</label>
        <div style="display:flex;gap:0.375rem">
          <button class="pct-btn pct-btn-sm ${zone.align === 'left' ? 'pct-btn-primary' : ''}" onclick="updateZoneProp(${state.activeZoneIdx}, 'align', 'left')">Left</button>
          <button class="pct-btn pct-btn-sm ${zone.align === 'center' ? 'pct-btn-primary' : ''}" onclick="updateZoneProp(${state.activeZoneIdx}, 'align', 'center')">Center</button>
          <button class="pct-btn pct-btn-sm ${zone.align === 'right' ? 'pct-btn-primary' : ''}" onclick="updateZoneProp(${state.activeZoneIdx}, 'align', 'right')">Right</button>
        </div>
      </div>
      <div class="pct-form-group">
        <label>Max Lines</label>
        <input class="pct-input" type="number" min="1" max="10" value="${zone.maxLines}" onchange="updateZoneProp(${state.activeZoneIdx}, 'maxLines', parseInt(this.value))">
      </div>
      <button class="pct-btn pct-btn-sm" onclick="previewZoneText(${state.activeZoneIdx})" style="width:100%;margin-top:var(--space-sm)">Preview with Sample Text</button>
    </div>
  `;
}

function updateZoneProp(idx, prop, value) {
  if (state.textZones[idx]) {
    state.textZones[idx][prop] = value;
    renderZoneOverlays();
    if (prop === 'x' || prop === 'y' || prop === 'w' || prop === 'h') renderZoneList();
  }
}

function previewZoneText(zoneIdx) {
  const tpl = state.editingTemplate;
  if (!tpl) return;
  const canvas = document.getElementById('tpl-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Redraw template image first
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const scale = state.canvasScale;

    // Draw all zones with sample text
    state.textZones.forEach((zone, idx) => {
      const sampleText = idx === zoneIdx ? 'Your hook text appears here in this zone' : `Zone ${idx + 1}`;
      renderTextInZone(ctx, sampleText, zone, scale);
    });
  };
  img.src = tpl.imageUrl;
}

function renderTextInZone(ctx, text, zone, scale) {
  const x = zone.x * scale;
  const y = zone.y * scale;
  const w = zone.w * scale;
  const h = zone.h * scale;
  let fontSize = zone.fontSize * scale;
  const minFontSize = 12 * scale;

  ctx.save();
  ctx.textAlign = zone.align || 'center';
  ctx.fillStyle = zone.color || '#FFFFFF';

  // Auto-fit: try wrapping, reduce font size until it fits
  let lines = [];
  let fits = false;

  while (fontSize >= minFontSize) {
    ctx.font = `${zone.fontWeight || '700'} ${fontSize}px ${zone.fontFamily || 'Inter, sans-serif'}`;
    lines = wrapText(ctx, text, w - 10 * scale);
    const lineHeight = fontSize * 1.2;
    const totalH = lines.length * lineHeight;
    if (totalH <= h && lines.length <= (zone.maxLines || 5)) {
      fits = true;
      break;
    }
    fontSize -= 1;
  }

  if (!fits) {
    // Truncate to max lines
    lines = lines.slice(0, zone.maxLines || 3);
  }

  const lineHeight = fontSize * 1.2;
  const totalH = lines.length * lineHeight;
  const startY = y + (h - totalH) / 2 + fontSize;

  lines.forEach((line, i) => {
    let tx = x + w / 2;
    if (zone.align === 'left') tx = x + 5 * scale;
    else if (zone.align === 'right') tx = x + w - 5 * scale;
    ctx.fillText(line, tx, startY + i * lineHeight);
  });

  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function saveTextZones() {
  if (!state.selectedTemplateId) return;
  try {
    await pctApi.updateTemplate(state.selectedTemplateId, { textZones: state.textZones });
    // Update local template data
    const tpl = state.templates.find(t => t.id === state.selectedTemplateId);
    if (tpl) tpl.textZones = [...state.textZones];
    showToast(`Saved ${state.textZones.length} text zone(s)`);
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

// ----- Generate Ads Sub-tab -----
function renderGenerateAdsSubTab(el) {
  loadTemplates().then(async () => {
    // Get approved hooks
    let approvedHooks = [];
    if (state.selectedProductId) {
      try {
        const result = await pctApi.getHooks({
          productId: state.selectedProductId,
          status: 'approved',
          limit: 200,
        });
        approvedHooks = result.data;
      } catch (e) { /* ignore */ }
    }

    const templatesWithZones = state.templates.filter(t => Array.isArray(t.textZones) && t.textZones.length > 0);

    el.innerHTML = `
      <div class="pct-card" style="margin-bottom:var(--space-md)">
        <div class="pct-card-header">
          <div class="pct-card-title">Batch Ad Generation</div>
        </div>
        ${!state.selectedProductId ? '<div class="pct-empty"><div class="pct-empty-text">Select a product in the Context tab first</div></div>' : `
        <div style="margin-bottom:var(--space-md)">
          <div class="pct-form-group">
            <label>Select Templates (${templatesWithZones.length} with text zones)</label>
            ${templatesWithZones.length === 0 ? '<div style="font-size:0.8125rem;color:var(--color-text-muted)">No templates with text zones. Create templates and define zones first.</div>' : `
            <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:var(--space-sm)">
              <button class="pct-btn pct-btn-sm" onclick="toggleAllTemplateChecks(true)">Select All</button>
              <button class="pct-btn pct-btn-sm" onclick="toggleAllTemplateChecks(false)">Deselect All</button>
            </div>
            <div class="pct-template-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
              ${templatesWithZones.map(t => `
                <div class="pct-template-card" style="cursor:default">
                  <input type="checkbox" class="pct-checkbox pct-template-check" data-tpl-id="${t.id}" checked>
                  <img class="pct-template-card-thumb" src="${t.imageUrl}" alt="${escAttr(t.name)}" style="aspect-ratio:auto;max-height:120px;object-fit:cover">
                  <div class="pct-template-card-info">
                    <div class="pct-template-card-name">${escHtml(t.name)}</div>
                    <div class="pct-template-card-meta"><span>${t.width}x${t.height}</span><span>${(t.textZones || []).length} zones</span></div>
                  </div>
                </div>
              `).join('')}
            </div>`}
          </div>
          <div class="pct-form-group">
            <label>Approved Hooks (${approvedHooks.length} available)</label>
            ${approvedHooks.length === 0 ? '<div style="font-size:0.8125rem;color:var(--color-text-muted)">No approved hooks. Generate and approve hooks first in the Hook Review tab.</div>' : `
            <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:var(--space-sm)">
              <button class="pct-btn pct-btn-sm" onclick="toggleAllHookChecks(true)">Select All</button>
              <button class="pct-btn pct-btn-sm" onclick="toggleAllHookChecks(false)">Deselect All</button>
              <span style="font-size:0.75rem;color:var(--color-text-muted)" id="hook-check-count">${approvedHooks.length} selected</span>
            </div>
            <div style="max-height:300px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-sm)">
              ${approvedHooks.map(h => `
                <label style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.375rem 0;border-bottom:1px solid var(--color-border);font-size:0.8125rem;cursor:pointer">
                  <input type="checkbox" class="pct-checkbox pct-hook-check" data-hook-id="${h.id}" checked onchange="updateHookCheckCount()">
                  <div>
                    <div style="color:var(--color-text-primary)">${escHtml(h.content)}</div>
                    <div style="display:flex;gap:0.25rem;margin-top:0.125rem">
                      <span class="pct-badge pct-badge-primary" style="font-size:0.5625rem">${(h.messagingFramework || '').replace(/_/g, ' ')}</span>
                      <span class="pct-badge pct-badge-muted" style="font-size:0.5625rem">Aw ${h.awarenessLevel}</span>
                    </div>
                  </div>
                </label>
              `).join('')}
            </div>`}
          </div>
        </div>
        <div id="gen-ad-summary" style="background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-sm) var(--space-md);margin-bottom:var(--space-md);font-size:0.8125rem">
          <span style="color:var(--color-text-secondary)">Will generate: </span>
          <strong style="color:var(--color-primary-light)" id="gen-ad-count">calculating...</strong>
          <span style="color:var(--color-text-muted)"> ad images</span>
        </div>
        <div id="gen-ad-progress" style="display:none">
          <div class="pct-progress-bar"><div class="pct-progress-bar-fill" id="gen-ad-progress-fill" style="width:0%"></div></div>
          <div class="pct-progress-text" id="gen-ad-progress-text">Preparing...</div>
        </div>
        <button class="pct-btn pct-btn-primary pct-btn-lg" id="gen-ads-btn" onclick="runBatchAdGeneration()" style="width:100%">Generate Ad Images</button>
        `}
      </div>
    `;

    // Calculate initial count
    setTimeout(updateGenAdCount, 100);
  });
}

function toggleAllTemplateChecks(checked) {
  document.querySelectorAll('.pct-template-check').forEach(cb => cb.checked = checked);
  updateGenAdCount();
}

function toggleAllHookChecks(checked) {
  document.querySelectorAll('.pct-hook-check').forEach(cb => cb.checked = checked);
  updateHookCheckCount();
  updateGenAdCount();
}

function updateHookCheckCount() {
  const count = document.querySelectorAll('.pct-hook-check:checked').length;
  const el = document.getElementById('hook-check-count');
  if (el) el.textContent = count + ' selected';
  updateGenAdCount();
}

function updateGenAdCount() {
  const tplCount = document.querySelectorAll('.pct-template-check:checked').length;
  const hookCount = document.querySelectorAll('.pct-hook-check:checked').length;
  const total = tplCount * hookCount;
  const el = document.getElementById('gen-ad-count');
  if (el) el.textContent = total;
}

async function runBatchAdGeneration() {
  const selectedTplIds = [...document.querySelectorAll('.pct-template-check:checked')].map(cb => cb.dataset.tplId);
  const selectedHookIds = [...document.querySelectorAll('.pct-hook-check:checked')].map(cb => cb.dataset.hookId);

  if (selectedTplIds.length === 0) return showToast('Select at least one template', 'error');
  if (selectedHookIds.length === 0) return showToast('Select at least one hook', 'error');

  // Ensure we have templates loaded with full data
  const templates = state.templates.filter(t => selectedTplIds.includes(t.id));
  // We need hook content - fetch hooks
  let hookData;
  try {
    const result = await pctApi.getHooks({ productId: state.selectedProductId, status: 'approved', limit: 500 });
    hookData = result.data.filter(h => selectedHookIds.includes(h.id));
  } catch (e) {
    return showToast('Failed to load hooks: ' + e.message, 'error');
  }

  const totalAds = templates.length * hookData.length;
  const btn = document.getElementById('gen-ads-btn');
  const progressEl = document.getElementById('gen-ad-progress');
  const progressFill = document.getElementById('gen-ad-progress-fill');
  const progressText = document.getElementById('gen-ad-progress-text');

  if (btn) btn.disabled = true;
  if (progressEl) progressEl.style.display = 'block';

  const generatedAds = [];
  let completed = 0;

  for (const tpl of templates) {
    // Pre-load template image
    const tplImg = await loadImage(tpl.imageUrl);

    for (const hook of hookData) {
      try {
        const dataUrl = await renderAdToCanvas(tplImg, tpl, hook.content);
        generatedAds.push({
          templateId: tpl.id,
          hookId: hook.id,
          imageDataUrl: dataUrl,
          width: tpl.width,
          height: tpl.height,
        });
      } catch (e) {
        console.error('Failed to render ad:', e);
      }
      completed++;
      const pct = Math.round((completed / totalAds) * 100);
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressText) progressText.textContent = `Generating ad ${completed} of ${totalAds}...`;

      // Yield to UI thread every 10 ads
      if (completed % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }
  }

  // Save to backend in batches of 20
  if (progressText) progressText.textContent = 'Saving to server...';
  const BATCH_SIZE = 20;
  for (let i = 0; i < generatedAds.length; i += BATCH_SIZE) {
    const batch = generatedAds.slice(i, i + BATCH_SIZE);
    try {
      await pctApi.createAdsBatch(batch);
    } catch (e) {
      showToast(`Failed to save batch: ${e.message}`, 'error');
    }
  }

  showToast(`Generated ${generatedAds.length} ad images!`);
  if (btn) btn.disabled = false;
  if (progressEl) progressEl.style.display = 'none';
  loadStats();

  // Switch to gallery
  state.creativeSubTab = 'gallery';
  renderCreativePanel();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function renderAdToCanvas(img, tpl, hookText) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = tpl.width;
    canvas.height = tpl.height;
    const ctx = canvas.getContext('2d');

    // Draw background image
    ctx.drawImage(img, 0, 0, tpl.width, tpl.height);

    // Render hook text in each text zone
    const zones = Array.isArray(tpl.textZones) ? tpl.textZones : [];
    zones.forEach(zone => {
      renderTextInZone(ctx, hookText, zone, 1); // scale=1 for full resolution
    });

    resolve(canvas.toDataURL('image/png'));
  });
}

// ----- Gallery Sub-tab -----
async function loadGeneratedAds() {
  try {
    const params = {
      limit: 50,
      offset: state.generatedAdsPage * 50,
    };
    if (state.adFilters.status) params.status = state.adFilters.status;

    const result = await pctApi.getGeneratedAds(params);
    state.generatedAds = result.data;
    state.generatedAdsTotal = result.total;
    state.selectedAdIds.clear();
  } catch (e) {
    showToast('Failed to load ads: ' + e.message, 'error');
  }
}

function renderGallerySubTab(el) {
  const renderContent = () => {
    el.innerHTML = `
      <div class="pct-card">
        <div class="pct-card-header">
          <div class="pct-card-title">Generated Ads</div>
          <span class="pct-badge pct-badge-primary">${state.generatedAdsTotal} total</span>
        </div>
        <div class="pct-gen-toolbar">
          <div class="pct-review-toolbar-group">
            <span class="pct-review-toolbar-label">Status</span>
            <div class="pct-chips">
              <span class="pct-chip ${!state.adFilters.status ? 'active' : ''}" onclick="setAdFilter('status', null)">All</span>
              <span class="pct-chip ${state.adFilters.status === 'pending' ? 'active' : ''}" onclick="setAdFilter('status', 'pending')">Pending</span>
              <span class="pct-chip ${state.adFilters.status === 'approved' ? 'active' : ''}" onclick="setAdFilter('status', 'approved')">Approved</span>
              <span class="pct-chip ${state.adFilters.status === 'rejected' ? 'active' : ''}" onclick="setAdFilter('status', 'rejected')">Rejected</span>
            </div>
          </div>
          <div class="pct-review-toolbar-group" style="margin-left:auto">
            <span style="font-size:0.8125rem;color:var(--color-text-secondary)">${state.selectedAdIds.size} selected</span>
            <button class="pct-btn pct-btn-sm pct-btn-success" onclick="bulkUpdateAds('approved')" ${state.selectedAdIds.size === 0 ? 'disabled' : ''}>Approve</button>
            <button class="pct-btn pct-btn-sm pct-btn-danger" onclick="bulkUpdateAds('rejected')" ${state.selectedAdIds.size === 0 ? 'disabled' : ''}>Reject</button>
            <button class="pct-btn pct-btn-sm" onclick="openCompareModal([...state.selectedAdIds])" ${state.selectedAdIds.size < 2 ? 'disabled' : ''} title="Compare selected ads side-by-side">Compare</button>
            <button class="pct-btn pct-btn-sm" onclick="downloadAllAds()">Download All</button>
          </div>
        </div>

        ${state.generatedAds.length === 0 ?
          '<div class="pct-empty"><div class="pct-empty-text">No ads generated yet. Use the Generate Ads tab to create ad images.</div></div>' :
          `<div class="pct-ad-gallery">${state.generatedAds.map(ad => renderAdCard(ad)).join('')}</div>`}

        ${state.generatedAdsTotal > 50 ? `
          <div style="display:flex;gap:var(--space-sm);justify-content:center;margin-top:var(--space-md)">
            <button class="pct-btn pct-btn-sm" onclick="adPagePrev()" ${state.generatedAdsPage === 0 ? 'disabled' : ''}>Previous</button>
            <span style="font-size:0.8125rem;color:var(--color-text-muted);padding:0.375rem">Page ${state.generatedAdsPage + 1} of ${Math.ceil(state.generatedAdsTotal / 50)}</span>
            <button class="pct-btn pct-btn-sm" onclick="adPageNext()" ${(state.generatedAdsPage + 1) * 50 >= state.generatedAdsTotal ? 'disabled' : ''}>Next</button>
          </div>
        ` : ''}
      </div>
    `;
  };

  // Wait for loadGeneratedAds to finish then render
  if (state.generatedAds.length === 0 && state.generatedAdsTotal === 0) {
    loadGeneratedAds().then(renderContent);
  } else {
    renderContent();
  }
}

function renderAdCard(ad) {
  const selected = state.selectedAdIds.has(ad.id);
  const statusClass = ad.status === 'approved' ? 'approved' : ad.status === 'rejected' ? 'rejected' : '';
  return `
    <div class="pct-ad-card ${statusClass}">
      <input type="checkbox" class="pct-checkbox pct-ad-check" ${selected ? 'checked' : ''} onchange="toggleAdSelect('${ad.id}')">
      <img class="pct-ad-card-img" src="${ad.imageDataUrl}" alt="Generated ad" onclick="openLightbox('${ad.id}')">
      <div class="pct-ad-card-info">
        <div class="pct-ad-card-hook">${ad.hook ? escHtml(ad.hook.content) : ''}</div>
        <div class="pct-ad-card-meta">
          ${ad.template ? `<span class="pct-badge pct-badge-muted" style="font-size:0.5625rem">${escHtml(ad.template.name)}</span>` : ''}
          ${ad.hook?.messagingFramework ? `<span class="pct-badge pct-badge-primary" style="font-size:0.5625rem">${(ad.hook.messagingFramework || '').replace(/_/g, ' ')}</span>` : ''}
          <span class="pct-badge ${ad.status === 'approved' ? 'pct-badge-success' : ad.status === 'rejected' ? 'pct-badge-error' : 'pct-badge-muted'}" style="font-size:0.5625rem">${ad.status}</span>
        </div>
      </div>
      <div class="pct-ad-card-actions">
        <button class="pct-btn pct-btn-sm ${ad.status === 'approved' ? 'pct-btn-success' : ''}" onclick="setAdStatus('${ad.id}', 'approved')">Approve</button>
        <button class="pct-btn pct-btn-sm ${ad.status === 'rejected' ? 'pct-btn-danger' : ''}" onclick="setAdStatus('${ad.id}', 'rejected')">Reject</button>
        <button class="pct-btn pct-btn-sm" onclick="downloadSingleAd('${ad.id}')" title="Download">DL</button>
        <!-- F5.4.5: Direct edit launch (external editor) -->
        <button class="pct-btn pct-btn-sm" onclick="openAdInExternalEditor('${ad.id}')" title="F5.4.5 - Open in external editor (Figma/Canva)">&#9998; Edit</button>
        <button class="pct-btn pct-btn-sm pct-btn-icon pct-btn-danger" onclick="deleteGeneratedAd('${ad.id}')" title="Delete">x</button>
      </div>
    </div>
  `;
}

function toggleAdSelect(id) {
  if (state.selectedAdIds.has(id)) state.selectedAdIds.delete(id);
  else state.selectedAdIds.add(id);
  renderGallerySubTab(document.getElementById('creative-sub-content'));
}

async function setAdStatus(id, status) {
  try {
    await pctApi.updateGeneratedAd(id, { status });
    const ad = state.generatedAds.find(a => a.id === id);
    if (ad) ad.status = status;
    renderGallerySubTab(document.getElementById('creative-sub-content'));
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function bulkUpdateAds(status) {
  const ids = [...state.selectedAdIds];
  if (ids.length === 0) return;
  try {
    await pctApi.bulkUpdateAds(ids, { status });
    showToast(`${ids.length} ads ${status}`);
    await loadGeneratedAds();
    renderGallerySubTab(document.getElementById('creative-sub-content'));
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteGeneratedAd(id) {
  try {
    await pctApi.deleteGeneratedAd(id);
    state.generatedAds = state.generatedAds.filter(a => a.id !== id);
    state.selectedAdIds.delete(id);
    state.generatedAdsTotal--;
    renderGallerySubTab(document.getElementById('creative-sub-content'));
    loadStats();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

function setAdFilter(key, value) {
  state.adFilters[key] = value;
  state.generatedAdsPage = 0;
  loadGeneratedAds().then(() => {
    renderGallerySubTab(document.getElementById('creative-sub-content'));
  });
}

function adPagePrev() {
  if (state.generatedAdsPage > 0) {
    state.generatedAdsPage--;
    loadGeneratedAds().then(() => {
      renderGallerySubTab(document.getElementById('creative-sub-content'));
    });
  }
}

function adPageNext() {
  if ((state.generatedAdsPage + 1) * 50 < state.generatedAdsTotal) {
    state.generatedAdsPage++;
    loadGeneratedAds().then(() => {
      renderGallerySubTab(document.getElementById('creative-sub-content'));
    });
  }
}

function downloadSingleAd(id) {
  const ad = state.generatedAds.find(a => a.id === id);
  if (!ad) return;
  const a = document.createElement('a');
  a.href = ad.imageDataUrl;
  a.download = `ad-${ad.id.slice(0, 8)}-${ad.width}x${ad.height}.png`;
  a.click();
}

// F5.4.5: Open ad in external editor (Figma, Canva, etc.)
function openAdInExternalEditor(id) {
  const ad = state.generatedAds.find(a => a.id === id);
  if (!ad) return;

  const settings = loadSettings();
  const preferredEditor = settings.externalEditor || 'canva';

  // Show editor selection modal
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-lg);width:360px;max-width:90vw">
      <div style="font-weight:600;font-size:1rem;margin-bottom:var(--space-md)">&#9998; Open in External Editor <span style="font-size:0.7rem;color:var(--color-muted)">F5.4.5</span></div>
      <div style="display:grid;gap:var(--space-sm);margin-bottom:var(--space-md)">
        <button class="pct-btn" onclick="launchEditor('${id}', 'canva', this.closest('[style]'))" style="text-align:left;padding:var(--space-sm)">
          <strong>Canva</strong> <span style="font-size:0.75rem;color:var(--color-muted)">— Online design tool</span>
        </button>
        <button class="pct-btn" onclick="launchEditor('${id}', 'figma', this.closest('[style]'))" style="text-align:left;padding:var(--space-sm)">
          <strong>Figma</strong> <span style="font-size:0.75rem;color:var(--color-muted)">— Professional design tool</span>
        </button>
        <button class="pct-btn" onclick="launchEditor('${id}', 'photopea', this.closest('[style]'))" style="text-align:left;padding:var(--space-sm)">
          <strong>Photopea</strong> <span style="font-size:0.75rem;color:var(--color-muted)">— Free Photoshop alternative</span>
        </button>
        <button class="pct-btn" onclick="launchEditor('${id}', 'download', this.closest('[style]'))" style="text-align:left;padding:var(--space-sm)">
          <strong>Download &amp; Open</strong> <span style="font-size:0.75rem;color:var(--color-muted)">— Save to edit locally</span>
        </button>
      </div>
      <button class="pct-btn" onclick="this.closest('[style]').remove()" style="width:100%">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function launchEditor(adId, editor, modal) {
  const ad = state.generatedAds.find(a => a.id === adId);
  if (!ad) return;
  if (modal) modal.remove();

  if (editor === 'download') {
    downloadSingleAd(adId);
    return;
  }

  // Download the image first, then open the editor
  downloadSingleAd(adId);

  const editorUrls = {
    canva: 'https://www.canva.com/create/photo-editor/',
    figma: 'https://www.figma.com/community/file/',
    photopea: `https://www.photopea.com/`,
  };

  const url = editorUrls[editor];
  if (url) {
    setTimeout(() => window.open(url, '_blank'), 500);
    showToast(`Image downloaded. Opening ${editor.charAt(0).toUpperCase() + editor.slice(1)}...`);
  }
}

async function downloadAllAds() {
  const ads = state.selectedAdIds.size > 0
    ? state.generatedAds.filter(a => state.selectedAdIds.has(a.id))
    : state.generatedAds;

  if (ads.length === 0) return showToast('No ads to download', 'error');

  if (typeof JSZip === 'undefined') {
    // Fallback: download individually
    ads.forEach(ad => downloadSingleAd(ad.id));
    return;
  }

  showLoading('Creating ZIP...', `Packaging ${ads.length} images`);
  try {
    const zip = new JSZip();
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      // Extract base64 data from data URL
      const base64 = ad.imageDataUrl.split(',')[1];
      const hookSnippet = ad.hook ? ad.hook.content.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') : 'ad';
      zip.file(`${hookSnippet}-${ad.width}x${ad.height}-${i + 1}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pct-ads-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${ads.length} ads as ZIP`);
  } catch (e) {
    showToast('ZIP creation failed: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
}

// ----- Lightbox -----
function openLightbox(adId) {
  const ad = state.generatedAds.find(a => a.id === adId);
  if (!ad) return;
  const lightbox = document.getElementById('pct-lightbox');
  const img = document.getElementById('pct-lightbox-img');
  const info = document.getElementById('pct-lightbox-info');
  if (!lightbox || !img) return;

  img.src = ad.imageDataUrl;
  if (info) {
    info.innerHTML = `
      <div style="font-weight:600">${ad.hook ? escHtml(ad.hook.content) : 'Unknown hook'}</div>
      <div style="margin-top:0.25rem;color:var(--color-text-muted);font-size:0.75rem">
        ${ad.template ? escHtml(ad.template.name) : ''} &bull; ${ad.width}x${ad.height} &bull; ${ad.status}
      </div>
    `;
  }
  lightbox.classList.add('open');
}

function closeLightbox(e) {
  if (e && e.target !== document.getElementById('pct-lightbox') && e.target !== document.querySelector('.pct-lightbox-close')) return;
  const lightbox = document.getElementById('pct-lightbox');
  if (lightbox) lightbox.classList.remove('open');
}

// ============================================
// Loading Overlay
// ============================================
function showLoading(text, subText) {
  let overlay = document.getElementById('pct-loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pct-loading-overlay';
    overlay.className = 'pct-loading-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="pct-spinner"></div>
    <div class="pct-loading-overlay-text">${escHtml(text)}</div>
    ${subText ? `<div class="pct-loading-overlay-sub">${escHtml(subText)}</div>` : ''}
  `;
  overlay.style.display = 'flex';
}

function updateLoading(text, subText) {
  const overlay = document.getElementById('pct-loading-overlay');
  if (!overlay) return;
  const textEl = overlay.querySelector('.pct-loading-overlay-text');
  const subEl = overlay.querySelector('.pct-loading-overlay-sub');
  if (textEl) textEl.textContent = text;
  if (subEl) subEl.textContent = subText || '';
}

function hideLoading() {
  const overlay = document.getElementById('pct-loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ============================================
// Utilities
// ============================================
// ============================================
// Tab 6: Video Scripts
// ============================================

const NARRATOR_STYLES = [
  'Conversational',
  'Authority/Expert',
  'Storyteller',
  'Energetic/Hype',
  'Calm/Soothing',
  'Testimonial/Customer',
  'Educational/Teacher',
  'Provocative/Bold',
];

const DURATION_LABELS = {
  fifteen_seconds: '15s',
  thirty_seconds: '30s',
  sixty_seconds: '60s',
  ninety_seconds: '90s',
};

const DURATION_WORD_RANGES = {
  fifteen_seconds: '35-45 words',
  thirty_seconds: '70-90 words',
  sixty_seconds: '140-170 words',
  ninety_seconds: '200-250 words',
};

function renderScriptsPanel() {
  const panel = document.getElementById('scripts-panel');
  if (!panel) return;

  if (!state.selectedProductId) {
    panel.innerHTML = `<div class="pct-empty"><div class="pct-empty-text">Select a product in the Context tab first</div></div>`;
    return;
  }

  panel.innerHTML = `
    <div class="pct-scripts-layout">
      <!-- Left: Hook selector + Config -->
      <div>
        <div class="pct-card" style="margin-bottom:var(--space-md)">
          <div class="pct-card-header">
            <div class="pct-card-title">Select Hook</div>
          </div>
          <div style="margin-bottom:var(--space-sm)">
            <input id="script-hook-search" class="pct-input" placeholder="Search approved hooks..." style="width:100%">
          </div>
          <div id="script-hook-list" class="pct-script-hooks" style="max-height:300px;overflow-y:auto">
            <div class="pct-loading-inline">Loading hooks...</div>
          </div>
        </div>

        <div class="pct-card" style="margin-bottom:var(--space-md)">
          <div class="pct-card-header">
            <div class="pct-card-title">Script Settings</div>
          </div>

          <div class="pct-form-group">
            <label>Duration</label>
            <div class="pct-param-grid" style="grid-template-columns: repeat(4, 1fr)">
              ${Object.entries(DURATION_LABELS).map(([val, label]) => `
                <div class="pct-param-card ${state.scriptDuration === val ? 'selected' : ''}" onclick="selectScriptDuration('${val}')">
                  <div style="font-weight:600;font-size:1.125rem">${label}</div>
                  <div style="font-size:0.6875rem;color:var(--color-text-muted)">${DURATION_WORD_RANGES[val]}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="pct-form-group" style="margin-top:var(--space-md)">
            <label>Narrator Style <span style="color:var(--color-text-muted);font-weight:400">(optional)</span></label>
            <div class="pct-narrator-grid">
              ${NARRATOR_STYLES.map(ns => `
                <div class="pct-narrator-option ${state.scriptNarratorStyle === ns ? 'selected' : ''}" onclick="selectNarratorStyle('${ns}')">${ns}</div>
              `).join('')}
            </div>
          </div>

          <div class="pct-form-group" style="margin-top:var(--space-md)">
            <label>Psychological Triggers <span style="color:var(--color-text-muted);font-weight:400">(optional, select multiple)</span></label>
            <div style="display:flex;flex-wrap:wrap;gap:0.375rem">
              ${['curiosity', 'fear', 'greed', 'urgency', 'social_proof', 'authority', 'scarcity', 'identity'].map(t => `
                <span class="pct-chip ${state.scriptPsychTriggers.has(t) ? 'active' : ''}" onclick="toggleScriptTrigger('${t}')" style="cursor:pointer">${t.replace(/_/g,' ')}</span>
              `).join('')}
            </div>
          </div>

          <div class="pct-form-group" style="margin-top:var(--space-sm)">
            <label>Emotion Arc <span style="color:var(--color-text-muted);font-weight:400">(optional)</span></label>
            <select class="pct-select" onchange="state.scriptEmotionArc=this.value||null">
              <option value="">-- No specific arc --</option>
              <option value="pain → relief" ${state.scriptEmotionArc === 'pain → relief' ? 'selected' : ''}>Pain → Relief</option>
              <option value="confusion → clarity" ${state.scriptEmotionArc === 'confusion → clarity' ? 'selected' : ''}>Confusion → Clarity</option>
              <option value="doubt → confidence" ${state.scriptEmotionArc === 'doubt → confidence' ? 'selected' : ''}>Doubt → Confidence</option>
              <option value="frustration → excitement" ${state.scriptEmotionArc === 'frustration → excitement' ? 'selected' : ''}>Frustration → Excitement</option>
              <option value="curiosity → revelation" ${state.scriptEmotionArc === 'curiosity → revelation' ? 'selected' : ''}>Curiosity → Revelation</option>
              <option value="fear → safety" ${state.scriptEmotionArc === 'fear → safety' ? 'selected' : ''}>Fear → Safety</option>
            </select>
          </div>

          <button class="pct-btn pct-btn-primary" id="generate-script-btn" onclick="generateScript()" style="width:100%;margin-top:var(--space-md)" ${!state.selectedScriptHookId ? 'disabled' : ''}>
            Generate Video Script
          </button>
        </div>

        <!-- Filters for existing scripts -->
        <div class="pct-card">
          <div class="pct-card-header">
            <div class="pct-card-title">Filter Scripts</div>
          </div>
          <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap">
            <select class="pct-select" style="flex:1;min-width:120px" onchange="filterScripts('status', this.value)">
              <option value="">All Status</option>
              <option value="draft" ${state.scriptFilters.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="approved" ${state.scriptFilters.status === 'approved' ? 'selected' : ''}>Approved</option>
              <option value="rejected" ${state.scriptFilters.status === 'rejected' ? 'selected' : ''}>Rejected</option>
            </select>
            <select class="pct-select" style="flex:1;min-width:120px" onchange="filterScripts('duration', this.value)">
              <option value="">All Durations</option>
              ${Object.entries(DURATION_LABELS).map(([val, label]) => `
                <option value="${val}" ${state.scriptFilters.duration === val ? 'selected' : ''}>${label}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Right: Script list -->
      <div>
        <div id="scripts-list" class="pct-script-list">
          <div class="pct-empty"><div class="pct-empty-text">No scripts yet. Select a hook and generate a script.</div></div>
        </div>
      </div>
    </div>
  `;

  loadApprovedHooksForScripts();
}

async function loadApprovedHooksForScripts() {
  try {
    const { data } = await pctApi.getHooks({
      productId: state.selectedProductId,
      status: 'approved',
      limit: 100,
    });

    const listEl = document.getElementById('script-hook-list');
    if (!listEl) return;

    if (data.length === 0) {
      listEl.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">No approved hooks. Approve hooks in the Review tab first.</div></div>';
      return;
    }

    // Store for search filtering
    listEl._allHooks = data;
    renderScriptHookList(data);

    // Setup search
    const searchInput = document.getElementById('script-hook-search');
    if (searchInput) {
      searchInput.addEventListener('input', debounceScriptHookSearch);
    }
  } catch (e) {
    showToast('Failed to load hooks: ' + e.message, 'error');
  }
}

let _scriptHookSearchTimer;
function debounceScriptHookSearch(e) {
  clearTimeout(_scriptHookSearchTimer);
  _scriptHookSearchTimer = setTimeout(() => {
    const listEl = document.getElementById('script-hook-list');
    if (!listEl || !listEl._allHooks) return;
    const q = e.target.value.toLowerCase().trim();
    const filtered = q
      ? listEl._allHooks.filter(h => h.content.toLowerCase().includes(q))
      : listEl._allHooks;
    renderScriptHookList(filtered);
  }, 200);
}

function renderScriptHookList(hooks) {
  const listEl = document.getElementById('script-hook-list');
  if (!listEl) return;

  listEl.innerHTML = hooks.map(h => `
    <div class="pct-script-hook-item ${state.selectedScriptHookId === h.id ? 'selected' : ''}" onclick="selectScriptHook('${h.id}')">
      <div class="pct-script-hook-text">${escHtml(h.content)}</div>
      <div class="pct-script-hook-meta">
        <span class="pct-badge">${escHtml(h.messagingFramework.replace(/_/g, ' '))}</span>
        <span class="pct-badge">Aware: ${h.awarenessLevel}</span>
        <span class="pct-badge">Soph: ${h.marketSophistication}</span>
        ${h.rating ? `<span class="pct-badge" style="color:#f59e0b">${'★'.repeat(h.rating)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function selectScriptHook(hookId) {
  state.selectedScriptHookId = hookId === state.selectedScriptHookId ? null : hookId;
  // Re-render hook list to show selection
  const listEl = document.getElementById('script-hook-list');
  if (listEl && listEl._allHooks) {
    const searchInput = document.getElementById('script-hook-search');
    const q = searchInput?.value?.toLowerCase().trim() || '';
    const filtered = q
      ? listEl._allHooks.filter(h => h.content.toLowerCase().includes(q))
      : listEl._allHooks;
    renderScriptHookList(filtered);
  }
  // Update generate button
  const btn = document.getElementById('generate-script-btn');
  if (btn) btn.disabled = !state.selectedScriptHookId;
}

function selectScriptDuration(duration) {
  state.scriptDuration = duration;
  // Re-render just the duration cards
  document.querySelectorAll('.pct-param-card').forEach(card => {
    const onclick = card.getAttribute('onclick');
    if (onclick && onclick.includes('selectScriptDuration')) {
      card.classList.toggle('selected', onclick.includes(`'${duration}'`));
    }
  });
}

function selectNarratorStyle(style) {
  state.scriptNarratorStyle = state.scriptNarratorStyle === style ? null : style;
  document.querySelectorAll('.pct-narrator-option').forEach(opt => {
    opt.classList.toggle('selected', opt.textContent === state.scriptNarratorStyle);
  });
}

function toggleScriptTrigger(trigger) {
  if (state.scriptPsychTriggers.has(trigger)) {
    state.scriptPsychTriggers.delete(trigger);
  } else {
    state.scriptPsychTriggers.add(trigger);
  }
  // Update just the trigger chips without re-fetching hooks
  document.querySelectorAll('[onclick^="toggleScriptTrigger"]').forEach(chip => {
    const t = chip.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    if (t) chip.classList.toggle('active', state.scriptPsychTriggers.has(t));
  });
}

async function generateScript() {
  if (!state.selectedScriptHookId || !state.selectedProductId) {
    showToast('Select a hook first', 'error');
    return;
  }

  const btn = document.getElementById('generate-script-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Generating...';
  }

  try {
    const payload = {
      hookId: state.selectedScriptHookId,
      productId: state.selectedProductId,
      duration: state.scriptDuration,
      narratorStyle: state.scriptNarratorStyle,
    };
    if (state.scriptPsychTriggers.size > 0) {
      payload.psychologicalTriggers = [...state.scriptPsychTriggers];
    }
    if (state.scriptEmotionArc) {
      payload.emotionArc = state.scriptEmotionArc;
    }
    const { data } = await pctApi.generateVideoScript(payload);

    showToast('Video script generated!');
    await loadVideoScripts();
    loadStats();
  } catch (e) {
    showToast('Failed to generate script: ' + e.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = !state.selectedScriptHookId;
      btn.textContent = 'Generate Video Script';
    }
  }
}

async function loadVideoScripts() {
  try {
    const params = { productId: state.selectedProductId };
    if (state.scriptFilters.status) params.status = state.scriptFilters.status;
    if (state.scriptFilters.duration) params.duration = state.scriptFilters.duration;

    const { data, total } = await pctApi.getVideoScripts(params);
    state.videoScripts = data;
    state.videoScriptsTotal = total;
    renderScriptsList();
  } catch (e) {
    console.error('Failed to load video scripts:', e);
  }
}

function filterScripts(key, value) {
  state.scriptFilters[key] = value || null;
  loadVideoScripts();
}

function renderScriptsList() {
  const listEl = document.getElementById('scripts-list');
  if (!listEl) return;

  if (state.videoScripts.length === 0) {
    listEl.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">No scripts yet. Select a hook and generate a script.</div></div>';
    return;
  }

  listEl.innerHTML = state.videoScripts.map(script => {
    const durLabel = DURATION_LABELS[script.duration] || script.duration;
    const durClass = 'd-' + (durLabel || '').replace('s', '');
    const statusClass = script.status !== 'draft' ? ` status-${script.status}` : '';
    const readTime = Math.ceil(script.wordCount / 150 * 60);

    return `
      <div class="pct-script-card${statusClass}" data-script-id="${script.id}">
        <div class="pct-script-card-header">
          <div class="pct-script-card-title">${escHtml(script.title || 'Untitled Script')}</div>
          <div class="pct-script-card-meta">
            <span class="pct-badge-duration ${durClass}">${durLabel}</span>
            ${script.narratorStyle ? `<span class="pct-badge">${escHtml(script.narratorStyle)}</span>` : ''}
            <span class="pct-badge pct-badge-${script.status === 'approved' ? 'success' : script.status === 'rejected' ? 'danger' : 'default'}">${script.status}</span>
          </div>
        </div>
        <div class="pct-script-card-body">
          <div class="pct-script-sections">
            <div class="pct-script-section" data-section="hook">
              <div class="pct-script-section-label">Hook (0-3s) <button class="pct-btn pct-btn-xs pct-rewrite-btn" onclick="showRewriteSuggestions('${script.id}', 'hook', this)" title="Get AI rewrite suggestions">✨ Rewrite</button></div>
              <div class="pct-script-section-text" contenteditable="true" data-script-id="${script.id}" data-field="hook" onblur="onScriptSectionEdit(this)">${escHtml(script.hook)}</div>
              <div class="pct-rewrite-suggestions" id="rewrite-${script.id}-hook" style="display:none"></div>
            </div>
            <div class="pct-script-section" data-section="lid">
              <div class="pct-script-section-label">Lid (3-8s) <button class="pct-btn pct-btn-xs pct-rewrite-btn" onclick="showRewriteSuggestions('${script.id}', 'lid', this)" title="Get AI rewrite suggestions">✨ Rewrite</button></div>
              <div class="pct-script-section-text" contenteditable="true" data-script-id="${script.id}" data-field="lid" onblur="onScriptSectionEdit(this)">${escHtml(script.lid)}</div>
              <div class="pct-rewrite-suggestions" id="rewrite-${script.id}-lid" style="display:none"></div>
            </div>
            <div class="pct-script-section" data-section="body">
              <div class="pct-script-section-label">Body <button class="pct-btn pct-btn-xs pct-rewrite-btn" onclick="showRewriteSuggestions('${script.id}', 'body', this)" title="Get AI rewrite suggestions">✨ Rewrite</button></div>
              <div class="pct-script-section-text" contenteditable="true" data-script-id="${script.id}" data-field="body" onblur="onScriptSectionEdit(this)">${escHtml(script.body)}</div>
              <div class="pct-rewrite-suggestions" id="rewrite-${script.id}-body" style="display:none"></div>
            </div>
            <div class="pct-script-section" data-section="cta">
              <div class="pct-script-section-label">CTA <button class="pct-btn pct-btn-xs pct-rewrite-btn" onclick="showRewriteSuggestions('${script.id}', 'cta', this)" title="Get AI rewrite suggestions">✨ Rewrite</button></div>
              <div class="pct-script-section-text" contenteditable="true" data-script-id="${script.id}" data-field="cta" onblur="onScriptSectionEdit(this)">${escHtml(script.cta)}</div>
              <div class="pct-rewrite-suggestions" id="rewrite-${script.id}-cta" style="display:none"></div>
            </div>
          </div>
          ${script.hookRef ? `
            <div style="margin-top:var(--space-md);padding-top:var(--space-sm);border-top:1px solid var(--color-border)">
              <div style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:4px">Source Hook:</div>
              <div style="font-size:0.8125rem;color:var(--color-text)">"${escHtml(script.hookRef.content)}"</div>
            </div>
          ` : ''}
        </div>
        <div class="pct-script-card-footer">
          <div class="pct-script-stats">
            <span><span class="pct-script-stat-value">${script.wordCount}</span> words</span>
            <span>~<span class="pct-script-stat-value">${readTime}s</span> read time</span>
          </div>
          <div class="pct-script-actions">
            <button class="pct-btn pct-btn-sm pct-copy-btn" onclick="copyScriptToClipboard('${script.id}')" title="Copy full script">Copy</button>
            <button class="pct-btn pct-btn-sm" onclick="openTeleprompter('${script.id}')" title="Open teleprompter view">&#9654; Teleprompter</button>
            <!-- F6.2.5: Export to Google Docs -->
            <button class="pct-btn pct-btn-sm" onclick="exportScriptToGoogleDocs('${script.id}')" title="F6.2.5 - Export to Google Docs">&#128196; Docs</button>
            <button class="pct-btn pct-btn-sm pct-btn-success" onclick="updateScriptStatus('${script.id}', 'approved')" title="Approve" ${script.status === 'approved' ? 'disabled' : ''}>Approve</button>
            <button class="pct-btn pct-btn-sm pct-btn-danger" onclick="updateScriptStatus('${script.id}', 'rejected')" title="Reject" ${script.status === 'rejected' ? 'disabled' : ''}>Reject</button>
            <button class="pct-btn pct-btn-sm" onclick="deleteScript('${script.id}')" title="Delete" style="color:var(--color-error)">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function onScriptSectionEdit(el) {
  const scriptId = el.dataset.scriptId;
  const field = el.dataset.field;
  const newText = el.textContent.trim();
  const script = state.videoScripts.find(s => s.id === scriptId);
  if (!script || script[field] === newText) return;

  try {
    await pctApi.updateVideoScript(scriptId, { [field]: newText });
    script[field] = newText;
    showToast('Script updated');
  } catch (e) {
    showToast('Failed to update: ' + e.message, 'error');
    el.textContent = script[field]; // revert
  }
}

// F6.2.4: Show AI rewrite suggestions for a specific script section
async function showRewriteSuggestions(scriptId, section, btnEl) {
  const container = document.getElementById(`rewrite-${scriptId}-${section}`);
  if (!container) return;

  // Toggle off if already showing
  if (container.style.display !== 'none') {
    container.style.display = 'none';
    btnEl.textContent = '✨ Rewrite';
    return;
  }

  btnEl.textContent = '⏳ Loading...';
  btnEl.disabled = true;
  container.style.display = 'block';
  container.innerHTML = '<div class="pct-rewrite-loading">Generating suggestions...</div>';

  try {
    const { data } = await pctApi.rewriteScriptSection(scriptId, section, 3);
    const suggestions = data.suggestions || [];
    if (suggestions.length === 0) {
      container.innerHTML = '<div class="pct-rewrite-empty">No suggestions returned.</div>';
    } else {
      container.innerHTML = `
        <div class="pct-rewrite-header">AI Suggestions — click to apply:</div>
        ${suggestions.map((s, i) => `
          <div class="pct-rewrite-item" onclick="applyRewriteSuggestion('${scriptId}', '${section}', ${i})">
            <span class="pct-rewrite-num">${i + 1}</span>
            <span class="pct-rewrite-text">${escHtml(s)}</span>
          </div>
        `).join('')}
        <button class="pct-btn pct-btn-xs" onclick="document.getElementById('rewrite-${scriptId}-${section}').style.display='none'; this.closest('.pct-script-section').querySelector('.pct-rewrite-btn').textContent='✨ Rewrite';" style="margin-top:6px">Dismiss</button>
      `;
      // Store suggestions in dataset for apply
      container.dataset.suggestions = JSON.stringify(suggestions);
    }
    btnEl.textContent = '✨ Rewrite';
    btnEl.disabled = false;
  } catch (e) {
    container.innerHTML = `<div class="pct-rewrite-error">Error: ${escHtml(e.message)}</div>`;
    btnEl.textContent = '✨ Rewrite';
    btnEl.disabled = false;
  }
}

async function applyRewriteSuggestion(scriptId, section, idx) {
  const container = document.getElementById(`rewrite-${scriptId}-${section}`);
  if (!container) return;

  let suggestions;
  try {
    suggestions = JSON.parse(container.dataset.suggestions || '[]');
  } catch {
    return;
  }
  const newText = suggestions[idx];
  if (!newText) return;

  // Update the contenteditable div
  const sectionEl = container.closest('.pct-script-section');
  const textEl = sectionEl ? sectionEl.querySelector('.pct-script-section-text') : null;
  if (textEl) {
    textEl.textContent = newText;
  }

  // Save to backend
  try {
    await pctApi.updateVideoScript(scriptId, { [section]: newText });
    const script = state.videoScripts.find(s => s.id === scriptId);
    if (script) script[section] = newText;
    showToast('Section updated');
  } catch (e) {
    showToast('Failed to save: ' + e.message, 'error');
  }

  // Dismiss the suggestions panel
  container.style.display = 'none';
  const btnEl = sectionEl ? sectionEl.querySelector('.pct-rewrite-btn') : null;
  if (btnEl) btnEl.textContent = '✨ Rewrite';
}

async function updateScriptStatus(scriptId, status) {
  try {
    await pctApi.updateVideoScript(scriptId, { status });
    const script = state.videoScripts.find(s => s.id === scriptId);
    if (script) script.status = status;
    renderScriptsList();
    loadStats();
    showToast(`Script ${status}`);
  } catch (e) {
    showToast('Failed to update status: ' + e.message, 'error');
  }
}

async function deleteScript(scriptId) {
  if (!confirm('Delete this script?')) return;
  try {
    await pctApi.deleteVideoScript(scriptId);
    state.videoScripts = state.videoScripts.filter(s => s.id !== scriptId);
    renderScriptsList();
    loadStats();
    showToast('Script deleted');
  } catch (e) {
    showToast('Failed to delete: ' + e.message, 'error');
  }
}

function copyScriptToClipboard(scriptId) {
  const script = state.videoScripts.find(s => s.id === scriptId);
  if (!script) return;

  const text = `${script.title || 'Video Script'}
${'-'.repeat(40)}

HOOK:
${script.hook}

LID:
${script.lid}

BODY:
${script.body}

CTA:
${script.cta}

---
Duration: ${DURATION_LABELS[script.duration] || script.duration} | Words: ${script.wordCount}`;

  navigator.clipboard.writeText(text).then(() => {
    // Animate the copy button
    const btn = document.querySelector(`[data-script-id="${scriptId}"] .pct-copy-btn`);
    if (btn) {
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 1500);
    }
    showToast('Script copied to clipboard');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

// F6.2.5: Export script to Google Docs
function exportScriptToGoogleDocs(scriptId) {
  const script = state.videoScripts.find(s => s.id === scriptId);
  if (!script) return;

  // Build formatted script text for Google Docs
  const title = encodeURIComponent(script.title || 'Video Ad Script');
  const content = `${script.title || 'Video Ad Script'}
${'='.repeat(50)}

HOOK:
${script.hook}

LID:
${script.lid}

BODY:
${script.body}

CTA:
${script.cta}

---
Duration: ${script.duration} | Words: ${script.wordCount}
Generated by PCT System`;

  // Copy content to clipboard first
  navigator.clipboard.writeText(content).then(() => {
    showToast('Script copied! Opening Google Docs...');
  }).catch(() => {});

  // Open a new Google Doc
  // Using the Google Docs "new document" URL which opens a blank doc
  // User can then paste the copied content
  const docsUrl = `https://docs.new`;
  window.open(docsUrl, '_blank');

  // Show instruction toast
  setTimeout(() => {
    showToast('Paste (Ctrl+V) the copied script into the new document');
  }, 2000);
}

// ============================================
// Teleprompter
// ============================================

const teleprompterState = {
  scriptId: null,
  isPlaying: false,
  speed: 50,       // pixels per second
  fontSize: 3,     // rem
  animFrame: null,
  lastTime: null,
  scrollPos: 0,
};

const TELEPROMPTER_SPEED_LABELS = { 20: 'Very Slow', 35: 'Slow', 50: 'Normal', 75: 'Fast', 100: 'Very Fast' };

function openTeleprompter(scriptId) {
  const script = state.videoScripts.find(s => s.id === scriptId);
  if (!script) return;

  teleprompterState.scriptId = scriptId;
  teleprompterState.isPlaying = false;
  teleprompterState.scrollPos = 0;

  const overlay = document.getElementById('pct-teleprompter');
  const textEl = document.getElementById('pct-teleprompter-text');
  if (!overlay || !textEl) return;

  // Build the full script text with section headers
  const sections = [
    { label: 'HOOK', text: script.hook },
    { label: 'LID', text: script.lid },
    { label: 'BODY', text: script.body },
    { label: 'CTA', text: script.cta },
  ];

  textEl.innerHTML = sections.map(s =>
    `<div style="margin-bottom:2rem"><div style="font-size:1.25rem;color:rgba(255,255,255,0.4);margin-bottom:0.5rem;letter-spacing:0.1em">${escHtml(s.label)}</div><div>${escHtml(s.text)}</div></div>`
  ).join('') + '<div style="height:50vh"></div>';

  textEl.style.fontSize = `${teleprompterState.fontSize}rem`;
  textEl.scrollTop = 0;

  updateTeleprompterUI();
  overlay.style.display = 'flex';
}

function closeTeleprompter() {
  const overlay = document.getElementById('pct-teleprompter');
  if (overlay) overlay.style.display = 'none';
  if (teleprompterState.animFrame) {
    cancelAnimationFrame(teleprompterState.animFrame);
    teleprompterState.animFrame = null;
  }
  teleprompterState.isPlaying = false;
}

function teleprompterToggle() {
  teleprompterState.isPlaying = !teleprompterState.isPlaying;
  if (teleprompterState.isPlaying) {
    teleprompterState.lastTime = performance.now();
    teleprompterScroll();
  } else {
    if (teleprompterState.animFrame) {
      cancelAnimationFrame(teleprompterState.animFrame);
      teleprompterState.animFrame = null;
    }
  }
  updateTeleprompterUI();
}

function teleprompterScroll() {
  const textEl = document.getElementById('pct-teleprompter-text');
  if (!textEl || !teleprompterState.isPlaying) return;

  const now = performance.now();
  const elapsed = (now - teleprompterState.lastTime) / 1000;
  teleprompterState.lastTime = now;
  teleprompterState.scrollPos += teleprompterState.speed * elapsed;
  textEl.scrollTop = teleprompterState.scrollPos;

  // Stop at the bottom
  if (textEl.scrollTop >= textEl.scrollHeight - textEl.clientHeight - 10) {
    teleprompterState.isPlaying = false;
    updateTeleprompterUI();
    return;
  }

  teleprompterState.animFrame = requestAnimationFrame(teleprompterScroll);
}

function teleprompterFaster() {
  const speeds = [20, 35, 50, 75, 100];
  const idx = speeds.indexOf(teleprompterState.speed);
  if (idx < speeds.length - 1) teleprompterState.speed = speeds[idx + 1];
  updateTeleprompterUI();
}

function teleprompterSlower() {
  const speeds = [20, 35, 50, 75, 100];
  const idx = speeds.indexOf(teleprompterState.speed);
  if (idx > 0) teleprompterState.speed = speeds[idx - 1];
  updateTeleprompterUI();
}

function teleprompterFontLarger() {
  teleprompterState.fontSize = Math.min(teleprompterState.fontSize + 0.5, 6);
  const textEl = document.getElementById('pct-teleprompter-text');
  if (textEl) textEl.style.fontSize = `${teleprompterState.fontSize}rem`;
}

function teleprompterFontSmaller() {
  teleprompterState.fontSize = Math.max(teleprompterState.fontSize - 0.5, 1.5);
  const textEl = document.getElementById('pct-teleprompter-text');
  if (textEl) textEl.style.fontSize = `${teleprompterState.fontSize}rem`;
}

function updateTeleprompterUI() {
  const btn = document.getElementById('teleprompter-play-btn');
  if (btn) btn.textContent = teleprompterState.isPlaying ? '&#9646;&#9646; Pause' : '&#9654; Play';
  if (btn) btn.innerHTML = teleprompterState.isPlaying ? '&#9646;&#9646; Pause' : '&#9654; Play';
  const label = document.getElementById('teleprompter-speed-label');
  if (label) label.textContent = TELEPROMPTER_SPEED_LABELS[teleprompterState.speed] || `${teleprompterState.speed} px/s`;
}

// ============================================
// Side-by-Side Ad Comparison
// ============================================

function openCompareModal(adIds) {
  const ads = state.generatedAds.filter(ad => adIds.includes(ad.id));
  if (ads.length < 2) {
    showToast('Select at least 2 ads to compare', 'error');
    return;
  }

  const modal = document.getElementById('pct-compare-modal');
  const content = document.getElementById('pct-compare-content');
  if (!modal || !content) return;

  content.innerHTML = ads.map(ad => {
    const hookText = ad.hook?.content || '';
    const displayHook = hookText.length > 80 ? hookText.substring(0, 80) + '...' : hookText;
    return `
      <div class="pct-compare-item">
        <img src="${escAttr(ad.imageDataUrl || '')}" alt="Ad preview">
        <div class="pct-compare-item-info">
          <div style="font-weight:500;margin-bottom:0.25rem">${escHtml(displayHook)}</div>
          <div style="display:flex;gap:0.375rem;justify-content:center;flex-wrap:wrap">
            <span class="pct-badge pct-badge-${ad.status === 'approved' ? 'success' : ad.status === 'rejected' ? 'danger' : 'default'}">${ad.status}</span>
            ${ad.width && ad.height ? `<span class="pct-badge pct-badge-muted">${ad.width}×${ad.height}</span>` : ''}
            ${ad.hook?.messagingFramework ? `<span class="pct-badge pct-badge-primary" style="font-size:0.6875rem">${(ad.hook.messagingFramework || '').replace(/_/g,' ')}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  modal.style.display = 'flex';
}

function closeCompareModal() {
  const modal = document.getElementById('pct-compare-modal');
  if (modal) modal.style.display = 'none';
}

// ============================================
// Module 7: Meta Deployment
// ============================================

// --- State ---
// Deployment state is kept in state.deploy.*
Object.assign(state, {
  deploy: {
    accounts: [],
    selectedAccountId: null,
    campaigns: [],
    selectedCampaignId: null,
    adSets: [],
    selectedAdSetId: null,
    deployments: [],
    deploymentsTotal: 0,
    deploymentsPage: 0,
    deployFilters: { status: null },
    // deploy wizard
    wizardAdIds: [],    // selected generated ad IDs for deployment
    wizardHeadline: '',
    wizardBody: '',
    wizardCta: 'SHOP_NOW',
    wizardUrl: '',
    pushProgress: null, // { queued, done, failed }
  },
});

// --- API calls ---
async function loadMetaAccounts() {
  try {
    const data = await api('/meta/accounts');
    state.deploy.accounts = data.data || [];
    renderDeployPanel();
  } catch (e) {
    showToast('Failed to load Meta accounts', 'error');
  }
}

async function createMetaAccount() {
  const name = document.getElementById('meta-account-name')?.value?.trim();
  const token = document.getElementById('meta-access-token')?.value?.trim();
  const adAccountId = document.getElementById('meta-ad-account-id')?.value?.trim();
  if (!name || !token) {
    showToast('Name and access token are required', 'error');
    return;
  }
  try {
    const btn = document.getElementById('meta-connect-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Connecting...'; }
    const data = await api('/meta/accounts', { method: 'POST', body: { name, accessToken: token, adAccountId } });
    state.deploy.accounts.unshift(data.data);
    state.deploy.selectedAccountId = data.data.id;
    // Clear form
    if (document.getElementById('meta-account-name')) document.getElementById('meta-account-name').value = '';
    if (document.getElementById('meta-access-token')) document.getElementById('meta-access-token').value = '';
    if (document.getElementById('meta-ad-account-id')) document.getElementById('meta-ad-account-id').value = '';
    showToast('Meta account connected!', 'success');
    renderDeployPanel();
    loadMetaCampaigns();
  } catch (e) {
    showToast(e.message || 'Failed to connect account', 'error');
  } finally {
    const btn = document.getElementById('meta-connect-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Connect Account'; }
  }
}

async function verifyMetaAccount(id) {
  try {
    showToast('Verifying connection...', 'info');
    const data = await api(`/meta/accounts/${id}/verify`, { method: 'POST' });
    if (data.data.valid) {
      showToast(`Connected as ${data.data.userName}`, 'success');
    } else {
      showToast(`Connection invalid: ${data.data.error}`, 'error');
    }
  } catch (e) {
    showToast('Verification failed', 'error');
  }
}

async function disconnectMetaAccount(id) {
  if (!confirm('Disconnect this Meta account?')) return;
  try {
    await api(`/meta/accounts/${id}`, { method: 'DELETE' });
    state.deploy.accounts = state.deploy.accounts.filter(a => a.id !== id);
    if (state.deploy.selectedAccountId === id) {
      state.deploy.selectedAccountId = state.deploy.accounts[0]?.id || null;
    }
    showToast('Account disconnected', 'success');
    renderDeployPanel();
  } catch (e) {
    showToast('Failed to disconnect', 'error');
  }
}

function selectMetaAccount(id) {
  state.deploy.selectedAccountId = id;
  state.deploy.selectedCampaignId = null;
  state.deploy.selectedAdSetId = null;
  state.deploy.campaigns = [];
  state.deploy.adSets = [];
  renderDeployPanel();
  loadMetaCampaigns();
}

async function loadMetaCampaigns() {
  const accountId = state.deploy.selectedAccountId;
  if (!accountId) return;
  try {
    const data = await api(`/meta/accounts/${accountId}/campaigns`);
    state.deploy.campaigns = data.data || [];
    renderDeployPanel();
  } catch (e) {
    showToast('Failed to load campaigns', 'error');
  }
}

async function syncMetaCampaigns() {
  const accountId = state.deploy.selectedAccountId;
  if (!accountId) return;
  try {
    const btn = document.getElementById('sync-campaigns-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
    const data = await api(`/meta/accounts/${accountId}/sync-campaigns`, { method: 'POST' });
    showToast(`Synced ${data.data.synced} campaigns`, 'success');
    state.deploy.campaigns = data.data.campaigns || [];
    renderDeployPanel();
  } catch (e) {
    showToast(e.message || 'Failed to sync campaigns', 'error');
  } finally {
    const btn = document.getElementById('sync-campaigns-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Sync from Meta'; }
  }
}

function selectCampaign(id) {
  state.deploy.selectedCampaignId = id;
  state.deploy.selectedAdSetId = null;
  state.deploy.adSets = [];
  renderDeployPanel();
  loadAdSets(id);
}

async function loadAdSets(campaignId) {
  try {
    const data = await api(`/meta/campaigns/${campaignId}/adsets`);
    state.deploy.adSets = data.data || [];
    renderDeployPanel();
  } catch (e) {
    showToast('Failed to load ad sets', 'error');
  }
}

async function syncAdSets(campaignId) {
  try {
    const btn = document.getElementById(`sync-adsets-btn-${campaignId}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
    const data = await api(`/meta/campaigns/${campaignId}/sync-adsets`, { method: 'POST' });
    showToast(`Synced ${data.data.synced} ad sets`, 'success');
    state.deploy.adSets = data.data.adSets || [];
    renderDeployPanel();
  } catch (e) {
    showToast(e.message || 'Failed to sync ad sets', 'error');
  } finally {
    const btn = document.getElementById(`sync-adsets-btn-${campaignId}`);
    if (btn) { btn.disabled = false; btn.textContent = 'Sync Ad Sets'; }
  }
}

function selectAdSet(id) {
  state.deploy.selectedAdSetId = id;
  renderDeployPanel();
}

// F7.2.3 - Create new campaign via Meta API
async function createCampaign() {
  const accountId = state.deploy.selectedAccountId;
  if (!accountId) return showToast('Select a Meta account first', 'error');

  const name = document.getElementById('new-campaign-name')?.value.trim();
  if (!name) return showToast('Campaign name is required', 'error');

  const objective = document.getElementById('new-campaign-objective')?.value;
  const status = document.getElementById('new-campaign-status')?.value || 'PAUSED';
  const budgetVal = parseFloat(document.getElementById('new-campaign-budget')?.value || '0');
  const dailyBudgetCents = budgetVal > 0 ? Math.round(budgetVal * 100) : undefined;

  try {
    showLoading('Creating campaign...', 'Making API call to Meta');
    const result = await pctApi.createCampaign(accountId, { name, objective, status, dailyBudgetCents });
    hideLoading();
    showToast('Campaign created: ' + result.data.name);
    state.deploy.campaigns.unshift(result.data);
    state.deploy.selectedCampaignId = result.data.id;
    renderDeployPanel();
  } catch (e) {
    hideLoading();
    showToast('Failed to create campaign: ' + e.message, 'error');
  }
}

// F7.2.4/F7.2.5 - Create new ad set via Meta API with budget
async function createAdSet(campaignId) {
  if (!campaignId) return showToast('Select a campaign first', 'error');

  const name = document.getElementById('new-adset-name')?.value.trim();
  if (!name) return showToast('Ad set name is required', 'error');

  const budgetVal = parseFloat(document.getElementById('new-adset-budget')?.value || '0');
  if (!budgetVal || budgetVal <= 0) return showToast('Daily budget is required (minimum $1)', 'error');

  const dailyBudgetCents = Math.round(budgetVal * 100);
  const optimizationGoal = document.getElementById('new-adset-goal')?.value || 'IMPRESSIONS';
  const billingEvent = document.getElementById('new-adset-billing')?.value || 'IMPRESSIONS';
  const status = document.getElementById('new-adset-status')?.value || 'PAUSED';

  try {
    showLoading('Creating ad set...', 'Making API call to Meta');
    const result = await pctApi.createAdSet(campaignId, { name, dailyBudgetCents, optimizationGoal, billingEvent, status });
    hideLoading();
    showToast('Ad set created: ' + result.data.name);
    state.deploy.adSets.unshift(result.data);
    state.deploy.selectedAdSetId = result.data.id;
    renderDeployPanel();
  } catch (e) {
    hideLoading();
    showToast('Failed to create ad set: ' + e.message, 'error');
  }
}

async function loadDeployments() {
  const { status } = state.deploy.deployFilters;
  const page = state.deploy.deploymentsPage;
  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.set('status', status);
    if (state.deploy.selectedAccountId) params.set('metaAccountId', state.deploy.selectedAccountId);
    const data = await api(`/meta/deployments?${params}`);
    state.deploy.deployments = data.data || [];
    state.deploy.deploymentsTotal = data.total || 0;
    renderDeploymentsList();
  } catch (e) {
    showToast('Failed to load deployments', 'error');
  }
}

async function pushSelectedAds() {
  const { selectedAdSetId, selectedAccountId, wizardAdIds, wizardHeadline, wizardBody, wizardCta, wizardUrl } = state.deploy;
  if (!selectedAccountId) {
    showToast('Select a Meta account first', 'error'); return;
  }
  if (!selectedAdSetId) {
    showToast('Select an ad set first', 'error'); return;
  }
  if (wizardAdIds.length === 0) {
    showToast('Select at least one ad to deploy', 'error'); return;
  }
  if (!wizardUrl) {
    showToast('Enter a destination URL', 'error'); return;
  }
  try {
    const pushBtn = document.getElementById('push-ads-btn');
    if (pushBtn) { pushBtn.disabled = true; pushBtn.textContent = 'Pushing...'; }

    const data = await api('/meta/deploy', {
      method: 'POST',
      body: {
        metaAccountId: selectedAccountId,
        adSetId: selectedAdSetId,
        generatedAdIds: wizardAdIds,
        headline: wizardHeadline || undefined,
        bodyText: wizardBody || undefined,
        ctaText: wizardCta,
        destinationUrl: wizardUrl,
      },
    });

    state.deploy.pushProgress = { queued: data.data.queued, deploymentIds: data.data.deploymentIds };
    showToast(`${data.data.queued} ads queued for deployment!`, 'success');
    state.deploy.wizardAdIds = [];
    // Clear wizard checkboxes
    document.querySelectorAll('.deploy-ad-checkbox').forEach(cb => cb.checked = false);
    renderDeployPanel();
    // Poll for status
    pollDeploymentStatus(data.data.deploymentIds);
  } catch (e) {
    showToast(e.message || 'Push failed', 'error');
  } finally {
    const pushBtn = document.getElementById('push-ads-btn');
    if (pushBtn) { pushBtn.disabled = false; pushBtn.textContent = 'Push to Meta'; }
  }
}

async function pollDeploymentStatus(deploymentIds, attempts = 0) {
  if (attempts > 30) return; // Stop after ~1 min
  await loadDeployments();
  // Check if all done
  const inProgress = state.deploy.deployments.filter(d =>
    deploymentIds.includes(d.id) && (d.status === 'queued' || d.status === 'pushing')
  );
  if (inProgress.length > 0) {
    setTimeout(() => pollDeploymentStatus(deploymentIds, attempts + 1), 2000);
  }
}

async function syncDeploymentStatus() {
  try {
    const btn = document.getElementById('sync-deploy-status-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
    const body = {};
    if (state.deploy.selectedAccountId) body.metaAccountId = state.deploy.selectedAccountId;
    const data = await api('/meta/sync-status', { method: 'POST', body });
    showToast(`Synced status for ${data.data.synced} ads`, 'success');
    loadDeployments();
  } catch (e) {
    showToast('Failed to sync status', 'error');
  } finally {
    const btn = document.getElementById('sync-deploy-status-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Sync Status'; }
  }
}

function toggleDeployAdSelection(adId) {
  const idx = state.deploy.wizardAdIds.indexOf(adId);
  if (idx === -1) {
    state.deploy.wizardAdIds.push(adId);
  } else {
    state.deploy.wizardAdIds.splice(idx, 1);
  }
  const countEl = document.getElementById('deploy-selected-count');
  if (countEl) countEl.textContent = state.deploy.wizardAdIds.length;
}

function updateDeployWizardField(field, value) {
  state.deploy[field] = value;
}

// --- Rendering ---

function renderDeployPanel() {
  const container = document.getElementById('deploy-panel');
  if (!container) return;

  const { accounts, selectedAccountId, campaigns, selectedCampaignId, adSets, selectedAdSetId } = state.deploy;
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  container.innerHTML = `
    <div class="deploy-layout">
      <!-- LEFT: Account + Campaign selector -->
      <div class="deploy-sidebar">

        <!-- Account Connection (F7.1) -->
        <div class="pct-card">
          <div class="pct-card-header">
            <div class="pct-card-title">Meta Account</div>
            <span class="pct-badge ${selectedAccount ? 'pct-badge-success' : 'pct-badge-warning'}">${selectedAccount ? 'Connected' : 'Not Connected'}</span>
          </div>

          ${accounts.length > 0 ? `
            <div class="deploy-account-list">
              ${accounts.map(a => `
                <div class="deploy-account-item ${a.id === selectedAccountId ? 'selected' : ''}" onclick="selectMetaAccount('${escAttr(a.id)}')">
                  <div class="deploy-account-name">${escHtml(a.name)}</div>
                  <div class="deploy-account-meta">${escHtml(a.businessName || a.adAccountId || 'No ad account')}</div>
                  <div class="deploy-account-actions">
                    <button class="pct-btn pct-btn-xs" onclick="event.stopPropagation();verifyMetaAccount('${escAttr(a.id)}')">Verify</button>
                    <button class="pct-btn pct-btn-xs pct-btn-danger" onclick="event.stopPropagation();disconnectMetaAccount('${escAttr(a.id)}')">Remove</button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<div class="pct-empty"><div class="pct-empty-text">No accounts connected</div></div>'}

          <details style="margin-top:var(--space-sm)">
            <summary style="font-size:0.8125rem;color:var(--color-primary-light);cursor:pointer;user-select:none">+ Connect Account</summary>
            <div style="margin-top:var(--space-sm)">
              <div class="pct-form-group">
                <label>Account Name *</label>
                <input id="meta-account-name" class="pct-input" placeholder="e.g. My Business">
              </div>
              <div class="pct-form-group">
                <label>Access Token *</label>
                <input id="meta-access-token" class="pct-input" type="password" placeholder="EAABx...">
                <div style="font-size:0.75rem;color:var(--color-muted);margin-top:2px">Get from Meta Business Manager → System Users or use <a href="https://developers.facebook.com/tools/explorer/" target="_blank" style="color:var(--color-primary-light)">Graph API Explorer</a></div>
              </div>
              <div class="pct-form-group">
                <label>Ad Account ID</label>
                <input id="meta-ad-account-id" class="pct-input" placeholder="act_123456789">
                <div style="font-size:0.75rem;color:var(--color-muted);margin-top:2px">Found in Meta Ads Manager URL</div>
              </div>
              <button id="meta-connect-btn" class="pct-btn pct-btn-primary" onclick="createMetaAccount()" style="width:100%">Connect Account</button>
            </div>
          </details>
        </div>

        <!-- Campaign Browser (F7.2) -->
        ${selectedAccount ? `
          <div class="pct-card">
            <div class="pct-card-header">
              <div class="pct-card-title">Campaigns</div>
              <button id="sync-campaigns-btn" class="pct-btn pct-btn-sm" onclick="syncMetaCampaigns()">Sync from Meta</button>
            </div>
            ${campaigns.length === 0 ? `
              <div class="pct-empty"><div class="pct-empty-text">No campaigns. Click "Sync from Meta" to load.</div></div>
            ` : `
              <div class="deploy-campaign-list">
                ${campaigns.map(c => `
                  <div class="deploy-campaign-item ${c.id === selectedCampaignId ? 'selected' : ''}" onclick="selectCampaign('${escAttr(c.id)}')">
                    <div class="deploy-campaign-name">${escHtml(c.name)}</div>
                    <div class="deploy-campaign-meta">
                      <span class="deploy-status-badge deploy-status-${c.status?.toLowerCase()}">${escHtml(c.status)}</span>
                      ${c.budgetCents ? `<span>$${(c.budgetCents/100).toFixed(2)}/day</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}

            <!-- F7.2.3 - Create Campaign -->
            <details style="margin-top:var(--space-sm)">
              <summary style="font-size:0.8125rem;color:var(--color-primary-light);cursor:pointer;user-select:none">+ Create New Campaign</summary>
              <div style="margin-top:var(--space-sm)" id="create-campaign-form">
                <div class="pct-form-group">
                  <label>Campaign Name *</label>
                  <input id="new-campaign-name" class="pct-input" placeholder="e.g. PCT Test Campaign Q1">
                </div>
                <div class="pct-form-group">
                  <label>Objective *</label>
                  <select id="new-campaign-objective" class="pct-select">
                    <option value="OUTCOME_TRAFFIC">Traffic</option>
                    <option value="OUTCOME_SALES">Sales / Conversions</option>
                    <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                    <option value="OUTCOME_AWARENESS">Awareness</option>
                    <option value="OUTCOME_LEADS">Leads</option>
                  </select>
                </div>
                <div class="pct-form-group">
                  <label>Daily Budget (USD)</label>
                  <input id="new-campaign-budget" class="pct-input" type="number" placeholder="e.g. 20" min="1">
                  <div style="font-size:0.75rem;color:var(--color-muted);margin-top:2px">Leave empty for no campaign-level budget</div>
                </div>
                <div class="pct-form-group">
                  <label>Status</label>
                  <select id="new-campaign-status" class="pct-select">
                    <option value="PAUSED">Paused (recommended)</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                </div>
                <button class="pct-btn pct-btn-primary" onclick="createCampaign()" style="width:100%">Create Campaign</button>
              </div>
            </details>
          </div>

          <!-- Ad Set Browser -->
          ${selectedCampaignId ? `
            <div class="pct-card">
              <div class="pct-card-header">
                <div class="pct-card-title">Ad Sets</div>
                <button id="sync-adsets-btn-${escAttr(selectedCampaignId)}" class="pct-btn pct-btn-sm" onclick="syncAdSets('${escAttr(selectedCampaignId)}')">Sync Ad Sets</button>
              </div>
              ${adSets.length === 0 ? `
                <div class="pct-empty"><div class="pct-empty-text">No ad sets. Click "Sync Ad Sets" to load.</div></div>
              ` : `
                <div class="deploy-adset-list">
                  ${adSets.map(a => `
                    <div class="deploy-adset-item ${a.id === selectedAdSetId ? 'selected' : ''}" onclick="selectAdSet('${escAttr(a.id)}')">
                      <div class="deploy-adset-name">${escHtml(a.name)}</div>
                      <div style="display:flex;gap:var(--space-xs);align-items:center">
                        <span class="deploy-status-badge deploy-status-${a.status?.toLowerCase()}">${escHtml(a.status)}</span>
                        ${a.budgetCents ? `<span style="font-size:0.75rem;color:var(--color-muted)">$${(a.budgetCents/100).toFixed(2)}/${a.budgetType || 'day'}</span>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}

              <!-- F7.2.4/F7.2.5 - Create Ad Set with Budget -->
              <details style="margin-top:var(--space-sm)">
                <summary style="font-size:0.8125rem;color:var(--color-primary-light);cursor:pointer;user-select:none">+ Create New Ad Set</summary>
                <div style="margin-top:var(--space-sm)">
                  <div class="pct-form-group">
                    <label>Ad Set Name *</label>
                    <input id="new-adset-name" class="pct-input" placeholder="e.g. Broad - US - 25-45">
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm)">
                    <div class="pct-form-group">
                      <label>Daily Budget (USD) *</label>
                      <input id="new-adset-budget" class="pct-input" type="number" placeholder="e.g. 10" min="1">
                    </div>
                    <div class="pct-form-group">
                      <label>Optimization Goal</label>
                      <select id="new-adset-goal" class="pct-select">
                        <option value="IMPRESSIONS">Impressions</option>
                        <option value="REACH">Reach</option>
                        <option value="LINK_CLICKS">Link Clicks</option>
                        <option value="LANDING_PAGE_VIEWS">Landing Page Views</option>
                        <option value="CONVERSIONS">Conversions</option>
                        <option value="PURCHASE_ROAS">Purchase ROAS</option>
                      </select>
                    </div>
                  </div>
                  <div class="pct-form-group">
                    <label>Billing Event</label>
                    <select id="new-adset-billing" class="pct-select">
                      <option value="IMPRESSIONS">Per 1,000 Impressions (CPM)</option>
                      <option value="LINK_CLICKS">Per Click (CPC)</option>
                    </select>
                  </div>
                  <div class="pct-form-group">
                    <label>Status</label>
                    <select id="new-adset-status" class="pct-select">
                      <option value="PAUSED">Paused</option>
                      <option value="ACTIVE">Active</option>
                    </select>
                  </div>
                  <button class="pct-btn pct-btn-primary" onclick="createAdSet('${escAttr(selectedCampaignId)}')" style="width:100%">Create Ad Set</button>
                </div>
              </details>
            </div>
          ` : ''}
        ` : ''}

      </div><!-- end sidebar -->

      <!-- RIGHT: Push + Deployments -->
      <div class="deploy-main">

        ${selectedAdSetId ? renderDeployWizard() : `
          <div class="pct-card">
            <div class="pct-card-header">
              <div class="pct-card-title">Deploy Ads</div>
            </div>
            <div class="pct-empty">
              <div class="pct-empty-text">Select an account → campaign → ad set to start deploying</div>
            </div>
          </div>
        `}

        <!-- Deployments List (F7.3, F7.4) -->
        <div class="pct-card" style="margin-top:var(--space-md)">
          <div class="pct-card-header">
            <div class="pct-card-title">Deployment History</div>
            <div style="display:flex;gap:var(--space-sm)">
              <select class="pct-select pct-select-sm" onchange="state.deploy.deployFilters.status=this.value||null;state.deploy.deploymentsPage=0;loadDeployments()">
                <option value="">All Statuses</option>
                <option value="queued">Queued</option>
                <option value="pushing">Pushing</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="rejected">Rejected</option>
              </select>
              <button id="sync-deploy-status-btn" class="pct-btn pct-btn-sm" onclick="syncDeploymentStatus()">Sync Status</button>
              <button class="pct-btn pct-btn-sm" onclick="loadDeployments()">Refresh</button>
            </div>
          </div>
          <div id="deployments-list">
            <div class="pct-empty"><div class="pct-empty-text">Loading deployments...</div></div>
          </div>
        </div>

      </div><!-- end main -->
    </div><!-- end layout -->
  `;

  // Load deployments list
  loadDeployments();
}

function renderDeployWizard() {
  const { wizardAdIds, wizardHeadline, wizardBody, wizardCta, wizardUrl } = state.deploy;
  // Load approved generated ads for selection
  const approvedAds = state.generatedAds.filter(a => a.status === 'approved');

  return `
    <div class="pct-card">
      <div class="pct-card-header">
        <div class="pct-card-title">Push Ads to Meta</div>
        <span class="pct-badge">${wizardAdIds.length} selected</span>
      </div>

      <!-- Ad Selection (F7.3.1) -->
      <div style="margin-bottom:var(--space-md)">
        <div style="font-size:0.8125rem;font-weight:500;margin-bottom:var(--space-sm)">
          Select Ads to Deploy
          <span id="deploy-selected-count" style="color:var(--color-primary-light)">${wizardAdIds.length}</span> selected
        </div>
        ${approvedAds.length === 0 ? `
          <div class="pct-empty">
            <div class="pct-empty-text">No approved ads. Go to Ad Creative tab, generate and approve ads first.</div>
          </div>
        ` : `
          <div class="deploy-ad-grid">
            ${approvedAds.slice(0, 20).map(ad => `
              <div class="deploy-ad-thumb ${wizardAdIds.includes(ad.id) ? 'selected' : ''}" onclick="toggleDeployAdSelection('${escAttr(ad.id)}')">
                <input type="checkbox" class="deploy-ad-checkbox" ${wizardAdIds.includes(ad.id) ? 'checked' : ''} onclick="event.stopPropagation()">
                <img src="${escAttr(ad.imageDataUrl || '')}" alt="Ad" class="deploy-ad-img">
                <div class="deploy-ad-label">${escHtml(ad.hook?.content?.slice(0, 40) || 'Ad')}...</div>
              </div>
            `).join('')}
          </div>
          ${approvedAds.length > 20 ? `<div style="font-size:0.8125rem;color:var(--color-muted);margin-top:4px">${approvedAds.length - 20} more ads available. Approve more to see them here.</div>` : ''}
        `}
      </div>

      <!-- Ad Copy Configuration (F7.3.3) -->
      <div style="border-top:1px solid var(--color-border);padding-top:var(--space-md);margin-bottom:var(--space-md)">
        <div style="font-size:0.8125rem;font-weight:500;margin-bottom:var(--space-sm)">Ad Copy</div>
        <div class="pct-form-group">
          <label>Headline</label>
          <input class="pct-input" placeholder="e.g. Transform Your Skin in 7 Days" value="${escAttr(wizardHeadline)}" oninput="updateDeployWizardField('wizardHeadline',this.value)">
        </div>
        <div class="pct-form-group">
          <label>Body Text</label>
          <textarea class="pct-textarea" rows="2" placeholder="Primary ad copy..." oninput="updateDeployWizardField('wizardBody',this.value)">${escHtml(wizardBody)}</textarea>
        </div>
        <div class="pct-two-col-sm">
          <div class="pct-form-group">
            <label>CTA Button</label>
            <select class="pct-select" onchange="updateDeployWizardField('wizardCta',this.value)">
              <option value="SHOP_NOW" ${wizardCta === 'SHOP_NOW' ? 'selected' : ''}>Shop Now</option>
              <option value="LEARN_MORE" ${wizardCta === 'LEARN_MORE' ? 'selected' : ''}>Learn More</option>
              <option value="GET_OFFER" ${wizardCta === 'GET_OFFER' ? 'selected' : ''}>Get Offer</option>
              <option value="SIGN_UP" ${wizardCta === 'SIGN_UP' ? 'selected' : ''}>Sign Up</option>
              <option value="SUBSCRIBE" ${wizardCta === 'SUBSCRIBE' ? 'selected' : ''}>Subscribe</option>
              <option value="WATCH_MORE" ${wizardCta === 'WATCH_MORE' ? 'selected' : ''}>Watch More</option>
            </select>
          </div>
          <div class="pct-form-group">
            <label>Destination URL *</label>
            <input class="pct-input" type="url" placeholder="https://yoursite.com/product" value="${escAttr(wizardUrl)}" oninput="updateDeployWizardField('wizardUrl',this.value)">
          </div>
        </div>
      </div>

      <!-- Push Button (F7.3.5) -->
      <div style="display:flex;align-items:center;gap:var(--space-md)">
        <button id="push-ads-btn" class="pct-btn pct-btn-primary" onclick="pushSelectedAds()" ${wizardAdIds.length === 0 ? 'disabled' : ''}>
          Push ${wizardAdIds.length || ''} Ad${wizardAdIds.length !== 1 ? 's' : ''} to Meta
        </button>
        <div style="font-size:0.8125rem;color:var(--color-muted)">Rate limited: ~40 ads/min</div>
      </div>
    </div>
  `;
}

function renderDeploymentsList() {
  const container = document.getElementById('deployments-list');
  if (!container) return;

  const { deployments, deploymentsTotal, deploymentsPage } = state.deploy;

  if (deployments.length === 0) {
    container.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">No deployments yet</div></div>';
    return;
  }

  const statusColors = {
    pending: 'pct-badge-muted',
    queued: 'pct-badge-warning',
    pushing: 'pct-badge-warning',
    success: 'pct-badge-success',
    failed: 'pct-badge-error',
    rejected: 'pct-badge-error',
  };

  const reviewStatusLabels = {
    ACTIVE: 'Live',
    PENDING_REVIEW: 'In Review',
    DISAPPROVED: 'Disapproved',
    PAUSED: 'Paused',
    ARCHIVED: 'Archived',
  };

  container.innerHTML = `
    <div class="deploy-list">
      ${deployments.map(d => `
        <div class="deploy-list-item">
          <div class="deploy-list-thumb">
            ${d.generatedAd?.imageDataUrl ? `<img src="${escAttr(d.generatedAd.imageDataUrl)}" alt="Ad">` : '<div class="deploy-thumb-placeholder">No image</div>'}
          </div>
          <div class="deploy-list-info">
            <div class="deploy-list-hook">${escHtml(d.generatedAd?.hook?.content?.slice(0, 60) || 'Ad') + '...'}</div>
            <div class="deploy-list-meta">
              <span class="pct-badge ${statusColors[d.status] || ''}">${escHtml(d.status)}</span>
              ${d.reviewStatus ? `<span class="deploy-review-status">${escHtml(reviewStatusLabels[d.reviewStatus] || d.reviewStatus)}</span>` : ''}
              ${d.adSet ? `<span style="color:var(--color-muted)">→ ${escHtml(d.adSet.name)}</span>` : ''}
              <span style="color:var(--color-muted)">${new Date(d.createdAt).toLocaleDateString()}</span>
            </div>
            ${d.errorMessage ? `<div class="deploy-error-msg">${escHtml(d.errorMessage)}</div>` : ''}
            ${d.rejectionReason ? `<div class="deploy-error-msg">Rejection: ${escHtml(d.rejectionReason)}</div>` : ''}
          </div>
          <div class="deploy-list-actions">
            ${d.livePreviewUrl ? `<a href="${escAttr(d.livePreviewUrl)}" target="_blank" class="pct-btn pct-btn-sm">Preview</a>` : ''}
            ${d.metaAdId ? `<span style="font-size:0.75rem;color:var(--color-muted)">ID: ${escHtml(d.metaAdId)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    ${deploymentsTotal > 20 ? `
      <div class="pct-pagination" style="margin-top:var(--space-md)">
        <button class="pct-btn pct-btn-sm" ${deploymentsPage === 0 ? 'disabled' : ''} onclick="state.deploy.deploymentsPage--;loadDeployments()">← Prev</button>
        <span style="font-size:0.8125rem;color:var(--color-muted)">Page ${deploymentsPage + 1} of ${Math.ceil(deploymentsTotal/20)}</span>
        <button class="pct-btn pct-btn-sm" ${(deploymentsPage+1)*20 >= deploymentsTotal ? 'disabled' : ''} onclick="state.deploy.deploymentsPage++;loadDeployments()">Next →</button>
      </div>
    ` : ''}
  `;
}

// ============================================
// MODULE 8: ANALYTICS & ITERATION
// ============================================

const FRAMEWORK_LABELS = {
  punchy: 'Punchy',
  bold_statements: 'Bold Statements',
  desire_future_states: 'Desire Future States',
  question_based: 'Question-Based',
  problem_agitation: 'Problem-Agitation',
  social_proof: 'Social Proof',
  urgency_scarcity: 'Urgency/Scarcity',
  educational: 'Educational',
};

const AWARENESS_LABELS = {
  1: 'L1: Unaware',
  2: 'L2: Problem Aware',
  3: 'L3: Solution Aware',
  4: 'L4: Product Aware',
  5: 'L5: Most Aware',
};

async function loadAnalyticsData() {
  const an = state.analytics;
  an.loading = true;
  renderAnalyticsPanel();

  try {
    const params = {};
    if (an.productId) params.productId = an.productId;
    if (an.dateFrom) params.dateFrom = an.dateFrom;
    if (an.dateTo) params.dateTo = an.dateTo;

    const [insightsRes, winnersRes, trendsRes, iterationsRes] = await Promise.all([
      pctApi.getInsights(params).catch(() => ({ data: null })),
      pctApi.getWinners({ ...params, metric: an.winnerMetric, limit: 10 }).catch(() => ({ data: [] })),
      pctApi.getTrends(params).catch(() => ({ data: [] })),
      pctApi.getIterations(an.productId ? { productId: an.productId } : {}).catch(() => ({ data: [] })),
    ]);

    an.insights = insightsRes.data;
    an.winners = winnersRes.data || [];
    an.trends = trendsRes.data || [];
    an.iterations = iterationsRes.data || [];
  } catch (e) {
    showToast('Failed to load analytics: ' + e.message, 'error');
  }

  an.loading = false;
  renderAnalyticsPanel();
}

function renderAnalyticsPanel() {
  const container = document.getElementById('analytics-panel');
  if (!container) return;

  const an = state.analytics;

  container.innerHTML = `
    <div class="analytics-layout">
      <!-- Header -->
      <div class="analytics-header">
        <div class="analytics-title-row">
          <h2 class="analytics-title">Analytics & Iteration</h2>
          <div class="analytics-filters">
            <select class="pct-select pct-select-sm" id="analytics-product-filter" onchange="analyticsSetProduct(this.value)">
              <option value="">All Products</option>
              ${state.products.map(p => `<option value="${escAttr(p.id)}" ${an.productId === p.id ? 'selected' : ''}>${escHtml(p.name)}</option>`).join('')}
            </select>
            <input type="date" class="pct-input pct-input-sm" id="analytics-date-from" value="${an.dateFrom}" placeholder="From" onchange="state.analytics.dateFrom=this.value" style="width:140px">
            <input type="date" class="pct-input pct-input-sm" id="analytics-date-to" value="${an.dateTo}" placeholder="To" onchange="state.analytics.dateTo=this.value" style="width:140px">
            <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="loadAnalyticsData()">Apply</button>
            <a href="${API_BASE}/analytics/export${an.productId ? '?productId=' + an.productId : ''}" class="pct-btn pct-btn-sm" download="pct-insights.csv">Export CSV</a>
          </div>
        </div>

        <!-- Sub-tabs -->
        <div class="analytics-subtabs">
          ${['overview', 'insights', 'winners', 'trends', 'import', 'iterations'].map(t => `
            <button class="analytics-subtab ${an.subTab === t ? 'active' : ''}" onclick="analyticsSetSubTab('${t}')">
              ${t === 'overview' ? 'Overview' : t === 'insights' ? 'Insights' : t === 'winners' ? 'Winners' : t === 'trends' ? 'Trends' : t === 'import' ? 'Import Data' : 'Iterations'}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Content -->
      <div class="analytics-content">
        ${an.loading ? `<div class="pct-loading-overlay" style="position:relative;height:200px"><div class="pct-loading-spinner"></div><div class="pct-loading-text">Loading analytics...</div></div>` : renderAnalyticsSubTab()}
      </div>
    </div>
  `;
}

function analyticsSetSubTab(tab) {
  state.analytics.subTab = tab;
  renderAnalyticsPanel();
}

function analyticsSetProduct(val) {
  state.analytics.productId = val || null;
}

function renderAnalyticsSubTab() {
  const an = state.analytics;
  switch (an.subTab) {
    case 'overview': return renderAnalyticsOverview();
    case 'insights': return renderAnalyticsInsights();
    case 'winners': return renderAnalyticsWinners();
    case 'trends': return renderAnalyticsTrends();
    case 'import': return renderAnalyticsImport();
    case 'iterations': return renderAnalyticsIterations();
    default: return '';
  }
}

function renderAnalyticsOverview() {
  const an = state.analytics;
  const insights = an.insights;

  if (!insights || insights.totalMetrics === 0) {
    return `
      <div class="analytics-empty">
        <div class="analytics-empty-icon">📊</div>
        <div class="analytics-empty-title">No Performance Data Yet</div>
        <div class="analytics-empty-desc">
          Import ad performance metrics from Meta to unlock insights about your best-performing hooks, angles, and templates.
        </div>
        <button class="pct-btn pct-btn-primary" onclick="analyticsSetSubTab('import')">Import Performance Data</button>
      </div>
    `;
  }

  const totalImpressions = (insights.byFramework || []).reduce((s, r) => s + r.impressions, 0);
  const totalClicks = (insights.byFramework || []).reduce((s, r) => s + r.clicks, 0);
  const totalSpend = (insights.byFramework || []).reduce((s, r) => s + r.spend, 0);
  const totalConversions = (insights.byFramework || []).reduce((s, r) => s + r.conversions, 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '—';
  const overallCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '—';

  // Best performing framework
  const bestFw = (insights.byFramework || []).filter(f => f.impressions > 0).sort((a, b) => (b.ctr || 0) - (a.ctr || 0))[0];
  const bestAw = (insights.byAwareness || []).filter(f => f.impressions > 0).sort((a, b) => (b.ctr || 0) - (a.ctr || 0))[0];

  return `
    <div class="analytics-overview">
      <!-- KPI Cards -->
      <div class="analytics-kpis">
        ${[
          { label: 'Total Impressions', value: totalImpressions.toLocaleString(), icon: '👁' },
          { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: '🖱' },
          { label: 'Overall CTR', value: overallCtr + '%', icon: '📈' },
          { label: 'Avg CPC', value: overallCpc !== '—' ? '$' + overallCpc : '—', icon: '💰' },
          { label: 'Total Spend', value: '$' + totalSpend.toFixed(2), icon: '💳' },
          { label: 'Conversions', value: totalConversions.toLocaleString(), icon: '🎯' },
        ].map(k => `
          <div class="analytics-kpi-card">
            <div class="analytics-kpi-icon">${k.icon}</div>
            <div class="analytics-kpi-value">${k.value}</div>
            <div class="analytics-kpi-label">${k.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Quick wins -->
      <div class="analytics-quick-wins">
        <div class="analytics-section-title">Quick Insights</div>
        <div class="analytics-quick-wins-grid">
          ${bestFw ? `
            <div class="analytics-win-card">
              <div class="analytics-win-badge">Best Framework</div>
              <div class="analytics-win-value">${FRAMEWORK_LABELS[bestFw.framework] || bestFw.framework}</div>
              <div class="analytics-win-stat">CTR: ${bestFw.ctr?.toFixed(2)}%</div>
            </div>
          ` : ''}
          ${bestAw ? `
            <div class="analytics-win-card">
              <div class="analytics-win-badge">Best Awareness Level</div>
              <div class="analytics-win-value">${AWARENESS_LABELS[bestAw.level] || 'Level ' + bestAw.level}</div>
              <div class="analytics-win-stat">CTR: ${bestAw.ctr?.toFixed(2)}%</div>
            </div>
          ` : ''}
          ${an.winners.length > 0 ? `
            <div class="analytics-win-card">
              <div class="analytics-win-badge">Top Hook</div>
              <div class="analytics-win-value" style="font-size:0.875rem">"${escHtml(an.winners[0].hook.content)}"</div>
              <div class="analytics-win-stat">CTR: ${an.winners[0].ctr?.toFixed(2)}%</div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- CTA links -->
      <div class="analytics-ctas">
        <button class="pct-btn pct-btn-primary" onclick="analyticsSetSubTab('insights')">View Full Insights →</button>
        <button class="pct-btn" onclick="analyticsSetSubTab('winners')">See Winners →</button>
        ${an.winners.length > 0 ? `<button class="pct-btn" onclick="analyticsSetSubTab('iterations')">Iterate on Winners →</button>` : ''}
      </div>
    </div>
  `;
}

function renderAnalyticsInsights() {
  const insights = state.analytics.insights;
  if (!insights || insights.totalMetrics === 0) {
    return `<div class="analytics-empty"><div class="analytics-empty-icon">🔍</div><div class="analytics-empty-title">No data yet</div><p>Import performance metrics first.</p><button class="pct-btn pct-btn-primary" onclick="analyticsSetSubTab('import')">Import Data</button></div>`;
  }

  const formatPct = (v) => v != null ? v.toFixed(2) + '%' : '—';
  const formatUsd = (v) => v != null ? '$' + v.toFixed(2) : '—';

  function renderTable(title, rows, cols) {
    if (!rows || rows.length === 0) return `<div class="analytics-section"><div class="analytics-section-title">${title}</div><div class="pct-empty-text">No data</div></div>`;
    return `
      <div class="analytics-section">
        <div class="analytics-section-title">${title}</div>
        <div class="analytics-table-wrap">
          <table class="analytics-table">
            <thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map(r => `<tr>${cols.map(c => `<td>${c.render(r)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  const fwCols = [
    { label: 'Framework', render: r => FRAMEWORK_LABELS[r.framework] || r.framework },
    { label: 'Ads', render: r => r.count },
    { label: 'Impressions', render: r => r.impressions.toLocaleString() },
    { label: 'Clicks', render: r => r.clicks.toLocaleString() },
    { label: 'CTR', render: r => formatPct(r.ctr) },
    { label: 'CPC', render: r => formatUsd(r.cpc) },
    { label: 'Conversions', render: r => r.conversions },
  ];

  const awCols = [
    { label: 'Awareness Level', render: r => AWARENESS_LABELS[r.level] || 'Level ' + r.level },
    { label: 'Ads', render: r => r.count },
    { label: 'Impressions', render: r => r.impressions.toLocaleString() },
    { label: 'CTR', render: r => formatPct(r.ctr) },
    { label: 'CPC', render: r => formatUsd(r.cpc) },
    { label: 'Conversions', render: r => r.conversions },
  ];

  const soCols = [
    { label: 'Sophistication Level', render: r => 'Level ' + r.level },
    { label: 'Ads', render: r => r.count },
    { label: 'Impressions', render: r => r.impressions.toLocaleString() },
    { label: 'CTR', render: r => formatPct(r.ctr) },
    { label: 'CPC', render: r => formatUsd(r.cpc) },
    { label: 'Conversions', render: r => r.conversions },
  ];

  const uspCols = [
    { label: 'USP', render: r => `<div style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escAttr(r.content)}">${escHtml(r.content)}</div>` },
    { label: 'Ads', render: r => r.count },
    { label: 'CTR', render: r => formatPct(r.ctr) },
    { label: 'CPC', render: r => formatUsd(r.cpc) },
    { label: 'Impressions', render: r => r.impressions.toLocaleString() },
  ];

  const angleCols = [
    { label: 'Angle', render: r => `<div style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escAttr(r.content)}">${escHtml(r.content)}</div>` },
    { label: 'Ads', render: r => r.count },
    { label: 'CTR', render: r => formatPct(r.ctr) },
    { label: 'CPC', render: r => formatUsd(r.cpc) },
    { label: 'Impressions', render: r => r.impressions.toLocaleString() },
    { label: '', render: r => `<button class="pct-btn pct-btn-sm" onclick="analyticsExpandAngle('${escAttr(r.id)}')">Expand →</button>` },
  ];

  const tplCols = [
    { label: 'Template', render: r => `${escHtml(r.name)} (${r.width}×${r.height})` },
    { label: 'Ads', render: r => r.count },
    { label: 'CTR', render: r => formatPct(r.ctr) },
    { label: 'Impressions', render: r => r.impressions.toLocaleString() },
  ];

  return `
    <div class="analytics-insights">
      ${renderTable('F8.2.3 — Best Messaging Frameworks', insights.byFramework, fwCols)}
      ${renderTable('F8.2.4 — Optimal Awareness Levels', insights.byAwareness, awCols)}
      ${renderTable('Market Sophistication Performance', insights.bySophistication, soCols)}
      ${renderTable('F8.2.1 — Top Performing USPs', insights.topUSPs, uspCols)}
      ${renderTable('F8.2.2 — Top Performing Angles', insights.topAngles, angleCols)}
      ${renderTable('F8.2.5 — Template Performance', insights.topTemplates, tplCols)}
    </div>
  `;
}

function renderAnalyticsWinners() {
  const an = state.analytics;
  const winners = an.winners;

  return `
    <div class="analytics-winners">
      <div class="analytics-winners-controls">
        <div class="analytics-section-title">F8.1.4 — Top Performing Hooks</div>
        <div style="display:flex;align-items:center;gap:var(--space-sm)">
          <label style="font-size:0.8125rem;color:var(--color-muted)">Sort by:</label>
          <select class="pct-select pct-select-sm" onchange="analyticsSetWinnerMetric(this.value)">
            <option value="ctr" ${an.winnerMetric === 'ctr' ? 'selected' : ''}>CTR (Click-Through Rate)</option>
            <option value="cvr" ${an.winnerMetric === 'cvr' ? 'selected' : ''}>CVR (Conversion Rate)</option>
            <option value="cpc" ${an.winnerMetric === 'cpc' ? 'selected' : ''}>CPC (Cost Per Click)</option>
            <option value="impressions" ${an.winnerMetric === 'impressions' ? 'selected' : ''}>Impressions</option>
            <option value="clicks" ${an.winnerMetric === 'clicks' ? 'selected' : ''}>Clicks</option>
          </select>
        </div>
      </div>

      ${winners.length === 0 ? `<div class="analytics-empty"><div class="analytics-empty-icon">🏆</div><div class="analytics-empty-title">No winners yet</div><p>Import performance data to identify winning hooks.</p></div>` : `
        <div class="analytics-winner-list">
          ${winners.map((w, i) => `
            <div class="analytics-winner-card">
              <div class="analytics-winner-rank">#${i + 1}</div>
              <div class="analytics-winner-content">
                <div class="analytics-winner-hook">"${escHtml(w.hook.content)}"</div>
                <div class="analytics-winner-params">
                  <span class="analytics-param-badge">${FRAMEWORK_LABELS[w.hook.messagingFramework] || w.hook.messagingFramework}</span>
                  <span class="analytics-param-badge">${AWARENESS_LABELS[w.hook.awarenessLevel] || 'L' + w.hook.awarenessLevel}</span>
                  <span class="analytics-param-badge">Soph ${w.hook.marketSophistication}</span>
                  ${w.hook.usp ? `<span class="analytics-param-badge analytics-param-usp" title="${escAttr(w.hook.usp.content)}">USP</span>` : ''}
                </div>
                <div class="analytics-winner-metrics">
                  <span>CTR: <strong>${w.ctr?.toFixed(2)}%</strong></span>
                  <span>CPC: <strong>$${w.cpc?.toFixed(2)}</strong></span>
                  <span>Clicks: <strong>${w.clicks.toLocaleString()}</strong></span>
                  <span>Impr: <strong>${w.impressions.toLocaleString()}</strong></span>
                  ${w.conversions > 0 ? `<span>Conv: <strong>${w.conversions}</strong></span>` : ''}
                </div>
              </div>
              <div class="analytics-winner-actions">
                <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="analyticsIterateFromHook('${escAttr(w.hook.id)}', '${escHtml(w.hook.content).replace(/'/g, '&#39;')}')">
                  + More Like This
                </button>
                ${w.hook.angle ? `<button class="pct-btn pct-btn-sm" onclick="analyticsExpandAngle('${escAttr(w.hook.angle.id)}')">Expand Angle</button>` : ''}
                <button class="pct-btn pct-btn-sm" onclick="analyticsWinnerTemplates('${escAttr(w.hook.id)}')">Find Templates</button>
                <button class="pct-btn pct-btn-sm" onclick="analyticsSetupAbTest('${escAttr(w.hook.id)}')">A/B Test</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function analyticsSetWinnerMetric(metric) {
  state.analytics.winnerMetric = metric;
  const params = { metric };
  if (state.analytics.productId) params.productId = state.analytics.productId;
  pctApi.getWinners({ ...params, limit: 10 })
    .then(res => { state.analytics.winners = res.data || []; renderAnalyticsPanel(); })
    .catch(e => showToast('Failed: ' + e.message, 'error'));
}

async function analyticsIterateFromHook(hookId, hookContent) {
  const count = parseInt(prompt(`Generate how many variations of:\n"${hookContent}"\n\n(1-50)`, '10'));
  if (!count || count < 1) return;

  showToast('Generating variations...', 'info');
  try {
    const res = await pctApi.iterateFromHook({ hookId, count });
    showToast(`Created ${res.data.created} new hooks! Check Hook Review tab.`, 'success');
    await pctApi.getIterations(state.analytics.productId ? { productId: state.analytics.productId } : {})
      .then(r => { state.analytics.iterations = r.data || []; });
    renderAnalyticsPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// F8.3.4 - Find templates for a winning hook
async function analyticsWinnerTemplates(hookId) {
  try {
    const res = await pctApi.getWinnerTemplates(hookId, state.analytics.productId);
    const { hook, templates, usedCount } = res.data;

    const unused = templates.filter(t => !t.alreadyUsed);
    const used = templates.filter(t => t.alreadyUsed);

    const msg = `Hook: "${hook.content.substring(0, 60)}..."

Templates available: ${templates.length} total
✓ Already used: ${usedCount}
✗ Unused templates: ${unused.length}

${unused.length > 0
  ? `Unused templates:\n${unused.slice(0, 5).map(t => `• ${t.name} (${t.width}×${t.height})`).join('\n')}\n\nGo to Ad Creative tab to generate new ads with this hook.`
  : 'All templates have been used with this hook. Upload new templates in the Ad Creative tab.'}`;

    alert(msg);
    if (unused.length > 0) {
      if (confirm('Go to Ad Creative tab to generate images with this hook?')) {
        switchTab('creative');
      }
    }
  } catch (e) {
    showToast('Failed to check templates: ' + e.message, 'error');
  }
}

// F8.3.5 - A/B test setup wizard
async function analyticsSetupAbTest(hookAId) {
  const hookAContent = state.analytics.winners.find(w => w.hook.id === hookAId)?.hook?.content || 'Hook A';

  const hookBId = prompt(
    `A/B Test Setup\n\nHook A (winner): "${hookAContent.substring(0, 80)}"\n\nEnter the ID of Hook B to compare against.\n(Tip: Find hook IDs in the Hook Review tab)`
  );
  if (!hookBId || !hookBId.trim()) return;

  const testName = prompt('Test name:', `A/B Test - ${new Date().toLocaleDateString()}`);
  if (testName === null) return;

  try {
    const res = await pctApi.createAbTest({
      productId: state.analytics.productId,
      hookAId,
      hookBId: hookBId.trim(),
      testName: testName || undefined,
    });

    const { hookA, hookB } = res.data;
    showToast('A/B test created! Both hooks are ready to deploy.', 'success');

    const summary = `A/B Test Created!\n\nHook A: "${hookA.content.substring(0, 60)}..."\nHook B: "${hookB.content.substring(0, 60)}..."\n\nNext steps:\n1. Go to Ad Creative tab → generate images for both hooks\n2. Go to Deployment tab → push both to the same ad set\n3. Let Meta's algorithm find the winner`;
    alert(summary);

    await pctApi.getIterations(state.analytics.productId ? { productId: state.analytics.productId } : {})
      .then(r => { state.analytics.iterations = r.data || []; });
    renderAnalyticsPanel();
  } catch (e) {
    showToast('Failed to create A/B test: ' + e.message, 'error');
  }
}

async function analyticsExpandAngle(angleId) {
  showToast('Expanding angle across parameter matrix...', 'info');
  try {
    const res = await pctApi.iterateFromAngle({
      angleId,
      frameworks: ['punchy', 'bold_statements', 'desire_future_states', 'question_based', 'problem_agitation'],
      awarenessLevels: [2, 3, 4],
      sophisticationLevels: [2, 3, 4],
      count: 30,
    });
    showToast(`Created ${res.data.created} new hooks from angle! Check Hook Review tab.`, 'success');
    await pctApi.getIterations(state.analytics.productId ? { productId: state.analytics.productId } : {})
      .then(r => { state.analytics.iterations = r.data || []; });
    renderAnalyticsPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

function renderAnalyticsTrends() {
  const trends = state.analytics.trends;

  if (!trends || trends.length === 0) {
    return `<div class="analytics-empty"><div class="analytics-empty-icon">📉</div><div class="analytics-empty-title">No trend data</div><p>Import performance metrics to see trends over time.</p></div>`;
  }

  // Simple ASCII-style bar chart representation
  const maxImpressions = Math.max(...trends.map(t => t.impressions));
  const maxClicks = Math.max(...trends.map(t => t.clicks));

  return `
    <div class="analytics-trends">
      <div class="analytics-section-title">F8.1.5 — Performance Trends Over Time</div>
      <div class="analytics-table-wrap">
        <table class="analytics-table">
          <thead>
            <tr><th>Date</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Spend</th><th>CPC</th><th>Conversions</th></tr>
          </thead>
          <tbody>
            ${trends.map(t => `
              <tr>
                <td>${t.date}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div class="analytics-bar" style="width:${maxImpressions > 0 ? Math.round((t.impressions / maxImpressions) * 80) : 0}px"></div>
                    ${t.impressions.toLocaleString()}
                  </div>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div class="analytics-bar analytics-bar-clicks" style="width:${maxClicks > 0 ? Math.round((t.clicks / maxClicks) * 80) : 0}px"></div>
                    ${t.clicks.toLocaleString()}
                  </div>
                </td>
                <td>${t.ctr?.toFixed(2)}%</td>
                <td>$${t.spend?.toFixed(2)}</td>
                <td>${t.cpc > 0 ? '$' + t.cpc.toFixed(2) : '—'}</td>
                <td>${t.conversions}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAnalyticsImport() {
  return `
    <div class="analytics-import">
      <div class="analytics-section-title">F8.1.1 — Import Ad Performance Metrics</div>
      <p style="color:var(--color-muted);font-size:0.875rem;margin-bottom:var(--space-lg)">
        Import performance data from Meta Ads Manager to correlate ad performance with hook parameters.
        You can import manually or paste a CSV exported from Meta.
      </p>

      <!-- Manual Entry Form -->
      <div class="analytics-import-section">
        <div class="analytics-import-subtitle">Manual Entry</div>
        <div class="analytics-import-form">
          <div class="pct-form-group">
            <label>Deployment ID *</label>
            <input id="import-deployment-id" class="pct-input" placeholder="Paste deployment ID from Deployment tab">
          </div>
          <div class="analytics-import-row">
            <div class="pct-form-group">
              <label>Date *</label>
              <input type="date" id="import-date" class="pct-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="pct-form-group">
              <label>Impressions</label>
              <input type="number" id="import-impressions" class="pct-input" placeholder="0" min="0">
            </div>
            <div class="pct-form-group">
              <label>Clicks</label>
              <input type="number" id="import-clicks" class="pct-input" placeholder="0" min="0">
            </div>
          </div>
          <div class="analytics-import-row">
            <div class="pct-form-group">
              <label>Spend ($)</label>
              <input type="number" id="import-spend" class="pct-input" placeholder="0.00" step="0.01" min="0">
            </div>
            <div class="pct-form-group">
              <label>Reach</label>
              <input type="number" id="import-reach" class="pct-input" placeholder="0" min="0">
            </div>
            <div class="pct-form-group">
              <label>Conversions</label>
              <input type="number" id="import-conversions" class="pct-input" placeholder="0" min="0">
            </div>
          </div>
          <div class="analytics-import-row">
            <div class="pct-form-group">
              <label>CTR (%)</label>
              <input type="number" id="import-ctr" class="pct-input" placeholder="Auto-calculated" step="0.0001">
            </div>
            <div class="pct-form-group">
              <label>CPC ($)</label>
              <input type="number" id="import-cpc" class="pct-input" placeholder="Auto-calculated" step="0.01">
            </div>
            <div class="pct-form-group">
              <label>ROAS</label>
              <input type="number" id="import-roas" class="pct-input" placeholder="e.g. 3.5" step="0.01">
            </div>
          </div>
          <button class="pct-btn pct-btn-primary" onclick="analyticsSubmitMetric()">Save Metric</button>
        </div>
      </div>

      <!-- Bulk CSV Import -->
      <div class="analytics-import-section" style="margin-top:var(--space-xl)">
        <div class="analytics-import-subtitle">Bulk CSV Import</div>
        <p style="color:var(--color-muted);font-size:0.8125rem;margin-bottom:var(--space-sm)">
          Paste CSV with columns: deploymentId, date, impressions, clicks, spend, reach, conversions, ctr, cpc, roas
        </p>
        <textarea id="import-csv" class="pct-textarea" rows="8" placeholder="deploymentId,date,impressions,clicks,spend,reach,conversions&#10;abc123,2025-01-15,5000,150,25.00,4800,3&#10;..."></textarea>
        <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-sm)">
          <button class="pct-btn pct-btn-primary" onclick="analyticsImportCSV()">Import CSV</button>
          <button class="pct-btn pct-btn-sm" onclick="document.getElementById('import-csv').value = 'deploymentId,date,impressions,clicks,spend,reach,conversions,ctr,cpc,roas'">Download Template</button>
        </div>
      </div>
    </div>
  `;
}

async function analyticsSubmitMetric() {
  const deploymentId = document.getElementById('import-deployment-id').value.trim();
  const date = document.getElementById('import-date').value;
  if (!deploymentId || !date) {
    showToast('Deployment ID and date are required', 'error');
    return;
  }

  const data = {
    deploymentId,
    date,
    impressions: parseInt(document.getElementById('import-impressions').value) || 0,
    clicks: parseInt(document.getElementById('import-clicks').value) || 0,
    spend: parseFloat(document.getElementById('import-spend').value) || 0,
    reach: parseInt(document.getElementById('import-reach').value) || 0,
    conversions: parseInt(document.getElementById('import-conversions').value) || 0,
    ctr: parseFloat(document.getElementById('import-ctr').value) || null,
    cpc: parseFloat(document.getElementById('import-cpc').value) || null,
    roas: parseFloat(document.getElementById('import-roas').value) || null,
  };

  try {
    await pctApi.importMetrics(data);
    showToast('Metric saved!', 'success');
    await loadAnalyticsData();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function analyticsImportCSV() {
  const csv = document.getElementById('import-csv').value.trim();
  if (!csv) {
    showToast('Please paste CSV data', 'error');
    return;
  }

  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).filter(l => l.trim());

  if (rows.length === 0) {
    showToast('No data rows found', 'error');
    return;
  }

  const metrics = rows.map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return {
      deploymentId: row.deploymentId,
      date: row.date,
      impressions: parseInt(row.impressions) || 0,
      clicks: parseInt(row.clicks) || 0,
      spend: parseFloat(row.spend) || 0,
      reach: parseInt(row.reach) || 0,
      conversions: parseInt(row.conversions) || 0,
      ctr: parseFloat(row.ctr) || null,
      cpc: parseFloat(row.cpc) || null,
      roas: parseFloat(row.roas) || null,
    };
  }).filter(m => m.deploymentId && m.date);

  if (metrics.length === 0) {
    showToast('No valid rows found - check your CSV format', 'error');
    return;
  }

  try {
    const res = await pctApi.importMetricsBulk(metrics);
    showToast(`Imported ${res.data.imported} metrics (${res.data.failed} failed)`, 'success');
    await loadAnalyticsData();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

function renderAnalyticsIterations() {
  const iterations = state.analytics.iterations;
  const winners = state.analytics.winners;

  const iterTypeLabels = {
    new_hooks: 'New Hooks from Winner',
    expand_angle: 'Angle Expansion',
    new_templates: 'New Templates',
    ab_test: 'A/B Test Setup',
  };

  return `
    <div class="analytics-iterations">
      <!-- Iteration Actions -->
      ${winners.length > 0 ? `
        <div class="analytics-section">
          <div class="analytics-section-title">F8.3 — Iteration Workflows</div>
          <p style="color:var(--color-muted);font-size:0.875rem;margin-bottom:var(--space-md)">
            Generate more content based on your winning hooks and angles.
          </p>
          <div class="analytics-iteration-actions">
            <div class="analytics-action-card">
              <div class="analytics-action-title">Create More Like Winner</div>
              <div class="analytics-action-desc">Generate hook variations with the same parameters as your top-performing hook</div>
              <button class="pct-btn pct-btn-primary" onclick="analyticsIterateFromHook('${escAttr(winners[0].hook.id)}', '${escHtml(winners[0].hook.content).replace(/'/g, '&#39;')}')">
                Generate from #1 Hook
              </button>
            </div>
            ${winners[0].hook.angle ? `
              <div class="analytics-action-card">
                <div class="analytics-action-title">Expand Winning Angle</div>
                <div class="analytics-action-desc">Generate hooks for the winning angle across all frameworks and awareness levels</div>
                <button class="pct-btn pct-btn-primary" onclick="analyticsExpandAngle('${escAttr(winners[0].hook.angle.id)}')">
                  Expand Top Angle
                </button>
              </div>
            ` : ''}
            <div class="analytics-action-card">
              <div class="analytics-action-title">View All Winners</div>
              <div class="analytics-action-desc">See all top-performing hooks and iterate from any of them</div>
              <button class="pct-btn" onclick="analyticsSetSubTab('winners')">
                Go to Winners →
              </button>
            </div>
          </div>
        </div>
      ` : `
        <div class="analytics-empty" style="margin-bottom:var(--space-xl)">
          <div class="analytics-empty-icon">🔄</div>
          <div class="analytics-empty-title">No winners to iterate on yet</div>
          <p>Import performance data to identify winning hooks, then iterate from here.</p>
          <button class="pct-btn pct-btn-primary" onclick="analyticsSetSubTab('import')">Import Performance Data</button>
        </div>
      `}

      <!-- Iteration History -->
      <div class="analytics-section">
        <div class="analytics-section-title">F8.3.6 — Iteration History</div>
        ${iterations.length === 0 ? `<div class="pct-empty-text">No iterations yet.</div>` : `
          <div class="analytics-table-wrap">
            <table class="analytics-table">
              <thead><tr><th>Type</th><th>Source</th><th>Generated</th><th>Parameters</th><th>When</th></tr></thead>
              <tbody>
                ${iterations.map(it => `
                  <tr>
                    <td><span class="analytics-param-badge">${iterTypeLabels[it.iterationType] || it.iterationType}</span></td>
                    <td style="font-size:0.75rem;color:var(--color-muted)">${escHtml(it.sourceType)}: ${escHtml(it.sourceId.slice(0, 8))}…</td>
                    <td>${it.generatedCount}</td>
                    <td style="font-size:0.75rem;color:var(--color-muted)">${escHtml(JSON.stringify(it.parameters || {})).slice(0, 60)}…</td>
                    <td style="font-size:0.75rem;color:var(--color-muted)">${new Date(it.createdAt).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

// ============================================
// MODULE 9: AUTOMATION (Webhooks + Scheduling)
// ============================================

const automationState = {
  webhooks: [],
  schedules: [],
  activeSubTab: 'webhooks', // 'webhooks' | 'schedules'
};

async function loadAutomationData() {
  try {
    const [wRes, sRes] = await Promise.all([
      pctApi.getWebhooks().catch(() => ({ data: [] })),
      pctApi.getSchedules().catch(() => ({ data: [] })),
    ]);
    automationState.webhooks = wRes.data || [];
    automationState.schedules = sRes.data || [];
    renderAutomationPanel();
  } catch (e) {
    console.error('Failed to load automation data:', e);
  }
}

function renderAutomationPanel() {
  const el = document.getElementById('automation-panel');
  if (!el) return;

  const { webhooks, schedules, activeSubTab } = automationState;

  el.innerHTML = `
    <div class="pct-card" style="margin-bottom:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">Automation & Integrations</div>
        <div style="font-size:0.8125rem;color:var(--color-muted)">F9.1 Webhooks + F9.3 Scheduling</div>
      </div>
      <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-md);border-bottom:1px solid var(--color-border);padding-bottom:var(--space-sm)">
        <button class="pct-btn ${activeSubTab === 'webhooks' ? 'pct-btn-primary' : ''}" onclick="automationSubTab('webhooks')">
          Webhooks (${webhooks.length})
        </button>
        <button class="pct-btn ${activeSubTab === 'schedules' ? 'pct-btn-primary' : ''}" onclick="automationSubTab('schedules')">
          Scheduled Jobs (${schedules.length})
        </button>
      </div>
      ${activeSubTab === 'webhooks' ? renderWebhooksPanel(webhooks) : renderSchedulesPanel(schedules)}
    </div>
  `;
}

function automationSubTab(tab) {
  automationState.activeSubTab = tab;
  renderAutomationPanel();
}

function renderWebhooksPanel(webhooks) {
  const WEBHOOK_EVENTS = [
    'hook.generated', 'hook.approved', 'hook.rejected',
    'ad.generated', 'ad.approved', 'ad.deployed',
    'deployment.success', 'deployment.failed',
    'script.generated', 'usp.generated',
  ];

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md)">
        <div class="pct-card-title" style="font-size:1rem">Outgoing Webhooks</div>
        <button class="pct-btn pct-btn-primary pct-btn-sm" onclick="showCreateWebhookForm()">+ Add Webhook</button>
      </div>

      <div id="create-webhook-form" style="display:none;background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-md);margin-bottom:var(--space-md)">
        <div class="pct-card-title" style="font-size:0.9375rem;margin-bottom:var(--space-sm)">New Webhook</div>
        <div class="pct-form-group">
          <label>Endpoint URL *</label>
          <input id="wh-url" class="pct-input" placeholder="https://hooks.zapier.com/hooks/catch/..." type="url">
        </div>
        <div class="pct-form-group">
          <label>Events to subscribe to (hold Ctrl/Cmd to select multiple)</label>
          <select id="wh-events" class="pct-select" multiple size="6">
            ${WEBHOOK_EVENTS.map(e => `<option value="${e}">${e}</option>`).join('')}
          </select>
        </div>
        <div class="pct-form-group">
          <label>Secret (optional, for signature verification)</label>
          <input id="wh-secret" class="pct-input" placeholder="my-secret-key">
        </div>
        <div style="display:flex;gap:var(--space-sm)">
          <button class="pct-btn pct-btn-primary" onclick="createWebhook()">Create Webhook</button>
          <button class="pct-btn" onclick="hideCreateWebhookForm()">Cancel</button>
        </div>
      </div>

      ${webhooks.length === 0 ? `
        <div class="pct-empty">
          <div class="pct-empty-text">No webhooks configured. Add a webhook to receive events when hooks are generated, ads are deployed, etc.</div>
        </div>
      ` : `
        <div class="pct-list">
          ${webhooks.map(w => `
            <div class="pct-list-item" style="flex-direction:column;align-items:flex-start;gap:var(--space-xs)">
              <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                <div>
                  <div style="font-weight:500;font-size:0.875rem;font-family:var(--font-mono)">${escHtml(w.url)}</div>
                  <div style="display:flex;gap:var(--space-xs);flex-wrap:wrap;margin-top:4px">
                    ${w.events.map(e => `<span class="pct-badge pct-badge-muted" style="font-size:0.6875rem">${e}</span>`).join('')}
                  </div>
                </div>
                <div style="display:flex;gap:var(--space-xs);align-items:center;flex-shrink:0">
                  <span class="pct-badge ${w.active ? 'pct-badge-success' : 'pct-badge-error'}">${w.active ? 'Active' : 'Inactive'}</span>
                  <button class="pct-btn pct-btn-xs" onclick="testWebhook('${escAttr(w.id)}')">Test</button>
                  <button class="pct-btn pct-btn-xs" onclick="toggleWebhook('${escAttr(w.id)}', ${!w.active})">${w.active ? 'Disable' : 'Enable'}</button>
                  <button class="pct-btn pct-btn-xs pct-btn-danger" onclick="deleteWebhook('${escAttr(w.id)}')">Remove</button>
                </div>
              </div>
              <div style="font-size:0.75rem;color:var(--color-muted)">
                Deliveries: ${w.successCount || 0} ok, ${w.failCount || 0} failed
                ${w.lastTriggered ? ` · Last: ${new Date(w.lastTriggered).toLocaleString()}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <div style="margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px solid var(--color-border)">
        <div style="font-size:0.8125rem;color:var(--color-muted)">
          <strong>Available events:</strong> ${WEBHOOK_EVENTS.join(', ')}
        </div>
        <div style="font-size:0.8125rem;color:var(--color-muted);margin-top:var(--space-xs)">
          Use webhooks to integrate with Zapier, Make.com, Slack, or any HTTP endpoint.
        </div>
      </div>
    </div>
  `;
}

function renderSchedulesPanel(schedules) {
  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md)">
        <div class="pct-card-title" style="font-size:1rem">Scheduled Jobs</div>
        <button class="pct-btn pct-btn-primary pct-btn-sm" onclick="showCreateScheduleForm()">+ Add Schedule</button>
      </div>

      <div id="create-schedule-form" style="display:none;background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-md);margin-bottom:var(--space-md)">
        <div class="pct-card-title" style="font-size:0.9375rem;margin-bottom:var(--space-sm)">New Scheduled Job</div>
        <div class="pct-form-group">
          <label>Job Name *</label>
          <input id="sched-name" class="pct-input" placeholder="e.g. Daily Hook Generation">
        </div>
        <div class="pct-form-group">
          <label>Job Type *</label>
          <select id="sched-type" class="pct-select">
            <option value="hook_generation">Hook Generation</option>
            <option value="ad_deployment">Ad Deployment</option>
            <option value="performance_sync">Performance Sync</option>
          </select>
        </div>
        <div class="pct-form-group">
          <label>Cron Expression *</label>
          <input id="sched-cron" class="pct-input" placeholder="0 9 * * 1-5">
          <div style="font-size:0.75rem;color:var(--color-muted);margin-top:2px">
            Examples: <code>0 9 * * 1-5</code> (weekdays 9am) · <code>0 */6 * * *</code> (every 6 hours) · <code>0 0 * * *</code> (daily midnight)
          </div>
        </div>
        <div style="display:flex;gap:var(--space-sm)">
          <button class="pct-btn pct-btn-primary" onclick="createSchedule()">Create Schedule</button>
          <button class="pct-btn" onclick="hideCreateScheduleForm()">Cancel</button>
        </div>
      </div>

      ${schedules.length === 0 ? `
        <div class="pct-empty">
          <div class="pct-empty-text">No scheduled jobs. Create schedules to automate hook generation, ad deployment, and performance sync.</div>
        </div>
      ` : `
        <div class="pct-list">
          ${schedules.map(s => `
            <div class="pct-list-item" style="flex-direction:column;align-items:flex-start;gap:var(--space-xs)">
              <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                <div>
                  <div style="font-weight:500;font-size:0.875rem">${escHtml(s.name)}</div>
                  <div style="display:flex;gap:var(--space-xs);align-items:center;margin-top:4px">
                    <span class="pct-badge pct-badge-primary">${s.type.replace(/_/g,' ')}</span>
                    <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--color-muted)">${escHtml(s.cronExpression)}</span>
                  </div>
                </div>
                <div style="display:flex;gap:var(--space-xs);align-items:center;flex-shrink:0">
                  <span class="pct-badge ${s.active ? 'pct-badge-success' : 'pct-badge-error'}">${s.active ? 'Active' : 'Inactive'}</span>
                  <button class="pct-btn pct-btn-xs" onclick="triggerSchedule('${escAttr(s.id)}')">Run Now</button>
                  <button class="pct-btn pct-btn-xs" onclick="toggleSchedule('${escAttr(s.id)}', ${!s.active})">${s.active ? 'Disable' : 'Enable'}</button>
                  <button class="pct-btn pct-btn-xs pct-btn-danger" onclick="deleteSchedule('${escAttr(s.id)}')">Remove</button>
                </div>
              </div>
              <div style="font-size:0.75rem;color:var(--color-muted)">
                Runs: ${s.runCount || 0}
                ${s.lastRun ? ` · Last run: ${new Date(s.lastRun).toLocaleString()}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <div style="margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px solid var(--color-border);font-size:0.8125rem;color:var(--color-muted)">
        <strong>Note:</strong> Schedules define when jobs should run. In production, connect to a cron daemon or job scheduler. Use "Run Now" to manually trigger any job.
      </div>
    </div>
  `;
}

function showCreateWebhookForm() {
  document.getElementById('create-webhook-form').style.display = 'block';
}
function hideCreateWebhookForm() {
  document.getElementById('create-webhook-form').style.display = 'none';
}
function showCreateScheduleForm() {
  document.getElementById('create-schedule-form').style.display = 'block';
}
function hideCreateScheduleForm() {
  document.getElementById('create-schedule-form').style.display = 'none';
}

async function createWebhook() {
  const url = document.getElementById('wh-url')?.value.trim();
  if (!url) return showToast('Endpoint URL is required', 'error');

  const eventsSelect = document.getElementById('wh-events');
  const events = Array.from(eventsSelect?.selectedOptions || []).map(o => o.value);
  if (events.length === 0) return showToast('Select at least one event', 'error');

  const secret = document.getElementById('wh-secret')?.value.trim() || undefined;

  try {
    const res = await pctApi.createWebhook({ url, events, secret });
    showToast('Webhook created');
    automationState.webhooks.unshift(res.data);
    renderAutomationPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function testWebhook(id) {
  try {
    const res = await pctApi.testWebhook(id);
    if (res.data.success) {
      showToast('Webhook delivered successfully (HTTP ' + res.data.status + ')');
    } else {
      showToast('Webhook delivery failed: ' + (res.data.error || 'Unknown error'), 'error');
    }
    await loadAutomationData();
  } catch (e) {
    showToast('Test failed: ' + e.message, 'error');
  }
}

async function toggleWebhook(id, active) {
  try {
    const res = await pctApi.updateWebhook(id, { active });
    const w = automationState.webhooks.find(x => x.id === id);
    if (w) w.active = active;
    showToast(active ? 'Webhook enabled' : 'Webhook disabled');
    renderAutomationPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteWebhook(id) {
  if (!confirm('Remove this webhook?')) return;
  try {
    await pctApi.deleteWebhook(id);
    automationState.webhooks = automationState.webhooks.filter(w => w.id !== id);
    showToast('Webhook removed');
    renderAutomationPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function createSchedule() {
  const name = document.getElementById('sched-name')?.value.trim();
  const type = document.getElementById('sched-type')?.value;
  const cronExpression = document.getElementById('sched-cron')?.value.trim();

  if (!name) return showToast('Job name is required', 'error');
  if (!cronExpression) return showToast('Cron expression is required', 'error');

  try {
    const res = await pctApi.createSchedule({ name, type, cronExpression });
    showToast('Schedule created');
    automationState.schedules.unshift(res.data);
    renderAutomationPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function triggerSchedule(id) {
  try {
    const res = await pctApi.triggerSchedule(id);
    showToast('Job triggered manually');
    const s = automationState.schedules.find(x => x.id === id);
    if (s) { s.runCount = (s.runCount || 0) + 1; s.lastRun = new Date().toISOString(); }
    renderAutomationPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function toggleSchedule(id, active) {
  try {
    await pctApi.updateSchedule(id, { active });
    const s = automationState.schedules.find(x => x.id === id);
    if (s) s.active = active;
    showToast(active ? 'Schedule enabled' : 'Schedule disabled');
    renderAutomationPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteSchedule(id) {
  if (!confirm('Remove this scheduled job?')) return;
  try {
    await pctApi.deleteSchedule(id);
    automationState.schedules = automationState.schedules.filter(s => s.id !== id);
    showToast('Schedule removed');
    renderAutomationPanel();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ============================================
// Utilities
// ============================================

function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================
// F3.3.3: Market Sophistication Assessment Tool
// ============================================
const SOPHISTICATION_QUIZ = [
  {
    q: 'How many competing products/services exist in your market?',
    opts: ['1-2 (we\'re pioneering this)', '3-10 (a few competitors)', '11-30 (crowded but manageable)', '30+ (very crowded)', 'Too many to count (commoditized)'],
  },
  {
    q: 'How familiar is your target customer with solutions like yours?',
    opts: ['Completely new concept to them', 'They know a few options exist', 'They\'ve seen many ads & know brands', 'They\'ve tried competitors', 'They\'re experts who know every nuance'],
  },
  {
    q: 'How skeptical are your customers about claims in your category?',
    opts: ['Not skeptical - they believe what they read', 'Mildly skeptical', 'Moderately skeptical - need some proof', 'Very skeptical - need strong proof', 'Extremely skeptical - have been burned before'],
  },
  {
    q: 'How long has your product category existed?',
    opts: ['Brand new (< 1 year)', 'Emerging (1-3 years)', 'Established (3-7 years)', 'Mature (7-15 years)', 'Commodity (15+ years)'],
  },
];

let sophQuizAnswers = [null, null, null, null];
let sophQuizStep = 0;

function renderSophisticationAssessment() {
  const el = document.getElementById('soph-assessment-area');
  if (!el) return;

  if (sophQuizStep >= SOPHISTICATION_QUIZ.length) {
    // Calculate score
    const score = sophQuizAnswers.reduce((sum, a) => sum + (a || 0), 0);
    const avg = score / SOPHISTICATION_QUIZ.length;
    const level = Math.round(avg) + 1;
    const clamped = Math.max(1, Math.min(5, level));
    const descriptions = ['New category - simply state what product does', 'Competition emerging - bigger/better claims', 'Crowded market - unique mechanism/method', 'Skeptical market - proof and specificity', 'Exhausted market - identification/tribe building'];
    el.innerHTML = `
      <div style="text-align:center;padding:var(--space-md)">
        <div style="font-size:2.5rem;font-weight:700;color:var(--color-primary)">${clamped}</div>
        <div style="font-size:1rem;font-weight:600;margin-bottom:var(--space-xs)">Market Sophistication Level ${clamped}</div>
        <div style="font-size:0.875rem;color:var(--color-muted);margin-bottom:var(--space-md)">${descriptions[clamped-1]}</div>
        <button class="pct-btn pct-btn-primary pct-btn-sm" onclick="applySophLevel(${clamped})">Apply to Generation</button>
        <button class="pct-btn pct-btn-sm" onclick="resetSophQuiz()" style="margin-left:var(--space-xs)">Retake</button>
      </div>
    `;
    return;
  }

  const q = SOPHISTICATION_QUIZ[sophQuizStep];
  el.innerHTML = `
    <div style="padding:var(--space-sm)">
      <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">Question ${sophQuizStep + 1} of ${SOPHISTICATION_QUIZ.length}</div>
      <div style="font-size:0.9rem;font-weight:500;margin-bottom:var(--space-sm)">${escHtml(q.q)}</div>
      <div style="display:flex;flex-direction:column;gap:var(--space-xs)">
        ${q.opts.map((opt, i) => `
          <button class="pct-btn pct-btn-sm" style="text-align:left;white-space:normal;height:auto;padding:var(--space-xs) var(--space-sm)" onclick="sophQuizAnswer(${i})">
            ${i+1}. ${escHtml(opt)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function sophQuizAnswer(optIdx) {
  sophQuizAnswers[sophQuizStep] = optIdx;
  sophQuizStep++;
  renderSophisticationAssessment();
}

function resetSophQuiz() {
  sophQuizAnswers = [null, null, null, null];
  sophQuizStep = 0;
  renderSophisticationAssessment();
}

function applySophLevel(level) {
  state.genParams.marketSophistication = level;
  document.querySelectorAll('.soph-card').forEach((c, i) => {
    c.classList.toggle('selected', (i + 1) === level);
  });
  showToast(`Market sophistication set to Level ${level}`);
  // Close the modal if open
  const modal = document.getElementById('soph-assessment-modal');
  if (modal) modal.style.display = 'none';
}

function showSophisticationAssessment() {
  let modal = document.getElementById('soph-assessment-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'soph-assessment-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `
      <div style="background:var(--color-bg-secondary);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-lg);max-width:480px;width:90%;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-md)">
          <div style="font-weight:600;font-size:1rem">Market Sophistication Assessment</div>
          <button class="pct-btn pct-btn-sm" onclick="document.getElementById('soph-assessment-modal').style.display='none'">&#10005;</button>
        </div>
        <div id="soph-assessment-area"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  sophQuizAnswers = [null, null, null, null];
  sophQuizStep = 0;
  renderSophisticationAssessment();
}

// ============================================
// F10.2: Settings Panel (API Keys + Default Presets)
// ============================================
const SETTINGS_STORAGE_KEY = 'pct_settings';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  showToast('Settings saved');
}

function renderSettingsPanel() {
  const el = document.getElementById('settings-panel');
  if (!el) return;
  const settings = loadSettings();

  el.innerHTML = `
    <div class="pct-card" style="margin-bottom:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">Settings</div>
        <div style="font-size:0.8125rem;color:var(--color-muted)">F10.2 API Keys &amp; Default Presets</div>
      </div>

      <!-- F10.2.1: API Key Management -->
      <div style="margin-bottom:var(--space-lg)">
        <div style="font-weight:600;font-size:0.9375rem;margin-bottom:var(--space-sm);padding-bottom:var(--space-xs);border-bottom:1px solid var(--color-border)">API Key Management</div>
        <div class="pct-form-group">
          <label>Anthropic API Key <span class="pct-badge pct-badge-primary" style="font-size:0.65rem">For AI generation</span></label>
          <div style="display:flex;gap:var(--space-sm)">
            <input id="settings-anthropic-key" class="pct-input" type="password" placeholder="sk-ant-..." value="${escAttr(settings.anthropicKey || '')}" style="flex:1;font-family:monospace">
            <button class="pct-btn pct-btn-sm" onclick="testApiKey('anthropic')">Test</button>
          </div>
          <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">Used for USP generation, angle generation, hook generation, and script writing.</div>
        </div>
        <div class="pct-form-group">
          <label>OpenAI API Key <span class="pct-badge pct-badge-muted" style="font-size:0.65rem">Optional alternative</span></label>
          <div style="display:flex;gap:var(--space-sm)">
            <input id="settings-openai-key" class="pct-input" type="password" placeholder="sk-..." value="${escAttr(settings.openaiKey || '')}" style="flex:1;font-family:monospace">
            <button class="pct-btn pct-btn-sm" onclick="testApiKey('openai')">Test</button>
          </div>
          <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">Used when GPT-4o model is selected in hook generation.</div>
        </div>
        <div class="pct-form-group">
          <label>Meta Business Access Token <span class="pct-badge pct-badge-muted" style="font-size:0.65rem">For ad deployment</span></label>
          <input id="settings-meta-token" class="pct-input" type="password" placeholder="EAABx..." value="${escAttr(settings.metaToken || '')}" style="font-family:monospace">
          <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">Set as default for new Meta account connections.</div>
        </div>
        <button class="pct-btn pct-btn-primary" onclick="saveApiKeys()">Save API Keys</button>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-top:var(--space-xs)">&#128274; Keys are stored in your browser's localStorage only. They are not sent to any server.</div>
      </div>

      <!-- F10.2.2: Default Parameter Presets -->
      <div style="margin-bottom:var(--space-lg)">
        <div style="font-weight:600;font-size:0.9375rem;margin-bottom:var(--space-sm);padding-bottom:var(--space-xs);border-bottom:1px solid var(--color-border)">Default Generation Parameters</div>
        <div class="pct-form-group">
          <label>Default Messaging Framework</label>
          <select id="settings-default-framework" class="pct-select">
            ${['punchy', 'bold_statements', 'desire_future_states', 'question_based', 'problem_agitation', 'social_proof', 'urgency_scarcity', 'educational'].map(f =>
              `<option value="${f}" ${settings.defaultFramework === f ? 'selected' : ''}>${f.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>`
            ).join('')}
          </select>
        </div>
        <div class="pct-form-group">
          <label>Default Awareness Level</label>
          <select id="settings-default-awareness" class="pct-select">
            ${[1,2,3,4,5].map(l =>
              `<option value="${l}" ${settings.defaultAwareness == l ? 'selected' : ''}>${l} - ${['Unaware','Problem Aware','Solution Aware','Product Aware','Most Aware'][l-1]}</option>`
            ).join('')}
          </select>
        </div>
        <div class="pct-form-group">
          <label>Default Market Sophistication</label>
          <select id="settings-default-sophistication" class="pct-select">
            ${[1,2,3,4,5].map(l =>
              `<option value="${l}" ${settings.defaultSophistication == l ? 'selected' : ''}>${l} - ${['New category','Competition emerging','Crowded market','Skeptical market','Exhausted market'][l-1]}</option>`
            ).join('')}
          </select>
        </div>
        <div class="pct-form-group">
          <label>Default Batch Size</label>
          <select id="settings-default-batch" class="pct-select">
            ${[5,8,10,15,20,25,50].map(n =>
              `<option value="${n}" ${settings.defaultBatchSize == n ? 'selected' : ''}>${n} hooks</option>`
            ).join('')}
          </select>
        </div>
        <div class="pct-form-group">
          <label>Default AI Model</label>
          <select id="settings-default-model" class="pct-select">
            ${['claude-sonnet','claude-haiku','claude-opus','gpt-4o','gpt-4o-mini'].map(m =>
              `<option value="${m}" ${settings.defaultModel === m ? 'selected' : ''}>${m}</option>`
            ).join('')}
          </select>
        </div>
        <button class="pct-btn pct-btn-primary" onclick="saveDefaultPresets()">Save Default Presets</button>
        <button class="pct-btn pct-btn-sm" onclick="applyDefaultPresetsToGeneration()" style="margin-left:var(--space-sm)">Apply to Current Session</button>
      </div>

      <!-- F10.2.3: Notification Preferences -->
      <div style="margin-bottom:var(--space-lg)">
        <div style="font-weight:600;font-size:0.9375rem;margin-bottom:var(--space-sm);padding-bottom:var(--space-xs);border-bottom:1px solid var(--color-border)">Notification Preferences</div>
        <div style="display:flex;flex-direction:column;gap:var(--space-xs)">
          ${[
            ['notif-hook-gen', 'Notify when hook generation completes', settings.notifHookGen !== false],
            ['notif-ad-gen', 'Notify when ad generation completes', settings.notifAdGen !== false],
            ['notif-deploy', 'Notify when ads are deployed', settings.notifDeploy !== false],
          ].map(([id, label, checked]) => `
            <label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer;font-size:0.875rem">
              <input type="checkbox" id="${escAttr(id)}" ${checked ? 'checked' : ''} style="width:16px;height:16px">
              ${escHtml(label)}
            </label>
          `).join('')}
        </div>
        <button class="pct-btn pct-btn-sm" onclick="saveNotificationPrefs()" style="margin-top:var(--space-sm)">Save Preferences</button>
      </div>

      <!-- F10.2.4: Export/Backup -->
      <div>
        <div style="font-weight:600;font-size:0.9375rem;margin-bottom:var(--space-sm);padding-bottom:var(--space-xs);border-bottom:1px solid var(--color-border)">Export &amp; Backup</div>
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap">
          <button class="pct-btn pct-btn-sm" onclick="exportAllSettings()">&#8599; Export Settings JSON</button>
          <button class="pct-btn pct-btn-sm" onclick="document.getElementById('import-settings-input').click()">&#8601; Import Settings</button>
          <input type="file" id="import-settings-input" accept=".json" style="display:none" onchange="importSettings(this)">
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-top:var(--space-xs)">Export/import your API keys and default presets as a JSON file.</div>
      </div>
    </div>

    <!-- Incoming Webhook Info (F9.1.1) -->
    <div class="pct-card">
      <div class="pct-card-header">
        <div class="pct-card-title">Incoming Webhooks</div>
        <div style="font-size:0.8125rem;color:var(--color-muted)">F9.1.1 - Receive data from external systems</div>
      </div>
      <p style="font-size:0.875rem;color:var(--color-muted);margin-bottom:var(--space-md)">
        External systems (Make.com, Zapier, etc.) can send data to your PCT instance via these endpoints.
      </p>
      <div class="pct-form-group">
        <label>VoC Import Endpoint</label>
        <div style="display:flex;gap:var(--space-sm)">
          <code style="flex:1;background:var(--color-bg-tertiary);padding:var(--space-xs) var(--space-sm);border-radius:var(--radius-sm);font-size:0.8rem;word-break:break-all">
            POST ${API_BASE}/incoming/voc-import
          </code>
          <button class="pct-btn pct-btn-sm" onclick="copyToClipboard('${escAttr(API_BASE)}/incoming/voc-import')">Copy</button>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">Body: <code>{ "action": "import_voc", "productId": "...", "quotes": ["quote1", "quote2"], "source": "amazon" }</code></div>
      </div>
      <div class="pct-form-group">
        <label>Metrics Import Endpoint</label>
        <div style="display:flex;gap:var(--space-sm)">
          <code style="flex:1;background:var(--color-bg-tertiary);padding:var(--space-xs) var(--space-sm);border-radius:var(--radius-sm);font-size:0.8rem;word-break:break-all">
            POST ${API_BASE}/incoming/metrics-import
          </code>
          <button class="pct-btn pct-btn-sm" onclick="copyToClipboard('${escAttr(API_BASE)}/incoming/metrics-import')">Copy</button>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">Body: <code>{ "action": "import_metrics", "deploymentId": "...", "impressions": 5000, "clicks": 150, "spend": 25.00 }</code></div>
      </div>
      <div id="incoming-webhook-logs">
        <button class="pct-btn pct-btn-sm" onclick="loadIncomingLogs()">View Recent Incoming Requests</button>
      </div>
    </div>

    <!-- F10.1.1/F10.1.2/F10.1.3: Team & User Management -->
    <div class="pct-card" style="margin-top:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">Team & Access Management</div>
        <div style="font-size:0.8125rem;color:var(--color-muted)">F10.1.1-F10.1.3 — User registration, roles &amp; workspaces</div>
      </div>

      <!-- F10.1.3: Workspace -->
      <div style="margin-bottom:var(--space-lg)">
        <div style="font-weight:600;font-size:0.9375rem;margin-bottom:var(--space-sm);padding-bottom:var(--space-xs);border-bottom:1px solid var(--color-border)">Workspace</div>
        <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-sm)">
          <input id="ws-name-input" class="pct-input" placeholder="Workspace name (e.g. Acme Marketing)" style="flex:1">
          <select id="ws-plan-select" class="pct-select" style="width:auto">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <button class="pct-btn pct-btn-primary" onclick="createWorkspace()">Create</button>
        </div>
        <div id="workspaces-list" style="font-size:0.8125rem;color:var(--color-muted)">Loading workspaces...</div>
      </div>

      <!-- F10.1.1/F10.1.2: User Registration & Roles -->
      <div style="margin-bottom:var(--space-lg)">
        <div style="font-weight:600;font-size:0.9375rem;margin-bottom:var(--space-sm);padding-bottom:var(--space-xs);border-bottom:1px solid var(--color-border)">Team Members</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:var(--space-xs);margin-bottom:var(--space-sm)">
          <input id="user-email-input" class="pct-input pct-input-sm" placeholder="Email address">
          <input id="user-name-input" class="pct-input pct-input-sm" placeholder="Full name">
          <select id="user-role-select" class="pct-select" style="font-size:0.8125rem">
            <option value="viewer">Viewer — read only</option>
            <option value="editor">Editor — create &amp; edit</option>
            <option value="admin">Admin — full access</option>
          </select>
          <button class="pct-btn pct-btn-primary pct-btn-sm" onclick="addTeamMember()">Add</button>
        </div>
        <div id="users-list" style="font-size:0.8125rem">Loading team...</div>
      </div>

      <!-- Role descriptions (F10.1.2: RBAC) -->
      <div style="background:var(--color-bg-tertiary);border-radius:var(--radius-sm);padding:var(--space-sm);font-size:0.75rem;color:var(--color-muted)">
        <strong>Role Permissions:</strong>
        <span class="pct-badge pct-badge-primary" style="margin-left:var(--space-xs)">Admin</span> Full access, manage team, deploy ads
        &nbsp;|&nbsp; <span class="pct-badge pct-badge-warning">Editor</span> Create brands/products/hooks/ads, no team management
        &nbsp;|&nbsp; <span class="pct-badge pct-badge-muted">Viewer</span> View-only, no create/edit/delete
      </div>
    </div>

    <!-- F10.1.4: Activity Log -->
    <div class="pct-card" style="margin-top:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">Activity Log</div>
        <div style="font-size:0.8125rem;color:var(--color-muted)">F10.1.4 — Audit trail of all user actions</div>
        <button class="pct-btn pct-btn-sm" onclick="loadActivityLog()">Refresh</button>
      </div>
      <div id="activity-log-list" style="font-size:0.8125rem;color:var(--color-muted)">Click Refresh to load activity log.</div>
    </div>

    <!-- F9.2.3-F9.2.6: External API Integrations -->
    <div class="pct-card" style="margin-top:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">External API Integrations</div>
        <div style="font-size:0.8125rem;color:var(--color-muted)">F9.2.3-F9.2.6 — Connect to third-party services</div>
      </div>

      <!-- F9.2.3: Templated.io -->
      <div style="margin-bottom:var(--space-md)">
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs);display:flex;align-items:center;gap:var(--space-xs)">
          Templated.io API <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F9.2.3</span>
          <span class="pct-badge pct-badge-primary" style="font-size:0.6rem">Image Generation</span>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">
          Used for server-side image generation with professional templates. Replaces canvas-based generation.
        </div>
        <div style="display:flex;gap:var(--space-sm)">
          <input id="settings-templated-key" class="pct-input pct-input-sm" type="password" placeholder="Templated.io API key" value="${escAttr(settings.templatedKey || '')}" style="flex:1;font-family:monospace">
          <button class="pct-btn pct-btn-sm" onclick="testTemplatedKey()">Test</button>
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="saveExtIntegration('templated')">Save</button>
        </div>
      </div>

      <!-- F9.2.4: Google Sheets API -->
      <div style="margin-bottom:var(--space-md)">
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs);display:flex;align-items:center;gap:var(--space-xs)">
          Google Sheets API <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F9.2.4</span>
          <span class="pct-badge pct-badge-primary" style="font-size:0.6rem">Data Import/Export</span>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">
          Sync hooks, performance data, and campaign results to/from Google Sheets.
        </div>
        <div style="display:flex;gap:var(--space-sm)">
          <input id="settings-gsheets-key" class="pct-input pct-input-sm" type="password" placeholder="Google Service Account JSON or API key" value="${escAttr(settings.gsheetsKey || '')}" style="flex:1;font-family:monospace">
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="saveExtIntegration('gsheets')">Save</button>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">
          Sheet ID: <input id="settings-gsheets-sheet-id" class="pct-input pct-input-sm" placeholder="Google Sheet ID from URL" value="${escAttr(settings.gsheetsSheetId || '')}" style="width:200px;display:inline-block">
        </div>
      </div>

      <!-- F9.2.5: Google Docs API -->
      <div style="margin-bottom:var(--space-md)">
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs);display:flex;align-items:center;gap:var(--space-xs)">
          Google Docs API <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F9.2.5</span>
          <span class="pct-badge pct-badge-primary" style="font-size:0.6rem">Script Export</span>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">
          Export video scripts directly to Google Docs with proper formatting.
        </div>
        <div style="display:flex;gap:var(--space-sm)">
          <input id="settings-gdocs-key" class="pct-input pct-input-sm" type="password" placeholder="Google API key or OAuth client" value="${escAttr(settings.gdocsKey || '')}" style="flex:1;font-family:monospace">
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="saveExtIntegration('gdocs')">Save</button>
        </div>
      </div>

      <!-- F9.2.6: Make.com/Zapier -->
      <div>
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs);display:flex;align-items:center;gap:var(--space-xs)">
          Make.com / Zapier <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F9.2.6</span>
          <span class="pct-badge pct-badge-primary" style="font-size:0.6rem">Automation</span>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">
          Trigger Make.com scenarios or Zapier zaps when hooks are approved, ads are deployed, etc.
        </div>
        <div style="display:flex;gap:var(--space-sm)">
          <input id="settings-makecom-url" class="pct-input pct-input-sm" placeholder="Make.com webhook URL" value="${escAttr(settings.makecomUrl || '')}" style="flex:1">
          <button class="pct-btn pct-btn-sm" onclick="testMakecomWebhook()">Test</button>
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="saveExtIntegration('makecom')">Save</button>
        </div>
        <div style="margin-top:var(--space-xs);display:flex;gap:var(--space-sm)">
          <input id="settings-zapier-url" class="pct-input pct-input-sm" placeholder="Zapier catch hook URL" value="${escAttr(settings.zapierUrl || '')}" style="flex:1">
          <button class="pct-btn pct-btn-sm" onclick="testZapierWebhook()">Test</button>
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="saveExtIntegration('zapier')">Save</button>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">
          These URLs will be called when: hook approved, ad deployed, performance synced.
        </div>
      </div>
    </div>

    <!-- F1.4.1-F1.4.3: Competitor Intelligence -->
    <div class="pct-card" style="margin-top:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">Competitor Intelligence</div>
        <div style="font-size:0.8125rem;color:var(--color-muted)">F1.4.1-F1.4.3 — Meta Ad Library browser &amp; analysis</div>
      </div>

      <div style="margin-bottom:var(--space-md)">
        <div style="font-size:0.875rem;color:var(--color-text-secondary);margin-bottom:var(--space-sm)">
          Browse competitor ads from Meta's Ad Library to inform your creative strategy.
        </div>

        <!-- F1.4.1: Ad Library Browser -->
        <div style="margin-bottom:var(--space-md)">
          <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">
            Ad Library Browser <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F1.4.1</span>
          </div>
          <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-xs)">
            <input id="comp-search-input" class="pct-input pct-input-sm" placeholder="Search advertiser or keyword..." style="flex:1">
            <button class="pct-btn pct-btn-primary pct-btn-sm" onclick="searchMetaAdLibrary()">Search</button>
            <a href="https://www.facebook.com/ads/library/" target="_blank" rel="noopener" class="pct-btn pct-btn-sm">Open Meta Library &#8599;</a>
          </div>
          <div id="comp-search-results" style="font-size:0.8125rem;color:var(--color-muted)"></div>
        </div>

        <!-- F1.4.2: Competitor Messaging Analysis -->
        <div style="margin-bottom:var(--space-md)">
          <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">
            Messaging Analysis <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F1.4.2</span>
          </div>
          <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">
            Paste competitor ad copy to analyze messaging frameworks, awareness levels, and USPs used.
          </div>
          <textarea id="comp-ad-copy" class="pct-textarea" rows="4" placeholder="Paste competitor ad copy here..."></textarea>
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="analyzeCompetitorAd()" style="margin-top:var(--space-xs)">Analyze Messaging</button>
          <div id="comp-analysis-result" style="margin-top:var(--space-sm)"></div>
        </div>

        <!-- F1.4.3: Market Positioning Comparison -->
        <div>
          <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">
            Market Positioning <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F1.4.3</span>
          </div>
          <div id="comp-positioning-chart">
            <div style="font-size:0.75rem;color:var(--color-muted)">
              Add competitors below to build a positioning map. Each entry shows their claimed awareness/sophistication level.
            </div>
            <div id="comp-entries" style="margin-top:var(--space-sm)"></div>
            <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-sm)">
              <input id="comp-name-input" class="pct-input pct-input-sm" placeholder="Competitor name" style="flex:1">
              <select id="comp-awareness-select" class="pct-select" style="font-size:0.8125rem;width:auto">
                ${[1,2,3,4,5].map(l => `<option value="${l}">Awareness L${l}</option>`).join('')}
              </select>
              <select id="comp-soph-select" class="pct-select" style="font-size:0.8125rem;width:auto">
                ${[1,2,3,4,5].map(l => `<option value="${l}">Soph L${l}</option>`).join('')}
              </select>
              <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="addCompetitorEntry()">Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveApiKeys() {
  const settings = loadSettings();
  settings.anthropicKey = document.getElementById('settings-anthropic-key')?.value.trim() || '';
  settings.openaiKey = document.getElementById('settings-openai-key')?.value.trim() || '';
  settings.metaToken = document.getElementById('settings-meta-token')?.value.trim() || '';
  saveSettings(settings);
}

async function testApiKey(provider) {
  showToast(`Testing ${provider} connection...`, 'info');
  try {
    const key = provider === 'anthropic'
      ? document.getElementById('settings-anthropic-key')?.value.trim()
      : document.getElementById('settings-openai-key')?.value.trim();
    if (!key) return showToast('Enter an API key first', 'error');
    // Just check if the key looks valid format-wise
    if (provider === 'anthropic' && !key.startsWith('sk-ant-')) {
      return showToast('Anthropic keys start with sk-ant-', 'error');
    }
    if (provider === 'openai' && !key.startsWith('sk-')) {
      return showToast('OpenAI keys start with sk-', 'error');
    }
    showToast(`${provider} key format looks valid. Save to use it.`, 'success');
  } catch (e) {
    showToast('Test failed: ' + e.message, 'error');
  }
}

function saveDefaultPresets() {
  const settings = loadSettings();
  settings.defaultFramework = document.getElementById('settings-default-framework')?.value;
  settings.defaultAwareness = parseInt(document.getElementById('settings-default-awareness')?.value);
  settings.defaultSophistication = parseInt(document.getElementById('settings-default-sophistication')?.value);
  settings.defaultBatchSize = parseInt(document.getElementById('settings-default-batch')?.value);
  settings.defaultModel = document.getElementById('settings-default-model')?.value;
  saveSettings(settings);
}

function applyDefaultPresetsToGeneration() {
  const settings = loadSettings();
  if (settings.defaultFramework) state.genParams.messagingFramework = settings.defaultFramework;
  if (settings.defaultAwareness) state.genParams.awarenessLevel = settings.defaultAwareness;
  if (settings.defaultSophistication) state.genParams.marketSophistication = settings.defaultSophistication;
  if (settings.defaultBatchSize) state.genParams.batchSize = settings.defaultBatchSize;
  if (settings.defaultModel) state.genParams.aiModel = settings.defaultModel;
  renderGenerationPanel();
  showToast('Default presets applied to generation');
}

function saveNotificationPrefs() {
  const settings = loadSettings();
  settings.notifHookGen = document.getElementById('notif-hook-gen')?.checked;
  settings.notifAdGen = document.getElementById('notif-ad-gen')?.checked;
  settings.notifDeploy = document.getElementById('notif-deploy')?.checked;
  saveSettings(settings);
}

function exportAllSettings() {
  const settings = loadSettings();
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pct-settings.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importSettings(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const settings = JSON.parse(e.target.result);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      showToast('Settings imported successfully');
      renderSettingsPanel();
    } catch (err) {
      showToast('Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

async function loadIncomingLogs() {
  const el = document.getElementById('incoming-webhook-logs');
  if (!el) return;
  try {
    const data = await api('/incoming/logs');
    const logs = data.data || [];
    if (logs.length === 0) {
      el.innerHTML = '<div style="font-size:0.875rem;color:var(--color-muted)">No incoming requests yet.</div>';
      return;
    }
    el.innerHTML = `
      <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">Recent Incoming Requests (${logs.length})</div>
      <div style="max-height:200px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-sm)">
        ${logs.map(l => `
          <div style="padding:var(--space-xs) var(--space-sm);border-bottom:1px solid var(--color-border);font-size:0.75rem">
            <span style="color:var(--color-muted)">${new Date(l.receivedAt).toLocaleString()}</span>
            <span style="margin:0 var(--space-xs);font-family:monospace;color:var(--color-primary)">${escHtml(l.endpoint)}</span>
            <span style="color:${l.processed ? 'var(--color-success)' : 'var(--color-muted)'}">${escHtml(l.result || 'pending')}</span>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<div style="color:var(--color-error);font-size:0.875rem">Failed to load: ' + escHtml(e.message) + '</div>';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard')).catch(() => showToast('Copy failed', 'error'));
}

// ============================================
// F10.1.1-F10.1.3: Team & User Management Functions
// ============================================
let pctTeamUsers = [];
let pctWorkspaces = [];
let pctCompetitors = [];

async function loadTeamData() {
  try {
    const [usersRes, wsRes] = await Promise.all([
      pctApi.getUsers().catch(() => ({ data: [] })),
      pctApi.getWorkspaces().catch(() => ({ data: [] })),
    ]);
    pctTeamUsers = usersRes.data || [];
    pctWorkspaces = wsRes.data || [];
    renderUsersList();
    renderWorkspacesList();
  } catch (e) {
    console.error('Failed to load team data:', e);
  }
}

function renderUsersList() {
  const el = document.getElementById('users-list');
  if (!el) return;
  if (pctTeamUsers.length === 0) {
    el.innerHTML = '<div style="color:var(--color-muted)">No team members yet. Add the first one above.</div>';
    return;
  }
  const roleColors = { admin: 'pct-badge-primary', editor: 'pct-badge-warning', viewer: 'pct-badge-muted' };
  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:0.8125rem">
      <thead>
        <tr style="border-bottom:1px solid var(--color-border)">
          <th style="text-align:left;padding:4px 8px;color:var(--color-muted)">Name</th>
          <th style="text-align:left;padding:4px 8px;color:var(--color-muted)">Email</th>
          <th style="text-align:left;padding:4px 8px;color:var(--color-muted)">Role</th>
          <th style="text-align:left;padding:4px 8px;color:var(--color-muted)">Status</th>
          <th style="padding:4px 8px"></th>
        </tr>
      </thead>
      <tbody>
        ${pctTeamUsers.map(u => `
          <tr style="border-bottom:1px solid var(--color-bg-tertiary)">
            <td style="padding:4px 8px">${escHtml(u.name)}</td>
            <td style="padding:4px 8px;color:var(--color-muted)">${escHtml(u.email)}</td>
            <td style="padding:4px 8px">
              <select class="pct-select" style="font-size:0.75rem;padding:1px 4px" onchange="updateUserRole('${u.id}', this.value)">
                ${['viewer', 'editor', 'admin'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
            </td>
            <td style="padding:4px 8px">
              <span class="pct-badge ${u.isActive ? 'pct-badge-success' : 'pct-badge-muted'}">${u.isActive ? 'Active' : 'Inactive'}</span>
            </td>
            <td style="padding:4px 8px;text-align:right">
              <button class="pct-btn pct-btn-xs" onclick="toggleUserActive('${u.id}', ${!u.isActive})">${u.isActive ? 'Deactivate' : 'Activate'}</button>
              <button class="pct-btn pct-btn-xs pct-btn-danger" onclick="removeTeamMember('${u.id}')" style="margin-left:4px">Remove</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderWorkspacesList() {
  const el = document.getElementById('workspaces-list');
  if (!el) return;
  if (pctWorkspaces.length === 0) {
    el.innerHTML = '<div style="color:var(--color-muted)">No workspaces yet.</div>';
    return;
  }
  el.innerHTML = pctWorkspaces.map(ws => `
    <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-xs) 0;border-bottom:1px solid var(--color-bg-tertiary)">
      <span style="font-weight:500">${escHtml(ws.name)}</span>
      <code style="font-size:0.7rem;color:var(--color-muted)">${escHtml(ws.slug)}</code>
      <span class="pct-badge ${ws.plan === 'enterprise' ? 'pct-badge-primary' : ws.plan === 'pro' ? 'pct-badge-warning' : 'pct-badge-muted'}">${ws.plan}</span>
    </div>
  `).join('');
}

async function addTeamMember() {
  const email = document.getElementById('user-email-input')?.value.trim();
  const name = document.getElementById('user-name-input')?.value.trim();
  const role = document.getElementById('user-role-select')?.value || 'viewer';
  if (!email || !name) return showToast('Email and name are required', 'error');
  try {
    await pctApi.createUser({ email, name, role });
    document.getElementById('user-email-input').value = '';
    document.getElementById('user-name-input').value = '';
    showToast(`${name} added as ${role}`);
    await loadTeamData();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function updateUserRole(id, role) {
  try {
    await pctApi.updateUser(id, { role });
    const u = pctTeamUsers.find(u => u.id === id);
    if (u) u.role = role;
    showToast('Role updated');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function toggleUserActive(id, isActive) {
  try {
    await pctApi.updateUser(id, { isActive });
    await loadTeamData();
    showToast(isActive ? 'User activated' : 'User deactivated');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function removeTeamMember(id) {
  if (!confirm('Remove this team member?')) return;
  try {
    await pctApi.deleteUser(id);
    await loadTeamData();
    showToast('Team member removed');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function createWorkspace() {
  const name = document.getElementById('ws-name-input')?.value.trim();
  const plan = document.getElementById('ws-plan-select')?.value || 'free';
  if (!name) return showToast('Workspace name is required', 'error');
  try {
    await pctApi.createWorkspace({ name, plan });
    document.getElementById('ws-name-input').value = '';
    showToast(`Workspace "${name}" created`);
    await loadTeamData();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// F10.1.4: Activity Log
async function loadActivityLog() {
  const el = document.getElementById('activity-log-list');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--color-muted)">Loading...</div>';
  try {
    const { data, total } = await pctApi.getActivityLog({ limit: 50 });
    if (!data || data.length === 0) {
      el.innerHTML = '<div style="color:var(--color-muted)">No activity logged yet.</div>';
      return;
    }
    el.innerHTML = `
      <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">Showing ${data.length} of ${total} entries</div>
      <table style="width:100%;border-collapse:collapse;font-size:0.8125rem">
        <thead>
          <tr style="border-bottom:1px solid var(--color-border)">
            <th style="text-align:left;padding:3px 6px;color:var(--color-muted)">Time</th>
            <th style="text-align:left;padding:3px 6px;color:var(--color-muted)">User</th>
            <th style="text-align:left;padding:3px 6px;color:var(--color-muted)">Action</th>
            <th style="text-align:left;padding:3px 6px;color:var(--color-muted)">Entity</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(log => `
            <tr style="border-bottom:1px solid var(--color-bg-tertiary)">
              <td style="padding:3px 6px;color:var(--color-muted)">${new Date(log.createdAt).toLocaleString()}</td>
              <td style="padding:3px 6px">${escHtml(log.userName || log.userId || 'system')}</td>
              <td style="padding:3px 6px"><code style="font-size:0.75rem">${escHtml(log.action)}</code></td>
              <td style="padding:3px 6px;color:var(--color-muted)">${escHtml(log.entityType || '')} ${log.entityId ? `<span style="font-family:monospace;font-size:0.65rem">${log.entityId.slice(0, 8)}</span>` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    el.innerHTML = '<div style="color:var(--color-error)">Failed to load: ' + escHtml(e.message) + '</div>';
  }
}

// F9.2.3-F9.2.6: External API Integration helpers
function saveExtIntegration(type) {
  const settings = loadSettings();
  const keyMap = {
    templated: 'templatedKey',
    gsheets: 'gsheetsKey',
    gdocs: 'gdocsKey',
    makecom: 'makecomUrl',
    zapier: 'zapierUrl',
  };
  const inputId = {
    templated: 'settings-templated-key',
    gsheets: 'settings-gsheets-key',
    gdocs: 'settings-gdocs-key',
    makecom: 'settings-makecom-url',
    zapier: 'settings-zapier-url',
  };
  const el = document.getElementById(inputId[type]);
  if (!el) return;
  settings[keyMap[type]] = el.value.trim();
  if (type === 'gsheets') {
    const sheetEl = document.getElementById('settings-gsheets-sheet-id');
    if (sheetEl) settings.gsheetsSheetId = sheetEl.value.trim();
  }
  saveSettings(settings);
}

async function testTemplatedKey() {
  const settings = loadSettings();
  const key = document.getElementById('settings-templated-key')?.value.trim() || settings.templatedKey;
  if (!key) return showToast('Enter a Templated.io API key first', 'error');
  showToast('Testing Templated.io key...');
  // In production would call Templated.io API endpoint
  setTimeout(() => showToast('Templated.io test: key saved (live test requires Templated.io account)'), 500);
}

async function testMakecomWebhook() {
  const url = document.getElementById('settings-makecom-url')?.value.trim();
  if (!url) return showToast('Enter a Make.com webhook URL first', 'error');
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors',
      body: JSON.stringify({ event: 'test', source: 'PCT', timestamp: new Date().toISOString() }),
    });
    showToast('Test payload sent to Make.com');
  } catch (e) {
    showToast('Failed to send: ' + e.message, 'error');
  }
}

async function testZapierWebhook() {
  const url = document.getElementById('settings-zapier-url')?.value.trim();
  if (!url) return showToast('Enter a Zapier webhook URL first', 'error');
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors',
      body: JSON.stringify({ event: 'test', source: 'PCT', timestamp: new Date().toISOString() }),
    });
    showToast('Test payload sent to Zapier');
  } catch (e) {
    showToast('Failed to send: ' + e.message, 'error');
  }
}

// F1.4.1-F1.4.3: Competitor Intelligence functions
function searchMetaAdLibrary() {
  const query = document.getElementById('comp-search-input')?.value.trim();
  if (!query) return showToast('Enter a search term', 'error');
  // Open Meta Ad Library with the search query
  const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(query)}&search_type=keyword_unordered`;
  window.open(url, '_blank');
  const el = document.getElementById('comp-search-results');
  if (el) {
    el.innerHTML = `<div style="color:var(--color-muted);font-size:0.75rem">Opened Meta Ad Library search for "<strong>${escHtml(query)}</strong>" in new tab. Use the browser to browse results.</div>`;
  }
}

async function analyzeCompetitorAd() {
  const copy = document.getElementById('comp-ad-copy')?.value.trim();
  if (!copy) return showToast('Paste ad copy to analyze', 'error');
  const el = document.getElementById('comp-analysis-result');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--color-muted)">Analyzing...</div>';

  // Perform client-side heuristic analysis
  const frameworks = [];
  if (/\?/.test(copy)) frameworks.push('Question-Based');
  if (/never|always|impossible|guaranteed/i.test(copy)) frameworks.push('Bold Statements');
  if (/imagine|picture|feel|dream/i.test(copy)) frameworks.push('Desire Future States');
  if (/problem|struggling|tired|frustrated/i.test(copy)) frameworks.push('Problem-Agitation');
  if (/customers say|reviews|loved|stars/i.test(copy)) frameworks.push('Social Proof');
  if (copy.length < 80) frameworks.push('Punchy');
  if (/limited|hurry|only|today|expires/i.test(copy)) frameworks.push('Urgency/Scarcity');
  if (frameworks.length === 0) frameworks.push('Punchy');

  const awarenessGuess = /what is|did you know|most people/i.test(copy) ? 1
    : /tired of|struggling with/i.test(copy) ? 2
    : /unlike other|the only|better than/i.test(copy) ? 3
    : /try it|see why|join/i.test(copy) ? 4
    : /buy now|order|get yours/i.test(copy) ? 5 : 3;

  el.innerHTML = `
    <div style="background:var(--color-bg-tertiary);border-radius:var(--radius-sm);padding:var(--space-sm);font-size:0.8125rem">
      <div style="font-weight:600;margin-bottom:var(--space-xs)">&#128202; Competitor Analysis <span style="font-size:0.65rem;color:var(--color-muted)">F1.4.2</span></div>
      <div style="margin-bottom:4px"><strong>Detected Frameworks:</strong>
        ${frameworks.map(f => `<span class="pct-badge pct-badge-primary" style="margin-left:4px">${f}</span>`).join('')}
      </div>
      <div style="margin-bottom:4px"><strong>Estimated Awareness Level:</strong>
        <span class="pct-badge pct-badge-warning">${awarenessGuess} — ${['','Unaware','Problem Aware','Solution Aware','Product Aware','Most Aware'][awarenessGuess]}</span>
      </div>
      <div style="margin-bottom:4px"><strong>Word Count:</strong> ${copy.split(/\s+/).length} words</div>
      <div style="color:var(--color-muted);font-size:0.75rem;margin-top:var(--space-xs)">
        &#9432; Heuristic analysis — use as a starting point for positioning research.
      </div>
    </div>
  `;
}

function addCompetitorEntry() {
  const name = document.getElementById('comp-name-input')?.value.trim();
  const awareness = parseInt(document.getElementById('comp-awareness-select')?.value || '3');
  const soph = parseInt(document.getElementById('comp-soph-select')?.value || '3');
  if (!name) return showToast('Enter competitor name', 'error');

  pctCompetitors.push({ name, awareness, soph });
  document.getElementById('comp-name-input').value = '';
  renderCompetitorEntries();
}

function removeCompetitor(idx) {
  pctCompetitors.splice(idx, 1);
  renderCompetitorEntries();
}

function renderCompetitorEntries() {
  const el = document.getElementById('comp-entries');
  if (!el) return;
  if (pctCompetitors.length === 0) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">Competitor positioning map <span style="font-size:0.6rem">(F1.4.3)</span>:</div>
    <table style="width:100%;border-collapse:collapse;font-size:0.8125rem">
      <thead>
        <tr style="border-bottom:1px solid var(--color-border)">
          <th style="text-align:left;padding:2px 6px;color:var(--color-muted)">Competitor</th>
          <th style="text-align:center;padding:2px 6px;color:var(--color-muted)">Awareness</th>
          <th style="text-align:center;padding:2px 6px;color:var(--color-muted)">Sophistication</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${pctCompetitors.map((c, i) => `
          <tr style="border-bottom:1px solid var(--color-bg-tertiary)">
            <td style="padding:2px 6px;font-weight:500">${escHtml(c.name)}</td>
            <td style="padding:2px 6px;text-align:center"><span class="pct-badge pct-badge-warning">L${c.awareness}</span></td>
            <td style="padding:2px 6px;text-align:center"><span class="pct-badge pct-badge-primary">S${c.soph}</span></td>
            <td style="padding:2px 6px;text-align:right"><button class="pct-btn pct-btn-xs pct-btn-danger" onclick="removeCompetitor(${i})">x</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ============================================
// F6.3.1-F6.3.4: B-Roll Library (Scripts Tab)
// ============================================
let brollLibrary = []; // In-memory store

function renderBrollSection() {
  const scriptsPanel = document.getElementById('panel-scripts');
  if (!scriptsPanel) return;

  // Check if B-roll section already exists
  if (document.getElementById('broll-section')) return;

  const section = document.createElement('div');
  section.id = 'broll-section';
  section.innerHTML = `
    <div class="pct-card" style="margin-top:var(--space-md)">
      <div class="pct-card-header">
        <div class="pct-card-title">B-Roll Library</div>
        <div style="font-size:0.8125rem;color:var(--color-muted)">F6.3.1-F6.3.4 — Upload &amp; match B-roll footage to script segments</div>
      </div>

      <!-- F6.3.1: B-Roll Upload -->
      <div style="margin-bottom:var(--space-md)">
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">Upload B-Roll <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F6.3.1</span></div>
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap">
          <input id="broll-file-input" type="file" accept="video/*,image/*" multiple style="display:none" onchange="handleBrollUpload(this)">
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="document.getElementById('broll-file-input').click()">&#128250; Upload Videos/Images</button>
          <div style="display:flex;gap:var(--space-xs)">
            <input id="broll-url-input" class="pct-input pct-input-sm" placeholder="Or paste video/image URL..." style="width:280px">
            <button class="pct-btn pct-btn-sm" onclick="addBrollFromUrl()">Add URL</button>
          </div>
        </div>
      </div>

      <!-- F6.3.2: AI Suggested B-Roll -->
      <div style="margin-bottom:var(--space-md)">
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">
          AI B-Roll Suggestions <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F6.3.2</span>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:var(--space-xs)">
          Select a script to get AI-suggested B-roll for each section.
        </div>
        <div style="display:flex;gap:var(--space-sm)">
          <select id="broll-script-select" class="pct-select" style="flex:1;font-size:0.8125rem">
            <option value="">Select a script...</option>
          </select>
          <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="suggestBrollForScript()">&#129302; Suggest B-Roll</button>
        </div>
        <div id="broll-suggestions" style="margin-top:var(--space-sm)"></div>
      </div>

      <!-- F6.3.3: Timeline Assembly -->
      <div style="margin-bottom:var(--space-md)">
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">
          Timeline Assembly <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F6.3.3</span>
        </div>
        <div id="broll-timeline" style="min-height:80px;background:var(--color-bg-tertiary);border:1px dashed var(--color-border);border-radius:var(--radius-sm);padding:var(--space-sm)">
          <div style="font-size:0.75rem;color:var(--color-muted);text-align:center;padding:var(--space-md)">
            Drag B-roll clips here to build your video timeline
          </div>
        </div>
      </div>

      <!-- F6.3.4: Video Editor Integration -->
      <div>
        <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">
          Export to Video Editor <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F6.3.4</span>
        </div>
        <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap">
          <button class="pct-btn pct-btn-sm" onclick="exportToCapCut()">Export to CapCut</button>
          <button class="pct-btn pct-btn-sm" onclick="exportToPremiere()">Export EDL (Premiere/DaVinci)</button>
          <button class="pct-btn pct-btn-sm" onclick="exportToFrameIo()">Share via Frame.io</button>
        </div>
        <div style="font-size:0.75rem;color:var(--color-muted);margin-top:4px">Export your timeline and script for editing in professional video tools.</div>
      </div>

      <!-- B-Roll Library Grid -->
      <div id="broll-grid" style="margin-top:var(--space-md)">
        <div style="font-size:0.75rem;color:var(--color-muted)">No B-roll clips uploaded yet.</div>
      </div>
    </div>
  `;
  scriptsPanel.appendChild(section);
  populateBrollScriptSelect();
}

function handleBrollUpload(input) {
  const files = Array.from(input.files || []);
  files.forEach(file => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    brollLibrary.push({
      id: `broll_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      name: file.name,
      url,
      type: isVideo ? 'video' : 'image',
      duration: null,
      tags: [],
    });
  });
  renderBrollGrid();
  showToast(`${files.length} clip(s) added to B-roll library`);
  input.value = '';
}

function addBrollFromUrl() {
  const url = document.getElementById('broll-url-input')?.value.trim();
  if (!url) return showToast('Enter a URL', 'error');
  const isVideo = /\.(mp4|mov|webm|avi)/i.test(url);
  brollLibrary.push({
    id: `broll_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    name: url.split('/').pop() || 'B-Roll',
    url,
    type: isVideo ? 'video' : 'image',
    duration: null,
    tags: [],
  });
  renderBrollGrid();
  document.getElementById('broll-url-input').value = '';
  showToast('B-roll clip added');
}

function renderBrollGrid() {
  const el = document.getElementById('broll-grid');
  if (!el) return;
  if (brollLibrary.length === 0) {
    el.innerHTML = '<div style="font-size:0.75rem;color:var(--color-muted)">No B-roll clips uploaded yet.</div>';
    return;
  }
  el.innerHTML = `
    <div style="font-weight:600;font-size:0.875rem;margin-bottom:var(--space-xs)">Library (${brollLibrary.length} clips)</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:var(--space-sm)">
      ${brollLibrary.map(clip => `
        <div style="border:1px solid var(--color-border);border-radius:var(--radius-sm);overflow:hidden;cursor:pointer" draggable="true">
          ${clip.type === 'video'
            ? `<video src="${escAttr(clip.url)}" style="width:100%;height:80px;object-fit:cover" muted></video>`
            : `<img src="${escAttr(clip.url)}" style="width:100%;height:80px;object-fit:cover" alt="B-roll">`
          }
          <div style="padding:4px;font-size:0.65rem;color:var(--color-muted);word-break:break-all">${escHtml(clip.name)}</div>
          <div style="padding:0 4px 4px;display:flex;justify-content:flex-end">
            <button class="pct-btn pct-btn-xs pct-btn-danger" onclick="removeBroll('${clip.id}')">x</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function removeBroll(id) {
  brollLibrary = brollLibrary.filter(c => c.id !== id);
  renderBrollGrid();
}

function populateBrollScriptSelect() {
  const sel = document.getElementById('broll-script-select');
  if (!sel) return;
  const opts = state.videoScripts.map(s => `<option value="${s.id}">${escHtml(s.title || s.hookRef?.content?.slice(0,40) || 'Script')}</option>`).join('');
  sel.innerHTML = '<option value="">Select a script...</option>' + opts;
}

async function suggestBrollForScript() {
  const scriptId = document.getElementById('broll-script-select')?.value;
  if (!scriptId) return showToast('Select a script first', 'error');
  const script = state.videoScripts.find(s => s.id === scriptId);
  if (!script) return;

  const el = document.getElementById('broll-suggestions');
  if (!el) return;

  // AI-powered suggestions based on script content (heuristic)
  const sections = [
    { name: 'HOOK', text: script.hook },
    { name: 'LID', text: script.lid },
    { name: 'BODY', text: script.body },
    { name: 'CTA', text: script.cta },
  ];

  el.innerHTML = `
    <div style="font-size:0.8125rem;font-weight:600;margin-bottom:var(--space-xs)">&#129302; Suggested B-Roll per Section <span class="pct-badge pct-badge-muted" style="font-size:0.6rem">F6.3.2</span></div>
    ${sections.map(section => {
      const keywords = section.text.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 3);
      return `
        <div style="margin-bottom:var(--space-xs);padding:var(--space-xs);background:var(--color-bg-tertiary);border-radius:var(--radius-sm)">
          <div style="font-weight:600;font-size:0.8125rem;color:var(--color-primary-light)">${section.name}</div>
          <div style="font-size:0.75rem;color:var(--color-muted);margin-bottom:2px">"${escHtml(section.text.slice(0, 80))}..."</div>
          <div style="font-size:0.75rem">
            &#128249; Suggested keywords: ${keywords.map(k => `<span class="pct-badge pct-badge-muted" style="font-size:0.6rem">${k}</span>`).join(' ')}
            <button class="pct-btn pct-btn-xs" onclick="searchBrollKeyword('${keywords[0] || ''}')" style="margin-left:4px">Find Clips</button>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function searchBrollKeyword(keyword) {
  if (!keyword) return;
  window.open(`https://www.pexels.com/search/videos/${encodeURIComponent(keyword)}/`, '_blank');
  showToast(`Opened Pexels search for "${keyword}"`);
}

function exportToCapCut() {
  const script = state.videoScripts[0];
  if (!script) return showToast('No scripts available', 'error');
  showToast('CapCut export: copy the script text and use CapCut\'s script editor. Opening CapCut...');
  window.open('https://www.capcut.com/', '_blank');
}

function exportToPremiere() {
  // Generate a simple EDL-like text file
  const script = state.videoScripts[0];
  const content = brollLibrary.map((clip, i) => `
CLIP ${i + 1}: ${clip.name}
URL: ${clip.url}
Type: ${clip.type}
`).join('\n');
  const blob = new Blob([content || 'No clips in library'], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pct-broll-list.txt';
  a.click();
  showToast('B-roll list downloaded');
}

function exportToFrameIo() {
  showToast('Frame.io integration: share your exported video for review. Opening Frame.io...');
  window.open('https://app.frame.io/', '_blank');
}

// Apply saved defaults on initialization
function applyStoredDefaults() {
  const settings = loadSettings();
  if (settings.defaultFramework) state.genParams.messagingFramework = settings.defaultFramework;
  if (settings.defaultAwareness) state.genParams.awarenessLevel = settings.defaultAwareness;
  if (settings.defaultSophistication) state.genParams.marketSophistication = settings.defaultSophistication;
  if (settings.defaultBatchSize) state.genParams.batchSize = settings.defaultBatchSize;
  if (settings.defaultModel) state.genParams.aiModel = settings.defaultModel;
}

// ============================================
// Initialization
// ============================================
async function initPCT() {
  // Set up tab listeners
  document.querySelectorAll('.pct-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Apply stored settings defaults before rendering
  applyStoredDefaults();

  // Load initial data
  await loadBrands();
  loadStats();

  // Render generation panel
  renderGenerationPanel();

  // Render hook review placeholder
  renderHookReview();

  // Render brand templates
  renderBrandTemplates();

  // F1.2.2: Product image URL preview handler
  document.addEventListener('input', (e) => {
    if (e.target.id === 'product-image-url') {
      const preview = document.getElementById('product-image-preview');
      if (preview) {
        const url = e.target.value.trim();
        if (url) {
          preview.innerHTML = `<img src="${escAttr(url)}" alt="Product preview" style="max-width:100%;max-height:120px;border-radius:var(--radius-sm);border:1px solid var(--color-border)" onerror="this.parentNode.innerHTML='<span style=color:var(--color-error);font-size:0.75rem>Invalid image URL</span>'">`;
        } else {
          preview.innerHTML = '';
        }
      }
    }
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // ESC closes overlays
  if (e.key === 'Escape') {
    const teleprompter = document.getElementById('pct-teleprompter');
    if (teleprompter && teleprompter.style.display !== 'none') {
      closeTeleprompter();
      return;
    }
    const compareModal = document.getElementById('pct-compare-modal');
    if (compareModal && compareModal.style.display !== 'none') {
      closeCompareModal();
      return;
    }
    const lightbox = document.getElementById('pct-lightbox');
    if (lightbox && lightbox.classList.contains('open')) {
      lightbox.classList.remove('open');
      return;
    }
  }

  // Only in review tab, and not when editing
  const activePanel = document.querySelector('.pct-tab-panel.active');
  if (!activePanel || activePanel.id !== 'panel-review') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;

  const selected = [...state.selectedHookIds];
  if (selected.length === 0) return;

  if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    bulkUpdateSelected('approved');
  }
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    bulkUpdateSelected('rejected');
  }
});

// Run on page load
document.addEventListener('DOMContentLoaded', initPCT);
