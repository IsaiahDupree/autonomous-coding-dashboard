/**
 * Supabase Project Connection Widget (feat-043)
 *
 * Connect to target Supabase projects - store credentials per target,
 * test connections, display table counts, and run migrations.
 */
class SupabaseConnection {
  constructor(containerId = 'supabase-connection-widget') {
    this.container = document.getElementById(containerId);
    this.API_BASE = 'http://localhost:3434';
    this.data = null;
    this.credentials = {};
    this.selectedTarget = null;

    if (!this.container) {
      console.warn(`Container #${containerId} not found`);
      return;
    }
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadData();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Supabase Project Connections</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <span id="sbc-status-badge" class="badge" style="display:none;"></span>
            <button class="btn btn-secondary" id="sbc-refresh-btn">Refresh</button>
          </div>
        </div>
        <div class="card-body">
          <!-- Summary Cards -->
          <div id="sbc-summary" class="sbc-summary-grid">
            <div class="sbc-summary-card">
              <div class="sbc-summary-value" id="sbc-total-targets">-</div>
              <div class="sbc-summary-label">Total Targets</div>
            </div>
            <div class="sbc-summary-card">
              <div class="sbc-summary-value" id="sbc-connected-targets">-</div>
              <div class="sbc-summary-label">Connected</div>
            </div>
            <div class="sbc-summary-card">
              <div class="sbc-summary-value" id="sbc-total-tables">-</div>
              <div class="sbc-summary-label">Total Tables</div>
            </div>
            <div class="sbc-summary-card">
              <div class="sbc-summary-value" id="sbc-total-rows">-</div>
              <div class="sbc-summary-label">Total Rows</div>
            </div>
          </div>

          <!-- Add/Edit Credentials Form -->
          <div id="sbc-credentials-form" class="sbc-form-section" style="display:none;">
            <h4 id="sbc-form-title">Add Supabase Credentials</h4>
            <div class="sbc-form-grid">
              <div class="sbc-form-group">
                <label for="sbc-target-select">Target Project</label>
                <select id="sbc-target-select" class="sbc-input">
                  <option value="">-- Select target --</option>
                </select>
              </div>
              <div class="sbc-form-group">
                <label for="sbc-supabase-url">Supabase URL</label>
                <input type="url" id="sbc-supabase-url" class="sbc-input" placeholder="https://your-project.supabase.co" />
              </div>
              <div class="sbc-form-group">
                <label for="sbc-supabase-key">Supabase API Key (anon/service_role)</label>
                <input type="password" id="sbc-supabase-key" class="sbc-input" placeholder="eyJhbGciOiJIUzI1NiIs..." />
              </div>
              <div class="sbc-form-group">
                <label for="sbc-db-connection">DB Connection String (optional)</label>
                <input type="password" id="sbc-db-connection" class="sbc-input" placeholder="postgresql://postgres:..." />
              </div>
            </div>
            <div class="sbc-form-actions">
              <button class="btn btn-primary" id="sbc-save-btn">Save & Test Connection</button>
              <button class="btn btn-secondary" id="sbc-cancel-btn">Cancel</button>
              <span id="sbc-form-status" class="sbc-form-status"></span>
            </div>
          </div>

          <!-- Connection List / Table -->
          <div class="sbc-connections-section">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <h4 style="margin:0;">Target Connections</h4>
              <button class="btn btn-primary" id="sbc-add-btn">+ Add Connection</button>
            </div>
            <div class="sbc-table-wrapper">
              <table class="sbc-table" id="sbc-connections-table">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Supabase URL</th>
                    <th>Tables</th>
                    <th>Rows</th>
                    <th>Migrations</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="sbc-table-body">
                  <tr><td colspan="7" style="text-align:center;color:#888;">Loading...</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Table Details Panel (shown when clicking a connected target) -->
          <div id="sbc-table-details" class="sbc-details-panel" style="display:none;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <h4 id="sbc-details-title" style="margin:0;">Database Tables</h4>
              <button class="btn btn-secondary" id="sbc-close-details">Close</button>
            </div>
            <table class="sbc-table" id="sbc-details-table">
              <thead>
                <tr>
                  <th>Table Name</th>
                  <th>Row Count</th>
                  <th>Access Methods</th>
                </tr>
              </thead>
              <tbody id="sbc-details-body">
              </tbody>
            </table>
          </div>

          <!-- Migration Panel -->
          <div id="sbc-migration-panel" class="sbc-details-panel" style="display:none;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <h4 id="sbc-migration-title" style="margin:0;">Run Migrations</h4>
              <button class="btn btn-secondary" id="sbc-close-migrations">Close</button>
            </div>
            <div id="sbc-migration-content">
            </div>
          </div>

        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('sbc-refresh-btn')?.addEventListener('click', () => this.loadData());
    document.getElementById('sbc-add-btn')?.addEventListener('click', () => this.showForm());
    document.getElementById('sbc-cancel-btn')?.addEventListener('click', () => this.hideForm());
    document.getElementById('sbc-save-btn')?.addEventListener('click', () => this.saveCredentials());
    document.getElementById('sbc-close-details')?.addEventListener('click', () => {
      document.getElementById('sbc-table-details').style.display = 'none';
    });
    document.getElementById('sbc-close-migrations')?.addEventListener('click', () => {
      document.getElementById('sbc-migration-panel').style.display = 'none';
    });
  }

