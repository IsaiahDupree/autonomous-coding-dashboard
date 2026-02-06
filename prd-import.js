// PRD Import from Multiple Formats (feat-060)
(function() {
  'use strict';

  // --- State ---
  const STORAGE_KEY = 'prd-import-config';
  let state = {
    notionApiKey: '',
    lastImportFormat: null,
    importHistory: [],
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = { ...state, ...JSON.parse(saved) };
    } catch(e) { /* ignore */ }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // --- CSS ---
  const style = document.createElement('style');
  style.textContent = `
    #prd-import-card {
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 12px;
      overflow: hidden;
    }
    #prd-import-card .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      background: var(--color-bg-tertiary, #151928);
    }
    #prd-import-card .card-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    #prd-import-card .card-body {
      padding: 20px;
    }

    /* Tab navigation */
    .pi-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      background: var(--color-bg-primary, #0a0e1a);
      border-radius: 8px;
      padding: 4px;
    }
    .pi-tab {
      flex: 1;
      padding: 10px 12px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary, #94a3b8);
      cursor: pointer;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;
      font-family: inherit;
    }
    .pi-tab:hover {
      color: var(--color-text-primary, #f1f5f9);
      background: var(--color-bg-secondary, #1a1f2e);
    }
    .pi-tab.active {
      background: var(--color-accent, #6366f1);
      color: #fff;
    }
    .pi-tab-icon {
      display: block;
      font-size: 1.2rem;
      margin-bottom: 2px;
    }

    /* Tab content panels */
    .pi-panel {
      display: none;
    }
    .pi-panel.active {
      display: block;
    }

    /* Form elements */
    .pi-field {
      margin-bottom: 14px;
    }
    .pi-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      margin-bottom: 6px;
    }
    .pi-input {
      width: 100%;
      padding: 8px 12px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 6px;
      color: var(--color-text-primary, #f1f5f9);
      font-size: 0.85rem;
      font-family: inherit;
      box-sizing: border-box;
    }
    .pi-input:focus {
      outline: none;
      border-color: var(--color-accent, #6366f1);
    }
    .pi-textarea {
      width: 100%;
      min-height: 150px;
      padding: 10px 12px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 6px;
      color: var(--color-text-primary, #f1f5f9);
      font-size: 0.85rem;
      font-family: 'JetBrains Mono', monospace;
      resize: vertical;
      box-sizing: border-box;
    }
    .pi-textarea:focus {
      outline: none;
      border-color: var(--color-accent, #6366f1);
    }
    .pi-hint {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #94a3b8);
      margin-top: 4px;
    }

    /* Buttons */
    .pi-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .pi-btn-primary {
      background: var(--color-accent, #6366f1);
      color: #fff;
    }
    .pi-btn-primary:hover {
      opacity: 0.9;
    }
    .pi-btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .pi-btn-secondary {
      background: var(--color-bg-primary, #0a0e1a);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
    }
    .pi-btn-secondary:hover {
      color: var(--color-text-primary, #f1f5f9);
    }
    .pi-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    /* File drop zone */
    .pi-dropzone {
      border: 2px dashed var(--color-border, #2a2f3e);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      color: var(--color-text-secondary, #94a3b8);
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 12px;
    }
    .pi-dropzone:hover, .pi-dropzone.dragover {
      border-color: var(--color-accent, #6366f1);
      background: rgba(99, 102, 241, 0.05);
    }
    .pi-dropzone-icon {
      font-size: 2rem;
      margin-bottom: 8px;
    }
    .pi-dropzone-text {
      font-size: 0.85rem;
    }
    .pi-dropzone-sub {
      font-size: 0.75rem;
      margin-top: 4px;
      opacity: 0.7;
    }

    /* Preview */
    .pi-preview {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
      display: none;
    }
    .pi-preview.visible {
      display: block;
    }
    .pi-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .pi-preview-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    .pi-preview-badge {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--color-accent, #6366f1);
      color: #fff;
    }
    .pi-preview-content {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #94a3b8);
      line-height: 1.6;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Import history */
    .pi-history {
      margin-top: 16px;
      border-top: 1px solid var(--color-border, #2a2f3e);
      padding-top: 12px;
    }
    .pi-history-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-text-secondary, #94a3b8);
      margin-bottom: 8px;
    }
    .pi-history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      background: var(--color-bg-primary, #0a0e1a);
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 0.8rem;
    }
    .pi-history-format {
      font-weight: 500;
      color: var(--color-text-primary, #f1f5f9);
    }
    .pi-history-date {
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.75rem;
    }
    .pi-history-size {
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.75rem;
    }

    /* Status message */
    .pi-status {
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      margin-top: 10px;
      display: none;
    }
    .pi-status.visible {
      display: block;
    }
    .pi-status.success {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .pi-status.error {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    /* Notion-specific */
    .pi-notion-config {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .pi-notion-config .pi-field {
      flex: 1;
      margin-bottom: 0;
    }

    /* Google Docs specific */
    .pi-gdocs-url-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .pi-gdocs-url-row .pi-field {
      flex: 1;
      margin-bottom: 0;
    }
  `;
  document.head.appendChild(style);

  // --- Parsers ---

  // Parse Notion export (JSON or Markdown-like content from Notion)
  function parseNotionContent(text) {
    const lines = text.split('\n');
    const result = {
      title: '',
      sections: [],
      rawText: text,
    };

    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Notion headings: # Title or properties
      if (trimmed.startsWith('# ')) {
        result.title = trimmed.slice(2).trim();
      } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        if (currentSection) result.sections.push(currentSection);
        currentSection = { heading: trimmed.replace(/^#+\s*/, ''), content: [] };
      } else if (currentSection) {
        currentSection.content.push(trimmed);
      } else {
        // Pre-section content
        if (!currentSection) {
          currentSection = { heading: 'Overview', content: [] };
        }
        currentSection.content.push(trimmed);
      }
    }
    if (currentSection) result.sections.push(currentSection);

    return result;
  }

  // Parse Google Docs content (HTML-like or plain text from Google Docs export)
  function parseGoogleDocsContent(text) {
    const result = {
      title: '',
      sections: [],
      rawText: text,
    };

    // Try to detect if it's HTML
    if (text.includes('<html') || text.includes('<body') || text.includes('<div') || text.includes('<h1') || text.includes('<h2') || text.includes('<p>')) {
      // Simple HTML extraction
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;

      // Extract title from h1 or title tag
      const h1 = tempDiv.querySelector('h1');
      const titleTag = tempDiv.querySelector('title');
      result.title = h1 ? h1.textContent.trim() : (titleTag ? titleTag.textContent.trim() : '');

      // Extract sections from headings
      const elements = tempDiv.querySelectorAll('h1, h2, h3, h4, p, li, div');
      let currentSection = null;

      elements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        const txt = el.textContent.trim();
        if (!txt) return;

        if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
          if (currentSection) result.sections.push(currentSection);
          currentSection = { heading: txt, content: [] };
        } else if (tag === 'p' || tag === 'li') {
          if (!currentSection) currentSection = { heading: 'Content', content: [] };
          currentSection.content.push(txt);
        }
      });

      if (currentSection) result.sections.push(currentSection);
    } else {
      // Treat as plain text, same as markdown-like
      return parseNotionContent(text);
    }

    return result;
  }

  // Parse Markdown content
  function parseMarkdownContent(text) {
    const lines = text.split('\n');
    const result = {
      title: '',
      sections: [],
      rawText: text,
      metadata: {},
    };

    let currentSection = null;
    let inFrontmatter = false;
    let frontmatterLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // YAML frontmatter detection
      if (i === 0 && trimmed === '---') {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter) {
        if (trimmed === '---') {
          inFrontmatter = false;
          // Parse frontmatter
          for (const fl of frontmatterLines) {
            const parts = fl.split(':');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              const val = parts.slice(1).join(':').trim();
              result.metadata[key] = val;
              if (key === 'title') result.title = val;
            }
          }
          continue;
        }
        frontmatterLines.push(trimmed);
        continue;
      }

      if (!trimmed) continue;

      // Heading levels
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];

        if (level === 1 && !result.title) {
          result.title = headingText;
        }

        if (currentSection) result.sections.push(currentSection);
        currentSection = { heading: headingText, level, content: [] };
      } else {
        if (!currentSection) {
          currentSection = { heading: 'Content', level: 2, content: [] };
        }
        currentSection.content.push(trimmed);
      }
    }
    if (currentSection) result.sections.push(currentSection);

    return result;
  }

  // --- Format to PRD text ---
  function formatAsPrd(parsed, format) {
    let prd = '';
    if (parsed.title) {
      prd += `# ${parsed.title}\n\n`;
    }
    if (parsed.metadata && Object.keys(parsed.metadata).length > 0) {
      prd += '**Metadata:**\n';
      for (const [k, v] of Object.entries(parsed.metadata)) {
        if (k !== 'title') prd += `- ${k}: ${v}\n`;
      }
      prd += '\n';
    }
    for (const section of parsed.sections) {
      const level = section.level || 2;
      prd += `${'#'.repeat(level)} ${section.heading}\n\n`;
      for (const line of section.content) {
        prd += `${line}\n`;
      }
      prd += '\n';
    }
    return prd.trim();
  }

  // --- Import handlers ---
  function importFromNotion() {
    const apiKey = document.getElementById('pi-notion-api-key').value.trim();
    const pageUrl = document.getElementById('pi-notion-page-url').value.trim();
    const content = document.getElementById('pi-notion-content').value.trim();

    if (!content && !pageUrl) {
      showStatus('error', 'Please paste Notion content or enter a page URL');
      return null;
    }

    // If content is pasted, parse directly
    const textToParse = content || `# Notion Import\n\nPage URL: ${pageUrl}\n\nNote: Direct Notion API integration requires a backend. Content was referenced from: ${pageUrl}`;

    if (apiKey) {
      state.notionApiKey = apiKey;
      saveState();
    }

    const parsed = parseNotionContent(textToParse);
    const prdText = formatAsPrd(parsed, 'notion');

    addToHistory('Notion', prdText.length);
    showPreview(prdText, 'Notion');
    showStatus('success', `Imported from Notion: "${parsed.title || 'Untitled'}" (${parsed.sections.length} sections)`);

    return prdText;
  }

  function importFromGoogleDocs() {
    const docUrl = document.getElementById('pi-gdocs-url').value.trim();
    const content = document.getElementById('pi-gdocs-content').value.trim();

    if (!content && !docUrl) {
      showStatus('error', 'Please paste Google Docs content or enter a document URL');
      return null;
    }

    const textToParse = content || `# Google Docs Import\n\nDocument URL: ${docUrl}\n\nNote: Direct Google Docs API integration requires a backend. Content was referenced from: ${docUrl}`;

    const parsed = parseGoogleDocsContent(textToParse);
    const prdText = formatAsPrd(parsed, 'google-docs');

    addToHistory('Google Docs', prdText.length);
    showPreview(prdText, 'Google Docs');
    showStatus('success', `Imported from Google Docs: "${parsed.title || 'Untitled'}" (${parsed.sections.length} sections)`);

    return prdText;
  }

  function importFromMarkdown() {
    const content = document.getElementById('pi-markdown-content').value.trim();
    const fileContent = document.getElementById('pi-markdown-file-content');

    const textToParse = content || (fileContent ? fileContent.value : '');

    if (!textToParse) {
      showStatus('error', 'Please paste markdown content or drop a file');
      return null;
    }

    const parsed = parseMarkdownContent(textToParse);
    const prdText = formatAsPrd(parsed, 'markdown');

    addToHistory('Markdown', prdText.length);
    showPreview(prdText, 'Markdown');
    showStatus('success', `Imported from Markdown: "${parsed.title || 'Untitled'}" (${parsed.sections.length} sections, ${Object.keys(parsed.metadata || {}).length} metadata fields)`);

    return prdText;
  }

  // --- UI helpers ---
  function showStatus(type, message) {
    const el = document.getElementById('pi-status');
    if (!el) return;
    el.className = 'pi-status visible ' + type;
    el.textContent = message;
    setTimeout(() => { el.classList.remove('visible'); }, 5000);
  }

  function showPreview(text, format) {
    const preview = document.getElementById('pi-preview');
    const content = document.getElementById('pi-preview-content');
    const badge = document.getElementById('pi-preview-badge');
    if (!preview) return;
    preview.classList.add('visible');
    badge.textContent = format;
    content.textContent = text;
  }

  function addToHistory(format, size) {
    state.lastImportFormat = format;
    state.importHistory.unshift({
      format,
      date: new Date().toISOString(),
      size,
    });
    if (state.importHistory.length > 10) state.importHistory.length = 10;
    saveState();
    renderHistory();
  }

  function renderHistory() {
    const list = document.getElementById('pi-history-list');
    if (!list) return;
    if (state.importHistory.length === 0) {
      list.innerHTML = '<div style="font-size:0.8rem;color:var(--color-text-secondary);padding:8px;">No imports yet</div>';
      return;
    }
    list.innerHTML = state.importHistory.map(item => {
      const date = new Date(item.date);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sizeStr = item.size > 1024 ? `${(item.size/1024).toFixed(1)}KB` : `${item.size}B`;
      return `<div class="pi-history-item">
        <span class="pi-history-format">${item.format}</span>
        <span class="pi-history-date">${dateStr}</span>
        <span class="pi-history-size">${sizeStr}</span>
      </div>`;
    }).join('');
  }

  function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.pi-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.pi-tab[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Update panels
    document.querySelectorAll('.pi-panel').forEach(p => p.classList.remove('active'));
    const activePanel = document.getElementById(`pi-panel-${tabName}`);
    if (activePanel) activePanel.classList.add('active');
  }

  // --- Build UI ---
  function render() {
    const container = document.getElementById('prd-import-widget');
    if (!container) return;

    container.innerHTML = `
      <div id="prd-import-card">
        <div class="card-header">
          <h3>📥 PRD Import</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:0.75rem;color:var(--color-text-secondary);">Import from multiple formats</span>
          </div>
        </div>
        <div class="card-body">
          <!-- Tab navigation -->
          <div class="pi-tabs" id="pi-tabs">
            <button class="pi-tab active" data-tab="notion" onclick="window.prdImport.switchTab('notion')">
              <span class="pi-tab-icon">📝</span>
              Notion
            </button>
            <button class="pi-tab" data-tab="google-docs" onclick="window.prdImport.switchTab('google-docs')">
              <span class="pi-tab-icon">📄</span>
              Google Docs
            </button>
            <button class="pi-tab" data-tab="markdown" onclick="window.prdImport.switchTab('markdown')">
              <span class="pi-tab-icon">📋</span>
              Markdown
            </button>
          </div>

          <!-- Notion Panel -->
          <div class="pi-panel active" id="pi-panel-notion">
            <div class="pi-field">
              <label class="pi-label">Notion API Key (optional)</label>
              <input type="password" class="pi-input" id="pi-notion-api-key" placeholder="secret_..." value="${state.notionApiKey || ''}">
              <div class="pi-hint">For direct API access. Leave blank to paste content manually.</div>
            </div>
            <div class="pi-field">
              <label class="pi-label">Notion Page URL (optional)</label>
              <input type="text" class="pi-input" id="pi-notion-page-url" placeholder="https://notion.so/your-page-id">
            </div>
            <div class="pi-field">
              <label class="pi-label">Paste Notion Content</label>
              <textarea class="pi-textarea" id="pi-notion-content" placeholder="Paste your Notion page content here...&#10;&#10;Supports markdown-formatted exports from Notion.&#10;Use File > Export > Markdown & CSV in Notion."></textarea>
            </div>
            <div class="pi-actions">
              <button class="pi-btn pi-btn-primary" id="pi-notion-import-btn" onclick="window.prdImport.importNotion()">Import from Notion</button>
              <button class="pi-btn pi-btn-secondary" onclick="window.prdImport.loadNotionDemo()">Load Demo</button>
            </div>
          </div>

          <!-- Google Docs Panel -->
          <div class="pi-panel" id="pi-panel-google-docs">
            <div class="pi-field">
              <label class="pi-label">Google Docs URL (optional)</label>
              <div class="pi-gdocs-url-row">
                <div class="pi-field">
                  <input type="text" class="pi-input" id="pi-gdocs-url" placeholder="https://docs.google.com/document/d/...">
                </div>
              </div>
              <div class="pi-hint">For reference. Paste content below for direct import.</div>
            </div>
            <div class="pi-field">
              <label class="pi-label">Paste Google Docs Content</label>
              <textarea class="pi-textarea" id="pi-gdocs-content" placeholder="Copy content from Google Docs and paste here...&#10;&#10;Supports both plain text and HTML content.&#10;Use Ctrl+A to select all, then Ctrl+C to copy."></textarea>
            </div>
            <div class="pi-actions">
              <button class="pi-btn pi-btn-primary" id="pi-gdocs-import-btn" onclick="window.prdImport.importGoogleDocs()">Import from Google Docs</button>
              <button class="pi-btn pi-btn-secondary" onclick="window.prdImport.loadGoogleDocsDemo()">Load Demo</button>
            </div>
          </div>

          <!-- Markdown Panel -->
          <div class="pi-panel" id="pi-panel-markdown">
            <div class="pi-dropzone" id="pi-markdown-dropzone">
              <div class="pi-dropzone-icon">📁</div>
              <div class="pi-dropzone-text">Drop a .md file here or click to browse</div>
              <div class="pi-dropzone-sub">Supports .md and .txt files</div>
              <input type="file" id="pi-markdown-file" accept=".md,.txt,.markdown" style="display:none;">
              <input type="hidden" id="pi-markdown-file-content">
            </div>
            <div class="pi-field">
              <label class="pi-label">Or Paste Markdown Content</label>
              <textarea class="pi-textarea" id="pi-markdown-content" placeholder="# My PRD&#10;&#10;## Overview&#10;Paste your markdown content here...&#10;&#10;## Features&#10;- Feature 1&#10;- Feature 2"></textarea>
            </div>
            <div class="pi-actions">
              <button class="pi-btn pi-btn-primary" id="pi-markdown-import-btn" onclick="window.prdImport.importMarkdown()">Import Markdown</button>
              <button class="pi-btn pi-btn-secondary" onclick="window.prdImport.loadMarkdownDemo()">Load Demo</button>
            </div>
          </div>

          <!-- Status -->
          <div class="pi-status" id="pi-status"></div>

          <!-- Preview -->
          <div class="pi-preview" id="pi-preview">
            <div class="pi-preview-header">
              <span class="pi-preview-title">Import Preview</span>
              <span class="pi-preview-badge" id="pi-preview-badge">-</span>
            </div>
            <div class="pi-preview-content" id="pi-preview-content"></div>
          </div>

          <!-- Import History -->
          <div class="pi-history" id="pi-history">
            <div class="pi-history-title">Recent Imports</div>
            <div id="pi-history-list"></div>
          </div>
        </div>
      </div>
    `;

    // Set up file drop zone
    setupDropzone();
    renderHistory();
  }

  function setupDropzone() {
    const dropzone = document.getElementById('pi-markdown-dropzone');
    const fileInput = document.getElementById('pi-markdown-file');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileUpload(file);
    });
  }

  function handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      document.getElementById('pi-markdown-content').value = content;
      document.getElementById('pi-markdown-file-content').value = content;
      const dropzone = document.getElementById('pi-markdown-dropzone');
      dropzone.querySelector('.pi-dropzone-text').textContent = `File loaded: ${file.name}`;
      dropzone.querySelector('.pi-dropzone-sub').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    };
    reader.readAsText(file);
  }

  // --- Demo data ---
  function loadNotionDemo() {
    document.getElementById('pi-notion-content').value = `# User Authentication System PRD

## Overview
This document describes the requirements for implementing a comprehensive user authentication system for the platform.

## Goals
- Secure user registration and login
- Support for OAuth providers (Google, GitHub)
- Session management with JWT tokens
- Password reset functionality

## Requirements

### User Registration
- Users can register with email and password
- Email verification required before account activation
- Password strength requirements: minimum 8 chars, 1 uppercase, 1 number

### Login Flow
- Email/password login with rate limiting
- OAuth login via Google and GitHub
- Remember me functionality with persistent sessions
- Account lockout after 5 failed attempts

### Session Management
- JWT-based sessions with 24h expiry
- Refresh token rotation for security
- Concurrent session detection and management

## Acceptance Criteria
- Registration completes in under 3 seconds
- Login supports 2FA via authenticator app
- Password reset emails sent within 30 seconds
- Sessions invalidated on password change`;
    showStatus('success', 'Demo Notion content loaded - click Import to process');
  }

  function loadGoogleDocsDemo() {
    document.getElementById('pi-gdocs-content').value = `<h1>E-Commerce Platform PRD</h1>
<h2>Product Overview</h2>
<p>A full-featured e-commerce platform enabling merchants to sell products online with integrated payment processing and inventory management.</p>

<h2>Target Users</h2>
<p>Small to medium-sized businesses looking for an affordable, easy-to-use online selling solution.</p>

<h2>Core Features</h2>
<h3>Product Catalog</h3>
<p>Merchants can create, edit, and organize product listings with images, descriptions, pricing, and variants.</p>
<p>Support for categories, tags, and search filters.</p>

<h3>Shopping Cart</h3>
<p>Persistent cart that saves across sessions.</p>
<p>Real-time inventory checking during checkout.</p>
<p>Support for discount codes and promotions.</p>

<h3>Payment Processing</h3>
<p>Integration with Stripe and PayPal.</p>
<p>Support for credit cards, digital wallets, and bank transfers.</p>
<p>Automated invoice generation.</p>

<h2>Success Metrics</h2>
<p>Cart abandonment rate below 30%</p>
<p>Average checkout time under 2 minutes</p>
<p>99.9% payment processing uptime</p>`;
    showStatus('success', 'Demo Google Docs content loaded - click Import to process');
  }

  function loadMarkdownDemo() {
    document.getElementById('pi-markdown-content').value = `---
title: Mobile App Feature Spec
author: Product Team
version: 2.1
date: 2025-01-15
status: Draft
---

# Mobile App Feature Spec

## Overview

This specification covers the next release of our mobile application, focusing on performance improvements and new social features.

## Features

### Push Notifications
- Real-time notifications for messages, mentions, and updates
- Customizable notification preferences per channel
- Silent notifications for low-priority events
- Notification grouping by conversation

### Social Feed
- Chronological and algorithmic feed options
- Support for text, image, and video posts
- Like, comment, and share interactions
- Content moderation with automated filtering

### Offline Mode
- Local caching of recent conversations
- Queue outgoing messages when offline
- Sync state indicators for pending operations
- Conflict resolution for concurrent edits

## Technical Requirements
- Target 60fps scrolling performance
- App size under 50MB
- Support iOS 15+ and Android 12+
- Background sync interval: 5 minutes

## Timeline
- Phase 1: Push notifications and offline mode
- Phase 2: Social feed
- Phase 3: Performance optimization`;
    showStatus('success', 'Demo Markdown content loaded - click Import to process');
  }

  // --- Public API ---
  window.prdImport = {
    switchTab,
    importNotion: importFromNotion,
    importGoogleDocs: importFromGoogleDocs,
    importMarkdown: importFromMarkdown,
    loadNotionDemo,
    loadGoogleDocsDemo,
    loadMarkdownDemo,
    getState: () => ({ ...state }),
    parseNotion: parseNotionContent,
    parseGoogleDocs: parseGoogleDocsContent,
    parseMarkdown: parseMarkdownContent,
  };

  // --- Init ---
  loadState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
