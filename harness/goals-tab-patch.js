// This file contains the JavaScript to add to live-ops-server.js for the Goals tab
// Insert after the fetchHealingData() function

// ── Goals Tab (IL-011) ────────────────────────────────────────────────────────
async function fetchGoalsData() {
  try {
    const [statusRes, logRes, pendingRes] = await Promise.all([
      fetch('/api/improvement/status'),
      fetch('/api/improvement/log'),
      fetch('/api/improvement/pending'),
    ]);

    const status = await statusRes.json();
    const log = await logRes.json();
    const pending = await pendingRes.json();

    renderGoals(status, log, pending);
  } catch (e) {
    console.error('Failed to fetch goals data:', e);
  }
}

function renderGoals(status, log, pending) {
  const lastCycle = status.lastCycle || {};
  const kpis = lastCycle.metrics_snapshot || {};
  const entries = log.entries || [];
  const pendingItems = pending.pending || [];

  // Revenue gap
  const revenueGap = kpis.revenue_gap || 0;
  document.getElementById('revenue-gap').textContent = '$' + Math.round(revenueGap);
  document.getElementById('revenue-gap').style.color = revenueGap > 3000 ? 'var(--red)' : revenueGap > 1000 ? 'var(--yellow)' : 'var(--green)';

  // Weekly progress
  const dmsSent = kpis.dms_sent || 0;
  const dmTarget = Math.round((kpis.targets?.dm_sends_weekly || 50) / 7);
  const dmPct = dmTarget > 0 ? Math.round((dmsSent / dmTarget) * 100) : 0;
  document.getElementById('dm-progress').textContent = dmPct + '%';
  document.getElementById('dm-progress').style.color = dmPct >= 80 ? 'var(--green)' : dmPct >= 40 ? 'var(--yellow)' : 'var(--red)';

  const upworkSub = kpis.upwork_submitted || 0;
  const upworkTarget = Math.round((kpis.targets?.upwork_proposals_weekly || 5) / 7);
  const upworkPct = upworkTarget > 0 ? Math.round((upworkSub / upworkTarget) * 100) : 0;
  document.getElementById('upwork-progress').textContent = upworkPct + '%';

  // CRM contacts (fake data for now - would need CRMLite API)
  document.getElementById('crm-contacts').textContent = kpis.state?.linkedin_total_prospects || 0;

  // KPIs table
  const kpiRows = [
    { metric: 'DMs Sent Today', current: dmsSent, target: dmTarget, status: dmsSent >= dmTarget ? 'green' : 'red' },
    { metric: 'Upwork Proposals', current: upworkSub, target: upworkTarget, status: upworkSub >= upworkTarget ? 'green' : 'red' },
    { metric: 'LinkedIn Connections', current: kpis.connections_today || 0, target: 5, status: (kpis.connections_today || 0) >= 5 ? 'green' : 'red' },
    { metric: 'Reply Rate', current: (kpis.reply_rate || 0).toFixed(1) + '%', target: '5%', status: (kpis.reply_rate || 0) >= 5 ? 'green' : 'red' },
  ];
  document.querySelector('#kpi-table tbody').innerHTML = kpiRows.map(r => `
    <tr>
      <td>${r.metric}</td>
      <td>${r.current}</td>
      <td>${r.target}</td>
      <td><span class="tag ${r.status}">${r.status === 'green' ? '✓' : '✗'}</span></td>
    </tr>
  `).join('');

  // Revenue chart (simple bar chart)
  const sources = [
    { name: 'Upwork', target: 2500, color: 'var(--blue)' },
    { name: 'DM Clients', target: 1500, color: 'var(--cyan)' },
    { name: 'Content', target: 500, color: 'var(--green)' },
    { name: 'Products', target: 500, color: 'var(--purple)' },
  ];
  document.getElementById('revenue-chart').innerHTML = sources.map(s => {
    const pct = (s.target / 5000) * 100;
    return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
        <div style="width:100%;height:${pct * 2}px;background:${s.color};border-radius:4px 4px 0 0;"></div>
        <div style="color:var(--dim);font-size:10px;margin-top:6px;">${s.name}</div>
        <div style="color:var(--text);font-size:11px;font-weight:700;">$${s.target}</div>
      </div>
    `;
  }).join('');

  // Recent adjustments
  const autoEntries = entries.filter(e => e.auto_applied === true).slice(-10).reverse();
  if (autoEntries.length) {
    document.getElementById('adjustments-table').innerHTML = autoEntries.map(e => `
      <tr>
        <td style="color:var(--dim);font-size:11px;white-space:nowrap;">${new Date(e.ts).toLocaleTimeString()}</td>
        <td><code style="font-size:11px;">${e.action_taken || '—'}</code></td>
        <td><span class="tag ${e.confidence >= 0.9 ? 'green' : 'yellow'}">${Math.round(e.confidence * 100)}%</span></td>
        <td style="color:var(--dim);font-size:11px;">${typeof e.outcome === 'object' ? JSON.stringify(e.outcome).slice(0, 50) : e.outcome}</td>
      </tr>
    `).join('');
  } else {
    document.getElementById('adjustments-table').innerHTML = '<tr><td colspan="4" style="color:var(--dim)">No auto-adjustments yet</td></tr>';
  }

  // Pending approvals
  if (pendingItems.length) {
    document.getElementById('pending-approvals').innerHTML = pendingItems.map(p => `
      <div class="acd-item" style="display:flex;align-items:center;gap:10px;">
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:700;color:var(--text);">${p.action}</div>
          <div style="font-size:11px;color:var(--dim);margin-top:2px;">${p.reasoning}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px;">Confidence: ${Math.round(p.confidence * 100)}%</div>
        </div>
        <button class="btn" style="background:var(--green);border-color:var(--green);color:white;" onclick="approveImprovement('${p.id}')">✓ Approve</button>
        <button class="btn" onclick="skipImprovement('${p.id}')">Skip</button>
      </div>
    `).join('');
  } else {
    document.getElementById('pending-approvals').innerHTML = '<span style="color:var(--dim);font-size:12px;">No pending approvals</span>';
  }

  // Loop status
  document.getElementById('loop-running').textContent = status.running ? 'RUNNING' : 'STOPPED';
  document.getElementById('loop-running').style.color = status.running ? 'var(--green)' : 'var(--red)';
}

async function runImprovementCycle() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Running...';
  try {
    const res = await fetch('/api/improvement/run', { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      alert('Cycle complete! Check the adjustments table for results.');
      fetchGoalsData();
    } else {
      alert('Cycle failed: ' + (result.error || 'unknown error'));
    }
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Run Cycle Now';
  }
}

async function approveImprovement(id) {
  try {
    const res = await fetch('/api/improvement/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const result = await res.json();
    if (result.success) {
      alert('Approved and executed!');
      fetchGoalsData();
    } else {
      alert('Failed: ' + (result.error || 'unknown error'));
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

function skipImprovement(id) {
  // Just remove from pending queue without executing
  alert('Skip not implemented yet - approval required for now');
}