  showForm(targetId = null) {
    const form = document.getElementById('sbc-credentials-form');
    form.style.display = 'block';

    const title = document.getElementById('sbc-form-title');
    const select = document.getElementById('sbc-target-select');
    const urlInput = document.getElementById('sbc-supabase-url');
    const keyInput = document.getElementById('sbc-supabase-key');
    const dbInput = document.getElementById('sbc-db-connection');
    const statusEl = document.getElementById('sbc-form-status');

    statusEl.textContent = '';
    urlInput.value = '';
    keyInput.value = '';
    dbInput.value = '';

    // Populate target select from data
    if (this.data && this.data.targets) {
      select.innerHTML = '<option value="">-- Select target --</option>';
      for (const t of this.data.targets) {
        const opt = document.createElement('option');
        opt.value = t.targetId;
        opt.textContent = t.targetName;
        select.appendChild(opt);
      }
    }

    if (targetId) {
      title.textContent = 'Edit Supabase Credentials';
      select.value = targetId;
      select.disabled = true;
      // Pre-fill URL if we have it
      const target = this.data?.targets?.find(t => t.targetId === targetId);
      if (target && target.supabaseUrl) {
        urlInput.value = target.supabaseUrl;
      }
    } else {
      title.textContent = 'Add Supabase Credentials';
      select.disabled = false;
    }
  }

  hideForm() {
    document.getElementById('sbc-credentials-form').style.display = 'none';
    document.getElementById('sbc-target-select').disabled = false;
  }

