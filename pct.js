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
  stats: {},
  // Generation params
  genParams: {
    uspId: null,
    angleId: null,
    messagingFramework: 'punchy',
    awarenessLevel: 3,
    marketSophistication: 3,
    batchSize: 10,
  },
  matrixMode: false,
  matrixParams: {
    frameworks: new Set(),
    awarenessLevels: new Set(),
    sophisticationLevels: new Set(),
  },
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
  // Video Scripts state
  videoScripts: [],
  videoScriptsTotal: 0,
  selectedScriptHookId: null,
  scriptDuration: 'thirty_seconds',
  scriptNarratorStyle: null,
  scriptFilters: { status: null, duration: null },
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

  // Video Scripts
  generateVideoScript: (data) => api('/video-scripts/generate', { method: 'POST', body: data }),
  getVideoScripts: (params) => {
    const qs = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
    return api(`/video-scripts?${qs.toString()}`);
  },
  getVideoScript: (id) => api(`/video-scripts/${id}`),
  updateVideoScript: (id, data) => api(`/video-scripts/${id}`, { method: 'PATCH', body: data }),
  deleteVideoScript: (id) => api(`/video-scripts/${id}`, { method: 'DELETE' }),

  // Stats
  getStats: () => api('/stats'),
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
    loadVideoScripts();
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
  el.innerHTML = state.brands.map(b => `
    <div class="pct-list-item ${state.selectedBrandId === b.id ? 'selected' : ''}" onclick="selectBrand('${b.id}')">
      <div>
        <div class="pct-list-item-text">${escHtml(b.name)}</div>
        <div class="pct-list-item-meta">${(b.products || []).length} product(s)</div>
      </div>
      <div class="pct-list-item-actions">
        <button class="pct-btn pct-btn-sm pct-btn-icon" onclick="event.stopPropagation(); deleteBrand('${b.id}')" title="Delete">x</button>
      </div>
    </div>
  `).join('');
}

