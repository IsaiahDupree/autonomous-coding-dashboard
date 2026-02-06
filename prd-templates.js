// PRD Template Library (feat-062)
(function() {
  'use strict';

  const STORAGE_KEY = 'prd-templates-config';
  let state = {
    customTemplates: [],
    sharedTemplates: [],
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

  // --- Pre-built Templates ---
  const BUILTIN_TEMPLATES = [
    {
      id: 'tpl-feature',
      name: 'Feature Specification',
      category: 'Engineering',
      description: 'Standard template for new feature PRDs',
      content: `# [Feature Name]

## Overview
Brief description of the feature and its purpose.

## Goals
- Primary goal
- Secondary goal

## User Stories
- As a [user type], I want to [action] so that [benefit]

## Requirements

### Functional Requirements
- Requirement 1
- Requirement 2

### Non-Functional Requirements
- Performance: [target]
- Security: [requirements]
- Scalability: [expectations]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Edge Cases
- Edge case 1
- Edge case 2

## Technical Design
Architecture notes, API endpoints, data models, etc.

## Dependencies
- Dependency 1
- Dependency 2

## Success Metrics
- Metric 1: [target]
- Metric 2: [target]`,
    },
    {
      id: 'tpl-bugfix',
      name: 'Bug Fix Report',
      category: 'Engineering',
      description: 'Template for documenting bug fixes',
      content: `# Bug Fix: [Title]

## Problem Description
What is the issue? When does it occur?

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?

## Root Cause Analysis
Why is this happening?

## Proposed Fix
How will we fix it?

## Acceptance Criteria
- [ ] Bug no longer reproducible
- [ ] No regression in related features
- [ ] Unit tests added for the fix

## Testing Plan
- Unit tests
- Integration tests
- Manual verification steps`,
    },
    {
      id: 'tpl-api',
      name: 'API Design Document',
      category: 'Engineering',
      description: 'Template for API endpoint specifications',
      content: `# API: [Endpoint Name]

## Overview
Purpose and scope of this API.

## Endpoints

### GET /api/resource
- **Description**: Retrieve resources
- **Authentication**: Required
- **Parameters**:
  - \`page\` (int, optional): Page number
  - \`limit\` (int, optional): Items per page
- **Response**: 200 OK
\`\`\`json
{
  "data": [],
  "total": 0,
  "page": 1
}
\`\`\`

### POST /api/resource
- **Description**: Create a resource
- **Authentication**: Required
- **Body**:
\`\`\`json
{
  "name": "string",
  "description": "string"
}
\`\`\`
- **Response**: 201 Created

## Error Handling
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting
- 100 requests per minute per user

## Authentication
JWT Bearer token required in Authorization header`,
    },
    {
      id: 'tpl-ux',
      name: 'UX Design Brief',
      category: 'Design',
      description: 'Template for UX/UI design requirements',
      content: `# UX Design: [Feature Name]

## Context
Background and motivation for this design.

## User Personas
- **Persona 1**: Description, goals, pain points
- **Persona 2**: Description, goals, pain points

## User Flows
1. Entry point
2. Key interactions
3. Completion/exit

## Wireframes
[Attach or describe wireframe layouts]

## Design Requirements
- Responsive breakpoints: mobile (320px), tablet (768px), desktop (1024px+)
- Accessibility: WCAG 2.1 AA compliance
- Color scheme: [specification]
- Typography: [specification]

## Interactions
- Hover states
- Loading states
- Error states
- Empty states
- Success states

## Acceptance Criteria
- [ ] Mobile-responsive design
- [ ] Keyboard navigable
- [ ] Screen reader compatible
- [ ] Consistent with design system`,
    },
    {
      id: 'tpl-integration',
      name: 'Integration Specification',
      category: 'Engineering',
      description: 'Template for third-party integration PRDs',
      content: `# Integration: [Service Name]

## Overview
What service are we integrating with and why?

## Integration Points
- Data sync
- Authentication
- Webhooks/Events
- API calls

## Authentication
- OAuth 2.0 / API Key / JWT
- Credentials management
- Token refresh strategy

## Data Flow
1. Source -> Destination
2. Transformation rules
3. Error handling

## Configuration
- Required settings
- Optional settings
- Environment variables

## Error Handling
- Retry strategy
- Fallback behavior
- Alert thresholds

## Testing
- Sandbox/staging environment
- Mock responses
- Integration test suite

## Acceptance Criteria
- [ ] Authentication works correctly
- [ ] Data syncs within [X] seconds
- [ ] Error handling covers all failure modes
- [ ] Rate limits respected`,
    },
    {
      id: 'tpl-migration',
      name: 'Data Migration Plan',
      category: 'DevOps',
      description: 'Template for database or system migration PRDs',
      content: `# Migration: [Description]

## Overview
What is being migrated and why?

## Current State
Description of the current system/data.

## Target State
Description of the desired end state.

## Migration Strategy
- Big bang / Rolling / Blue-green
- Estimated duration
- Rollback plan

## Data Mapping
| Source | Target | Transformation |
|--------|--------|---------------|
| field_a | field_b | Direct copy |

## Validation
- Data integrity checks
- Row count verification
- Functional testing

## Risks
- Risk 1: Mitigation
- Risk 2: Mitigation

## Acceptance Criteria
- [ ] All data migrated successfully
- [ ] Zero data loss verified
- [ ] Application functions correctly with migrated data
- [ ] Rollback tested and documented`,
    },
  ];

  // --- CSS ---
  const style = document.createElement('style');
  style.textContent = `
    #prd-templates-card {
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 12px;
      overflow: hidden;
    }
    #prd-templates-card .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      background: var(--color-bg-tertiary, #151928);
    }
    #prd-templates-card .card-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    #prd-templates-card .card-body {
      padding: 20px;
    }

    /* Template grid */
    .pt-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .pt-template-card {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      padding: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pt-template-card:hover {
      border-color: var(--color-accent, #6366f1);
      transform: translateY(-1px);
    }
    .pt-template-card.selected {
      border-color: var(--color-accent, #6366f1);
      background: rgba(99, 102, 241, 0.05);
    }
    .pt-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .pt-card-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    .pt-card-category {
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      white-space: nowrap;
    }
    .pt-card-desc {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #94a3b8);
      line-height: 1.4;
    }
    .pt-card-custom-badge {
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }
    .pt-card-shared-badge {
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }
    .pt-card-actions {
      display: flex;
      gap: 4px;
      margin-top: 8px;
    }
    .pt-card-btn {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      font-size: 0.7rem;
      cursor: pointer;
      font-family: inherit;
      background: var(--color-bg-secondary, #1a1f2e);
      color: var(--color-text-secondary, #94a3b8);
      transition: all 0.2s;
    }
    .pt-card-btn:hover {
      color: var(--color-text-primary, #f1f5f9);
    }

    /* Section headers */
    .pt-section-header {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-text-secondary, #94a3b8);
      margin: 16px 0 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pt-section-count {
      font-size: 0.7rem;
      padding: 1px 6px;
      border-radius: 10px;
      background: var(--color-bg-primary, #0a0e1a);
      color: var(--color-text-secondary, #94a3b8);
    }

    /* Preview panel */
    .pt-preview {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
      display: none;
    }
    .pt-preview.visible {
      display: block;
    }
    .pt-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .pt-preview-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    .pt-preview-actions {
      display: flex;
      gap: 6px;
    }
    .pt-preview-content {
      font-size: 0.8rem;
      color: var(--color-text-secondary, #94a3b8);
      line-height: 1.6;
      max-height: 250px;
      overflow-y: auto;
      white-space: pre-wrap;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Create template modal */
    .pt-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .pt-modal-overlay.visible {
      display: flex;
    }
    .pt-modal {
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 24px;
    }
    .pt-modal-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
      margin-bottom: 16px;
    }
    .pt-field {
      margin-bottom: 14px;
    }
    .pt-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      margin-bottom: 6px;
    }
    .pt-input {
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
    .pt-input:focus { outline: none; border-color: var(--color-accent, #6366f1); }
    .pt-textarea {
      width: 100%;
      min-height: 200px;
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
    .pt-textarea:focus { outline: none; border-color: var(--color-accent, #6366f1); }
    .pt-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .pt-btn-primary {
      background: var(--color-accent, #6366f1);
      color: #fff;
    }
    .pt-btn-primary:hover { opacity: 0.9; }
    .pt-btn-secondary {
      background: var(--color-bg-primary, #0a0e1a);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
    }
    .pt-btn-secondary:hover { color: var(--color-text-primary, #f1f5f9); }
    .pt-btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .pt-modal-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    /* Share / Export area */
    .pt-share-area {
      margin-top: 12px;
      padding: 12px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      display: none;
    }
    .pt-share-area.visible { display: block; }
    .pt-share-code {
      width: 100%;
      min-height: 60px;
      padding: 8px;
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 6px;
      color: var(--color-text-primary, #f1f5f9);
      font-size: 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      resize: vertical;
      box-sizing: border-box;
    }

    /* Status toast */
    .pt-status {
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      margin-top: 10px;
      display: none;
    }
    .pt-status.visible { display: block; }
    .pt-status.success {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }
    .pt-status.error {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
  `;
  document.head.appendChild(style);

  // --- Helpers ---
  function generateId() {
    return 'tpl-custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function showStatus(type, message) {
    const el = document.getElementById('pt-status');
    if (!el) return;
    el.className = 'pt-status visible ' + type;
    el.textContent = message;
    setTimeout(() => el.classList.remove('visible'), 4000);
  }

  // --- Template Operations ---
  function getAllTemplates() {
    return [
      ...BUILTIN_TEMPLATES.map(t => ({ ...t, type: 'builtin' })),
      ...state.customTemplates.map(t => ({ ...t, type: 'custom' })),
      ...state.sharedTemplates.map(t => ({ ...t, type: 'shared' })),
    ];
  }

  function getTemplate(id) {
    return getAllTemplates().find(t => t.id === id) || null;
  }

  function createCustomTemplate(name, category, description, content) {
    if (!name || !content) return null;
    const template = {
      id: generateId(),
      name,
      category: category || 'Custom',
      description: description || '',
      content,
      createdAt: new Date().toISOString(),
    };
    state.customTemplates.push(template);
    saveState();
    renderTemplates();
    return template;
  }

  function deleteCustomTemplate(id) {
    state.customTemplates = state.customTemplates.filter(t => t.id !== id);
    state.sharedTemplates = state.sharedTemplates.filter(t => t.id !== id);
    saveState();
    renderTemplates();
  }

  function exportTemplate(id) {
    const template = getTemplate(id);
    if (!template) return null;
    const exportData = {
      prdTemplate: true,
      version: 1,
      template: {
        name: template.name,
        category: template.category,
        description: template.description,
        content: template.content,
      },
    };
    return JSON.stringify(exportData, null, 2);
  }

  function importTemplate(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.prdTemplate || !data.template) {
        showStatus('error', 'Invalid template format');
        return null;
      }
      const tpl = data.template;
      const imported = {
        id: generateId(),
        name: tpl.name,
        category: tpl.category || 'Imported',
        description: tpl.description || '',
        content: tpl.content,
        importedAt: new Date().toISOString(),
      };
      state.sharedTemplates.push(imported);
      saveState();
      renderTemplates();
      showStatus('success', `Template "${imported.name}" imported successfully`);
      return imported;
    } catch(e) {
      showStatus('error', 'Failed to parse template JSON');
      return null;
    }
  }

  function shareTemplate(id) {
    const json = exportTemplate(id);
    if (!json) return;

    const shareArea = document.getElementById('pt-share-area');
    const shareCode = document.getElementById('pt-share-code');
    shareArea.classList.add('visible');
    shareCode.value = json;
    shareCode.select();

    // Try to copy to clipboard
    try {
      navigator.clipboard.writeText(json).then(() => {
        showStatus('success', 'Template JSON copied to clipboard');
      }).catch(() => {
        showStatus('success', 'Template JSON ready - select and copy');
      });
    } catch(e) {
      showStatus('success', 'Template JSON ready - select and copy');
    }
  }

  function previewTemplate(id) {
    const template = getTemplate(id);
    if (!template) return;

    const preview = document.getElementById('pt-preview');
    const previewTitle = document.getElementById('pt-preview-title');
    const previewContent = document.getElementById('pt-preview-content');

    preview.classList.add('visible');
    previewTitle.textContent = template.name;
    previewContent.textContent = template.content;

    // Highlight selected card
    document.querySelectorAll('.pt-template-card').forEach(c => c.classList.remove('selected'));
    const card = document.querySelector(`[data-template-id="${id}"]`);
    if (card) card.classList.add('selected');
  }

  function useTemplate(id) {
    const template = getTemplate(id);
    if (!template) return;

    // Try to put content into PRD input if available
    const prdTextarea = document.getElementById('prd-requirement-text');
    const importTextarea = document.getElementById('pi-markdown-content');
    const analyzerTextarea = document.getElementById('pa-content-input');

    if (analyzerTextarea) {
      analyzerTextarea.value = template.content;
      showStatus('success', `Template "${template.name}" loaded into PRD Analyzer`);
    } else if (importTextarea) {
      importTextarea.value = template.content;
      showStatus('success', `Template "${template.name}" loaded into PRD Import`);
    } else if (prdTextarea) {
      prdTextarea.value = template.content;
      showStatus('success', `Template "${template.name}" loaded into PRD Input`);
    } else {
      showStatus('success', `Template "${template.name}" selected`);
    }

    return template.content;
  }

  // --- Modal ---
  function openCreateModal() {
    const modal = document.getElementById('pt-create-modal');
    modal.classList.add('visible');
    document.getElementById('pt-create-name').value = '';
    document.getElementById('pt-create-category').value = 'Custom';
    document.getElementById('pt-create-desc').value = '';
    document.getElementById('pt-create-content').value = '';
  }

  function closeCreateModal() {
    document.getElementById('pt-create-modal').classList.remove('visible');
  }

  function saveNewTemplate() {
    const name = document.getElementById('pt-create-name').value.trim();
    const category = document.getElementById('pt-create-category').value.trim();
    const desc = document.getElementById('pt-create-desc').value.trim();
    const content = document.getElementById('pt-create-content').value.trim();

    if (!name) {
      showStatus('error', 'Template name is required');
      return;
    }
    if (!content) {
      showStatus('error', 'Template content is required');
      return;
    }

    const created = createCustomTemplate(name, category, desc, content);
    if (created) {
      showStatus('success', `Template "${name}" created successfully`);
      closeCreateModal();
    }
  }

  function openImportModal() {
    const modal = document.getElementById('pt-import-modal');
    modal.classList.add('visible');
    document.getElementById('pt-import-json').value = '';
  }

  function closeImportModal() {
    document.getElementById('pt-import-modal').classList.remove('visible');
  }

  function importFromModal() {
    const json = document.getElementById('pt-import-json').value.trim();
    if (!json) {
      showStatus('error', 'Please paste template JSON');
      return;
    }
    const result = importTemplate(json);
    if (result) closeImportModal();
  }

  // --- Rendering ---
  function renderTemplates() {
    const builtinGrid = document.getElementById('pt-builtin-grid');
    const customGrid = document.getElementById('pt-custom-grid');
    const sharedGrid = document.getElementById('pt-shared-grid');
    const customCount = document.getElementById('pt-custom-count');
    const sharedCount = document.getElementById('pt-shared-count');

    if (!builtinGrid) return;

    // Builtin
    builtinGrid.innerHTML = BUILTIN_TEMPLATES.map(t => renderTemplateCard(t, 'builtin')).join('');

    // Custom
    customCount.textContent = state.customTemplates.length;
    if (state.customTemplates.length === 0) {
      customGrid.innerHTML = '<div style="font-size:0.8rem;color:var(--color-text-secondary);padding:8px;">No custom templates yet. Click "Create Template" to add one.</div>';
    } else {
      customGrid.innerHTML = state.customTemplates.map(t => renderTemplateCard(t, 'custom')).join('');
    }

    // Shared
    sharedCount.textContent = state.sharedTemplates.length;
    if (state.sharedTemplates.length === 0) {
      sharedGrid.innerHTML = '<div style="font-size:0.8rem;color:var(--color-text-secondary);padding:8px;">No shared templates. Import templates using "Import Template".</div>';
    } else {
      sharedGrid.innerHTML = state.sharedTemplates.map(t => renderTemplateCard(t, 'shared')).join('');
    }
  }

  function renderTemplateCard(template, type) {
    const badgeHtml = type === 'custom'
      ? '<span class="pt-card-custom-badge">Custom</span>'
      : type === 'shared'
        ? '<span class="pt-card-shared-badge">Shared</span>'
        : '';

    const deleteBtn = (type === 'custom' || type === 'shared')
      ? `<button class="pt-card-btn" onclick="event.stopPropagation();window.prdTemplates.deleteTemplate('${template.id}')">Delete</button>`
      : '';

    return `
      <div class="pt-template-card" data-template-id="${template.id}" onclick="window.prdTemplates.preview('${template.id}')">
        <div class="pt-card-header">
          <span class="pt-card-name">${template.name}</span>
          <span class="pt-card-category">${template.category}</span>
        </div>
        <div class="pt-card-desc">${template.description || ''}</div>
        ${badgeHtml}
        <div class="pt-card-actions">
          <button class="pt-card-btn" onclick="event.stopPropagation();window.prdTemplates.use('${template.id}')">Use</button>
          <button class="pt-card-btn" onclick="event.stopPropagation();window.prdTemplates.share('${template.id}')">Share</button>
          ${deleteBtn}
        </div>
      </div>
    `;
  }

  // --- Main Render ---
  function render() {
    const container = document.getElementById('prd-templates-widget');
    if (!container) return;

    container.innerHTML = `
      <div id="prd-templates-card">
        <div class="card-header">
          <h3>📚 PRD Templates</h3>
          <div style="display:flex;gap:8px;">
            <button class="pt-btn pt-btn-primary" onclick="window.prdTemplates.openCreate()">Create Template</button>
            <button class="pt-btn pt-btn-secondary" onclick="window.prdTemplates.openImport()">Import Template</button>
          </div>
        </div>
        <div class="card-body">
          <!-- Built-in Templates -->
          <div class="pt-section-header">
            Pre-built Templates
            <span class="pt-section-count">${BUILTIN_TEMPLATES.length}</span>
          </div>
          <div class="pt-grid" id="pt-builtin-grid"></div>

          <!-- Custom Templates -->
          <div class="pt-section-header">
            Custom Templates
            <span class="pt-section-count" id="pt-custom-count">0</span>
          </div>
          <div class="pt-grid" id="pt-custom-grid"></div>

          <!-- Shared Templates -->
          <div class="pt-section-header">
            Shared Templates
            <span class="pt-section-count" id="pt-shared-count">0</span>
          </div>
          <div class="pt-grid" id="pt-shared-grid"></div>

          <!-- Status -->
          <div class="pt-status" id="pt-status"></div>

          <!-- Share area -->
          <div class="pt-share-area" id="pt-share-area">
            <label class="pt-label">Share Template JSON (copy and send to others)</label>
            <textarea class="pt-share-code" id="pt-share-code" readonly></textarea>
          </div>

          <!-- Preview -->
          <div class="pt-preview" id="pt-preview">
            <div class="pt-preview-header">
              <span class="pt-preview-title" id="pt-preview-title">-</span>
              <div class="pt-preview-actions">
                <button class="pt-btn pt-btn-secondary" onclick="document.getElementById('pt-preview').classList.remove('visible')">Close</button>
              </div>
            </div>
            <div class="pt-preview-content" id="pt-preview-content"></div>
          </div>
        </div>
      </div>

      <!-- Create Template Modal -->
      <div class="pt-modal-overlay" id="pt-create-modal" onclick="if(event.target===this)window.prdTemplates.closeCreate()">
        <div class="pt-modal">
          <div class="pt-modal-title">Create Custom Template</div>
          <div class="pt-field">
            <label class="pt-label">Template Name</label>
            <input type="text" class="pt-input" id="pt-create-name" placeholder="e.g., Mobile Feature Spec">
          </div>
          <div class="pt-field">
            <label class="pt-label">Category</label>
            <input type="text" class="pt-input" id="pt-create-category" placeholder="e.g., Engineering, Design, Product" value="Custom">
          </div>
          <div class="pt-field">
            <label class="pt-label">Description</label>
            <input type="text" class="pt-input" id="pt-create-desc" placeholder="Brief description of the template">
          </div>
          <div class="pt-field">
            <label class="pt-label">Template Content (Markdown)</label>
            <textarea class="pt-textarea" id="pt-create-content" placeholder="# [Title]&#10;&#10;## Overview&#10;..."></textarea>
          </div>
          <div class="pt-modal-actions">
            <button class="pt-btn pt-btn-primary" onclick="window.prdTemplates.saveNew()">Save Template</button>
            <button class="pt-btn pt-btn-secondary" onclick="window.prdTemplates.closeCreate()">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Import Template Modal -->
      <div class="pt-modal-overlay" id="pt-import-modal" onclick="if(event.target===this)window.prdTemplates.closeImport()">
        <div class="pt-modal">
          <div class="pt-modal-title">Import Shared Template</div>
          <div class="pt-field">
            <label class="pt-label">Paste Template JSON</label>
            <textarea class="pt-share-code" id="pt-import-json" placeholder='{"prdTemplate":true,"version":1,"template":{...}}'></textarea>
          </div>
          <div class="pt-modal-actions">
            <button class="pt-btn pt-btn-primary" onclick="window.prdTemplates.importFromModal()">Import</button>
            <button class="pt-btn pt-btn-secondary" onclick="window.prdTemplates.closeImport()">Cancel</button>
          </div>
        </div>
      </div>
    `;

    renderTemplates();
  }

  // --- Public API ---
  window.prdTemplates = {
    getAllTemplates,
    getTemplate,
    createCustomTemplate,
    deleteTemplate: deleteCustomTemplate,
    exportTemplate,
    importTemplate,
    share: shareTemplate,
    preview: previewTemplate,
    use: useTemplate,
    openCreate: openCreateModal,
    closeCreate: closeCreateModal,
    saveNew: saveNewTemplate,
    openImport: openImportModal,
    closeImport: closeImportModal,
    importFromModal,
    getBuiltinTemplates: () => [...BUILTIN_TEMPLATES],
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