  async saveCredentials() {
    const targetId = document.getElementById('sbc-target-select').value;
    const supabaseUrl = document.getElementById('sbc-supabase-url').value.trim();
    const supabaseKey = document.getElementById('sbc-supabase-key').value.trim();
    const dbConnectionString = document.getElementById('sbc-db-connection').value.trim();
    const statusEl = document.getElementById('sbc-form-status');

    if (!targetId) {
      statusEl.textContent = 'Please select a target project';
      statusEl.className = 'sbc-form-status sbc-status-error';
      return;
    }
    if (!supabaseUrl || !supabaseKey) {
      statusEl.textContent = 'Supabase URL and API Key are required';
      statusEl.className = 'sbc-form-status sbc-status-error';
      return;
    }

    statusEl.textContent = 'Testing connection...';
    statusEl.className = 'sbc-form-status sbc-status-pending';

    try {
      const resp = await fetch(`${this.API_BASE}/api/supabase/credentials/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl, supabaseKey, dbConnectionString: dbConnectionString || undefined }),
      });
      const result = await resp.json();

      if (result.success) {
        statusEl.textContent = 'Connected and saved successfully!';
        statusEl.className = 'sbc-form-status sbc-status-success';
        setTimeout(() => {
          this.hideForm();
          this.loadData();
        }, 1500);
      } else {
        statusEl.textContent = result.error || 'Connection failed';
        statusEl.className = 'sbc-form-status sbc-status-error';
      }
    } catch (error) {
      statusEl.textContent = 'Network error: ' + error.message;
      statusEl.className = 'sbc-form-status sbc-status-error';
    }
  }

  async loadData() {
    try {
      const resp = await fetch(`${this.API_BASE}/api/supabase/overview`);
      const result = await resp.json();
      if (result.success && result.data) {
        this.data = result.data;
        this.updateUI();
      }
    } catch (error) {
      console.error('Supabase overview error:', error);
    }
  }

  updateUI() {
    if (!this.data) return;
    const { summary, targets } = this.data;

    // Update summary cards
    document.getElementById('sbc-total-targets').textContent = summary.totalTargets;
    document.getElementById('sbc-connected-targets').textContent = summary.connectedTargets;
    document.getElementById('sbc-total-tables').textContent = summary.totalTables;
    document.getElementById('sbc-total-rows').textContent = summary.totalRows.toLocaleString();

    // Status badge
    const badge = document.getElementById('sbc-status-badge');
    if (summary.connectedTargets > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = `${summary.connectedTargets} connected`;
      badge.className = 'badge sbc-badge-connected';
    } else {
      badge.style.display = 'inline-block';
      badge.textContent = 'No connections';
      badge.className = 'badge sbc-badge-none';
    }

    // Update table
    const tbody = document.getElementById('sbc-table-body');
    if (targets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">No targets found</td></tr>';
      return;
    }

    tbody.innerHTML = targets.map(t => {
      const connected = t.connected;
      const statusClass = connected ? (t.connectionError ? 'sbc-status-warn' : 'sbc-status-ok') : 'sbc-status-off';
      const statusText = connected ? (t.connectionError ? 'Error' : 'Connected') : 'Not connected';
      const urlDisplay = t.supabaseUrl ? t.supabaseUrl.replace('https://', '').replace('.supabase.co', '') : '-';
      const migCount = t.migrationFiles ? t.migrationFiles.length : 0;

      return `
        <tr data-target-id="${t.targetId}">
          <td><strong>${t.targetName}</strong></td>
          <td><span class="sbc-status-dot ${statusClass}"></span> ${statusText}</td>
          <td class="sbc-url-cell">${connected ? urlDisplay : '-'}</td>
          <td>${connected ? t.tableCount : '-'}</td>
          <td>${connected ? (t.totalRows || 0).toLocaleString() : '-'}</td>
          <td>${migCount > 0 ? `${migCount} files` : '-'}</td>
          <td class="sbc-actions-cell">
            ${connected ? `
              <button class="btn btn-sm btn-secondary sbc-view-tables" data-target="${t.targetId}">Tables</button>
              <button class="btn btn-sm btn-secondary sbc-test-conn" data-target="${t.targetId}">Test</button>
              ${migCount > 0 ? `<button class="btn btn-sm btn-secondary sbc-run-migrations" data-target="${t.targetId}">Migrate</button>` : ''}
              <button class="btn btn-sm btn-secondary sbc-edit-creds" data-target="${t.targetId}">Edit</button>
              <button class="btn btn-sm sbc-btn-danger sbc-delete-creds" data-target="${t.targetId}">Remove</button>
            ` : `
              <button class="btn btn-sm btn-primary sbc-connect-btn" data-target="${t.targetId}">Connect</button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    // Bind row-level events
    tbody.querySelectorAll('.sbc-connect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.showForm(e.target.dataset.target));
    });
    tbody.querySelectorAll('.sbc-edit-creds').forEach(btn => {
      btn.addEventListener('click', (e) => this.showForm(e.target.dataset.target));
    });
    tbody.querySelectorAll('.sbc-delete-creds').forEach(btn => {
      btn.addEventListener('click', (e) => this.deleteCredentials(e.target.dataset.target));
    });
    tbody.querySelectorAll('.sbc-view-tables').forEach(btn => {
      btn.addEventListener('click', (e) => this.viewTables(e.target.dataset.target));
    });
    tbody.querySelectorAll('.sbc-test-conn').forEach(btn => {
      btn.addEventListener('click', (e) => this.testConnection(e.target.dataset.target));
    });
    tbody.querySelectorAll('.sbc-run-migrations').forEach(btn => {
      btn.addEventListener('click', (e) => this.runMigrations(e.target.dataset.target));
    });
  }

  async deleteCredentials(targetId) {
    if (!confirm(`Remove Supabase credentials for "${targetId}"?`)) return;

    try {
      const resp = await fetch(`${this.API_BASE}/api/supabase/credentials/${targetId}`, {
        method: 'DELETE',
      });
      const result = await resp.json();
      if (result.success) {
        this.loadData();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  async testConnection(targetId) {
    const row = document.querySelector(`tr[data-target-id="${targetId}"]`);
    const btn = row?.querySelector('.sbc-test-conn');
    if (btn) {
      btn.textContent = 'Testing...';
      btn.disabled = true;
    }

    try {
      const resp = await fetch(`${this.API_BASE}/api/supabase/test-connection/${targetId}`, {
        method: 'POST',
      });
      const result = await resp.json();

      if (btn) {
        btn.textContent = result.success ? 'OK ✓' : 'Failed ✗';
        btn.className = result.success ? 'btn btn-sm sbc-btn-success sbc-test-conn' : 'btn btn-sm sbc-btn-danger sbc-test-conn';
        setTimeout(() => {
          btn.textContent = 'Test';
          btn.className = 'btn btn-sm btn-secondary sbc-test-conn';
          btn.disabled = false;
        }, 3000);
      }
    } catch (error) {
      if (btn) {
        btn.textContent = 'Error';
        btn.disabled = false;
      }
    }
  }

  async viewTables(targetId) {
    const panel = document.getElementById('sbc-table-details');
    const title = document.getElementById('sbc-details-title');
    const tbody = document.getElementById('sbc-details-body');

    const target = this.data?.targets?.find(t => t.targetId === targetId);
    title.textContent = `Database Tables - ${target?.targetName || targetId}`;
    panel.style.display = 'block';
    document.getElementById('sbc-migration-panel').style.display = 'none';

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading tables...</td></tr>';

    try {
      const resp = await fetch(`${this.API_BASE}/api/supabase/tables/${targetId}`);
      const result = await resp.json();

      if (result.success && result.data.tables && result.data.tables.length > 0) {
        tbody.innerHTML = result.data.tables.map(t => `
          <tr>
            <td><code>${t.name}</code></td>
            <td>${(t.row_count || 0).toLocaleString()}</td>
            <td>${(t.methods || []).join(', ')}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;">No tables found or unable to enumerate tables</td></tr>';
      }
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="3" style="color:#ef4444;">Error loading tables: ${error.message}</td></tr>`;
    }
  }

  async runMigrations(targetId) {
    const panel = document.getElementById('sbc-migration-panel');
    const title = document.getElementById('sbc-migration-title');
    const content = document.getElementById('sbc-migration-content');

    const target = this.data?.targets?.find(t => t.targetId === targetId);
    title.textContent = `Migrations - ${target?.targetName || targetId}`;
    panel.style.display = 'block';
    document.getElementById('sbc-table-details').style.display = 'none';

    content.innerHTML = '<p style="color:#888;">Running migrations...</p>';

    try {
      const resp = await fetch(`${this.API_BASE}/api/supabase/migrations/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await resp.json();

      if (result.success && result.data) {
        const d = result.data;
        const statusClass = d.status === 'completed' ? 'sbc-mig-success' : (d.status === 'partial' ? 'sbc-mig-warn' : 'sbc-mig-info');
        content.innerHTML = `
          <div class="sbc-migration-result ${statusClass}">
            <div class="sbc-mig-header">
              <span class="sbc-mig-status">${d.status.toUpperCase()}</span>
              <span>${d.migrationsFound} migration file(s) found</span>
            </div>
            ${d.migrationsRun.length > 0 ? `
              <div class="sbc-mig-files">
                <strong>Processed:</strong>
                <ul>${d.migrationsRun.map(f => `<li><code>${f}</code></li>`).join('')}</ul>
              </div>
            ` : ''}
            ${d.errors.length > 0 ? `
              <div class="sbc-mig-errors">
                <strong>Errors:</strong>
                <ul>${d.errors.map(e => `<li style="color:#ef4444;">${e}</li>`).join('')}</ul>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        content.innerHTML = `<p style="color:#ef4444;">Error: ${result.error || 'Unknown error'}</p>`;
      }
    } catch (error) {
      content.innerHTML = `<p style="color:#ef4444;">Network error: ${error.message}</p>`;
    }
  }
}

// Auto-instantiate
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SupabaseConnection());
} else {
  new SupabaseConnection();
}