async function createBrand() {
  const name = document.getElementById('brand-name').value.trim();
  if (!name) return showToast('Brand name is required', 'error');
  const data = {
    name,
    description: document.getElementById('brand-desc').value.trim() || null,
    voice: document.getElementById('brand-voice').value.trim() || null,
    values: document.getElementById('brand-values').value.trim() || null,
    toneStyle: document.getElementById('brand-tone').value || null,
  };
  try {
    await pctApi.createBrand(data);
    document.getElementById('brand-name').value = '';
    document.getElementById('brand-desc').value = '';
    document.getElementById('brand-voice').value = '';
    document.getElementById('brand-values').value = '';
    document.getElementById('brand-tone').value = '';
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

  const data = {
    name,
    description: document.getElementById('product-desc').value.trim() || null,
    features: featuresRaw ? featuresRaw.split('\n').map(s => s.trim()).filter(Boolean) : [],
    benefits: benefitsRaw ? benefitsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [],
    targetAudience: document.getElementById('product-audience').value.trim() || null,
    pricePoint: document.getElementById('product-price').value.trim() || null,
    category: document.getElementById('product-category').value.trim() || null,
  };
  try {
    await pctApi.createProduct(state.selectedBrandId, data);
    // Clear form
    ['product-name', 'product-desc', 'product-features', 'product-benefits', 'product-audience', 'product-price', 'product-category'].forEach(id => {
      document.getElementById(id).value = '';
    });
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
    const { data } = await pctApi.getUsps(state.selectedProductId);
    state.usps = data;
    renderUsps();
    populateGenDropdowns();
  } catch (e) {
    showToast('Failed to load USPs: ' + e.message, 'error');
  }
}

function renderUsps() {
  const el = document.getElementById('usp-list');
  if (!el) return;
  if (!state.selectedProductId) {
    el.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">Select a product in the Context tab first</div></div>';
    return;
  }
  if (state.usps.length === 0) {
    el.innerHTML = '<div class="pct-empty"><div class="pct-empty-text">No USPs yet. Add manually or generate with AI.</div></div>';
    return;
  }
  el.innerHTML = state.usps.map(u => {
    const angles = u.angles || [];
    return `
      <div class="pct-usp-item">
        <div class="pct-usp-header" onclick="toggleUsp('${u.id}')">
          <span class="pct-expand-arrow" id="arrow-${u.id}">&#9654;</span>
          <span class="pct-usp-text">${escHtml(u.content)}</span>
          <div style="display:flex;align-items:center;gap:0.5rem">
            ${u.isAiGenerated ? '<span class="pct-badge pct-badge-primary">AI</span>' : ''}
            <span class="pct-badge pct-badge-muted">${angles.length} angles</span>
            <span class="pct-badge pct-badge-muted">${u._count?.hooks || 0} hooks</span>
            <button class="pct-btn pct-btn-sm pct-btn-icon pct-btn-danger" onclick="event.stopPropagation(); deleteUsp('${u.id}')" title="Delete">x</button>
          </div>
        </div>
        <div class="pct-usp-body" id="usp-body-${u.id}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin:var(--space-sm) 0">
            <span style="font-size:0.8125rem;color:var(--color-text-secondary)">Marketing Angles</span>
            <button class="pct-btn pct-btn-sm pct-btn-primary" onclick="generateAnglesForUsp('${u.id}')" id="gen-angles-${u.id}">Generate Angles</button>
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
    const { data } = await pctApi.generateAngles(uspId, 8);
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
const FRAMEWORKS = [
  { key: 'punchy', label: 'Punchy', desc: 'Short, impactful (5-8 words)', examples: ['Shaky hands, steady glow.', 'No mirror, no problem.', 'One swipe. Done.'] },
  { key: 'bold_statements', label: 'Bold Statements', desc: 'Provocative claims', examples: ['The last serum you\'ll ever buy.', 'We made skincare boring (on purpose).', 'Your dermatologist won\'t tell you this.'] },
  { key: 'desire_future_states', label: 'Desire Future', desc: 'Aspirational outcomes', examples: ['Imagine waking up to glass skin.', 'The confidence of bare-faced beauty.', 'Walk into any room glowing.'] },
  { key: 'question_based', label: 'Question-Based', desc: 'Curiosity-driven', examples: ['What if your skincare actually worked?', 'Still layering 10 products?', 'Why do models use half the products you do?'] },
  { key: 'problem_agitation', label: 'Problem-Agitation', desc: 'Pain-focused', examples: ['Tired of wasting money on serums that expire unused?', 'Your skin shouldn\'t feel like a science experiment.', 'Another breakout from another "miracle" product.'] },
  { key: 'social_proof', label: 'Social Proof', desc: 'Testimonial-style', examples: ['50,000 women switched this month.', '"I threw out my entire routine" - Sarah K.', '4.9 stars from 12,000+ reviews.'] },
  { key: 'urgency_scarcity', label: 'Urgency/Scarcity', desc: 'FOMO, limited time', examples: ['Selling out again. Last 200 units.', '48-hour price drop. Not a drill.', 'The restock everyone waited for.'] },
  { key: 'educational', label: 'Educational', desc: 'How-to, revealing info', examples: ['3 ingredients that actually reduce wrinkles.', 'The science behind buildable coverage.', 'How Korean skincare changed everything.'] },
];

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
        <label>Messaging Framework ${state.matrixMode ? '<span style="color:var(--color-warning);font-size:0.75rem">(select multiple)</span>' : ''}</label>
        <div class="pct-param-grid" id="framework-selector">
          ${FRAMEWORKS.map(f => {
            const isSelected = state.matrixMode
              ? state.matrixParams.frameworks.has(f.key)
              : state.genParams.messagingFramework === f.key;
            return `
            <div class="pct-param-card ${isSelected ? 'selected' : ''}"
                 onclick="${state.matrixMode ? `toggleMatrixFramework('${f.key}')` : `selectFramework('${f.key}')`}">
              <div class="pct-param-card-title">${f.label}</div>
              <div class="pct-param-card-desc">${f.desc}</div>
              <div class="pct-param-card-examples">
                ${f.examples.map(ex => `<div class="pct-param-example">"${escHtml(ex)}"</div>`).join('')}
              </div>
            </div>
          `}).join('')}
        </div>
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
        <label>Market Sophistication ${state.matrixMode ? '<span style="color:var(--color-warning);font-size:0.75rem">(select multiple)</span>' : ''}</label>
        <div class="pct-soph-scale" id="soph-selector">
          ${SOPH_LEVELS.map(s => {
            const isSelected = state.matrixMode
              ? state.matrixParams.sophisticationLevels.has(s.num)
              : state.genParams.marketSophistication === s.num;
            return `
            <div class="pct-soph-level ${isSelected ? 'selected' : ''}"
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
          ${FRAMEWORKS.map(f => `<option value="${f.key}" ${state.hookFilters.messagingFramework === f.key ? 'selected' : ''}>${f.label}</option>`).join('')}
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
      `<div class="pct-hooks-grid">${state.hooks.map(h => renderHookCard(h)).join('')}</div>`}

    ${state.hookTotal > 50 ? `
      <div style="display:flex;gap:var(--space-sm);justify-content:center;margin-top:var(--space-md)">
        <button class="pct-btn pct-btn-sm" onclick="hookPagePrev()" ${state.hookPage === 0 ? 'disabled' : ''}>Previous</button>
        <span style="font-size:0.8125rem;color:var(--color-text-muted);padding:0.375rem">Page ${state.hookPage + 1} of ${Math.ceil(state.hookTotal / 50)}</span>
        <button class="pct-btn pct-btn-sm" onclick="hookPageNext()" ${(state.hookPage + 1) * 50 >= state.hookTotal ? 'disabled' : ''}>Next</button>
      </div>
    ` : ''}
  `;
}

function renderHookCard(h) {
  const selected = state.selectedHookIds.has(h.id);
  const statusClass = h.status === 'approved' ? 'approved' : h.status === 'rejected' ? 'rejected' : '';
  return `
    <div class="pct-hook-card ${statusClass}">
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
      </div>
      <div class="pct-hook-actions">
        <div class="pct-stars">
          ${[1,2,3,4,5].map(n => `<button class="pct-star ${(h.rating || 0) >= n ? 'filled' : ''}" onclick="rateHook('${h.id}', ${n})">&#9733;</button>`).join('')}
        </div>
        <button class="pct-btn pct-btn-sm ${h.status === 'approved' ? 'pct-btn-success' : ''}" onclick="setHookStatus('${h.id}', 'approved')">Approve</button>
        <button class="pct-btn pct-btn-sm ${h.status === 'rejected' ? 'pct-btn-danger' : ''}" onclick="setHookStatus('${h.id}', 'rejected')">Reject</button>
        <button class="pct-btn pct-btn-sm" onclick="generateMoreLikeThis('${h.id}')" title="Generate variations with same parameters">More like this</button>
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
    const { data } = await pctApi.generateVideoScript({
      hookId: state.selectedScriptHookId,
      productId: state.selectedProductId,
      duration: state.scriptDuration,
      narratorStyle: state.scriptNarratorStyle,
    });

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
              <div class="pct-script-section-label">Hook (0-3s)</div>
              <div class="pct-script-section-text" contenteditable="true" data-script-id="${script.id}" data-field="hook" onblur="onScriptSectionEdit(this)">${escHtml(script.hook)}</div>
            </div>
            <div class="pct-script-section" data-section="lid">
              <div class="pct-script-section-label">Lid (3-8s)</div>
              <div class="pct-script-section-text" contenteditable="true" data-script-id="${script.id}" data-field="lid" onblur="onScriptSectionEdit(this)">${escHtml(script.lid)}</div>
            </div>
            <div class="pct-script-section" data-section="body">
              <div class="pct-script-section-label">Body</div>
              <div class="pct-script-section-text" contenteditable="true" data-script-id="${script.id}" data-field="body" onblur="onScriptSectionEdit(this)">${escHtml(script.body)}</div>
            </div>
            <div class="pct-script-section" data-section="cta">
              <div class="pct-script-section-label">CTA</div>
              <div class="pct-script-section-text" contenteditable="true" data-script-id="${script.id}" data-field="cta" onblur="onScriptSectionEdit(this)">${escHtml(script.cta)}</div>
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
// Initialization
// ============================================
async function initPCT() {
  // Set up tab listeners
  document.querySelectorAll('.pct-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Load initial data
  await loadBrands();
  loadStats();

  // Render generation panel
  renderGenerationPanel();

  // Render hook review placeholder
  renderHookReview();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // ESC closes lightbox
  if (e.key === 'Escape') {
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
