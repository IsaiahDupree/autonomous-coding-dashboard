// feat-103: Team Activity Feed
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #team-activity-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .ta-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .ta-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .ta-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .ta-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .ta-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .ta-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .ta-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .ta-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .ta-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .ta-list { display: flex; flex-direction: column; gap: 8px; }
    .ta-activity-item, .ta-milestone-item, .ta-mention-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .ta-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .ta-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .ta-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .ta-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);
  const STORAGE_KEY = 'team-activity-config';
  let state = { activeTab: 'feed' };

  function getActivities() {
    return [
      { id: 'act-001', user: 'Alice Chen', type: 'feature', action: 'completed', target: 'feat-095', message: 'Completed Natural Language Search', timestamp: new Date(Date.now() - 600000).toISOString() },
      { id: 'act-002', user: 'Bob Smith', type: 'commit', action: 'pushed', target: 'main', message: 'Pushed 3 commits to main branch', timestamp: new Date(Date.now() - 1800000).toISOString() },
      { id: 'act-003', user: 'Carol Davis', type: 'review', action: 'approved', target: 'PR #42', message: 'Approved code review for API docs', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 'act-004', user: 'Dave Wilson', type: 'comment', action: 'commented', target: 'feat-094', message: 'Added feedback on code quality widget', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: 'act-005', user: 'Eve Brown', type: 'feature', action: 'started', target: 'feat-098', message: 'Started working on help system', timestamp: new Date(Date.now() - 14400000).toISOString() },
      { id: 'act-006', user: 'Alice Chen', type: 'deploy', action: 'deployed', target: 'v2.1.0', message: 'Deployed version 2.1.0 to staging', timestamp: new Date(Date.now() - 28800000).toISOString() },
      { id: 'act-007', user: 'Bob Smith', type: 'bug', action: 'fixed', target: 'BUG-123', message: 'Fixed memory leak in WebSocket handler', timestamp: new Date(Date.now() - 43200000).toISOString() },
      { id: 'act-008', user: 'Frank Lee', type: 'config', action: 'updated', target: 'settings', message: 'Updated rate limiting configuration', timestamp: new Date(Date.now() - 57600000).toISOString() },
    ];
  }
  function getActivity(id) { return getActivities().find(a => a.id === id) || null; }
  function getActivitiesByUser(user) { return getActivities().filter(a => a.user === user); }
  function getActivitiesByType(type) { return getActivities().filter(a => a.type === type); }

  function getMilestones() {
    return [
      { id: 'ms-001', title: '100 Features Passing', description: 'Reached 100 passing features milestone', completedAt: '2025-01-15', progress: 100, category: 'achievement' },
      { id: 'ms-002', title: 'Mobile Support Complete', description: 'All mobile features implemented', completedAt: '2025-01-12', progress: 100, category: 'release' },
      { id: 'ms-003', title: 'AI Features Sprint', description: 'Complete all AI-powered features', completedAt: null, progress: 75, category: 'sprint' },
      { id: 'ms-004', title: 'v3.0 Release', description: 'Major version release with all features', completedAt: null, progress: 83, category: 'release' },
    ];
  }
  function getMilestone(id) { return getMilestones().find(m => m.id === id) || null; }

  function getMentions() {
    return [
      { id: 'men-001', from: 'Alice Chen', to: 'Bob Smith', context: 'feat-095', message: 'Can you review the search algorithm?', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
      { id: 'men-002', from: 'Carol Davis', to: 'Alice Chen', context: 'PR #42', message: 'Great work on the API docs!', timestamp: new Date(Date.now() - 7200000).toISOString(), read: true },
      { id: 'men-003', from: 'Dave Wilson', to: 'Eve Brown', context: 'feat-098', message: 'The help system looks great', timestamp: new Date(Date.now() - 14400000).toISOString(), read: false },
      { id: 'men-004', from: 'Bob Smith', to: 'Alice Chen', context: 'BUG-123', message: 'Memory fix verified in staging', timestamp: new Date(Date.now() - 28800000).toISOString(), read: true },
    ];
  }
  function getMention(id) { return getMentions().find(m => m.id === id) || null; }
  function getUnreadMentions() { return getMentions().filter(m => !m.read); }

  function getActivityStats() {
    return { totalActivities: getActivities().length, milestoneCount: getMilestones().length, mentionCount: getMentions().length, unreadCount: getUnreadMentions().length };
  }

  function render() {
    const container = document.getElementById('team-activity-widget');
    if (!container) return;
    const stats = getActivityStats();
    container.innerHTML = `
      <div id="team-activity-card">
        <div class="ta-header"><h3>Team Activity Feed</h3></div>
        <div class="ta-stats-row">
          <div class="ta-stat-card"><div class="ta-stat-val">${stats.totalActivities}</div><div class="ta-stat-label">Activities</div></div>
          <div class="ta-stat-card"><div class="ta-stat-val">${stats.milestoneCount}</div><div class="ta-stat-label">Milestones</div></div>
          <div class="ta-stat-card"><div class="ta-stat-val">${stats.mentionCount}</div><div class="ta-stat-label">Mentions</div></div>
          <div class="ta-stat-card"><div class="ta-stat-val">${stats.unreadCount}</div><div class="ta-stat-label">Unread</div></div>
        </div>
        <div class="ta-tabs">
          <button class="ta-tab ${state.activeTab === 'feed' ? 'active' : ''}" data-tab="feed">Feed</button>
          <button class="ta-tab ${state.activeTab === 'milestones' ? 'active' : ''}" data-tab="milestones">Milestones</button>
          <button class="ta-tab ${state.activeTab === 'mentions' ? 'active' : ''}" data-tab="mentions">Mentions</button>
        </div>
        <div id="ta-content"></div>
      </div>`;
    container.querySelectorAll('.ta-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }
  function renderContent() {
    const el = document.getElementById('ta-content');
    if (!el) return;
    if (state.activeTab === 'feed') renderFeed(el);
    else if (state.activeTab === 'milestones') renderMilestones(el);
    else renderMentions(el);
  }
  const typeColors = { feature: '#22c55e', commit: '#3b82f6', review: '#8b5cf6', comment: '#f59e0b', deploy: '#ec4899', bug: '#ef4444', config: '#6366f1' };
  function renderFeed(el) {
    el.innerHTML = `<div class="ta-list" id="ta-feed-list">${getActivities().map(a => `
      <div class="ta-activity-item" data-id="${a.id}"><div class="ta-item-top"><div class="ta-item-name">${a.user}</div>
      <span class="ta-badge" style="background:${typeColors[a.type]||'#6366f1'}22;color:${typeColors[a.type]||'#6366f1'}">${a.type}</span></div>
      <div class="ta-item-detail">${a.action} ${a.target} · ${a.message}</div></div>`).join('')}</div>`;
  }
  function renderMilestones(el) {
    el.innerHTML = `<div id="ta-milestone-section"><div class="ta-list" id="ta-milestone-list">${getMilestones().map(m => `
      <div class="ta-milestone-item" data-id="${m.id}"><div class="ta-item-top"><div class="ta-item-name">${m.title}</div>
      <span class="ta-badge" style="background:${m.progress===100?'#22c55e':'#f59e0b'}22;color:${m.progress===100?'#22c55e':'#f59e0b'}">${m.progress}%</span></div>
      <div class="ta-item-detail">${m.description} · ${m.category}</div></div>`).join('')}</div></div>`;
  }
  function renderMentions(el) {
    el.innerHTML = `<div id="ta-mention-section"><div class="ta-list" id="ta-mention-list">${getMentions().map(m => `
      <div class="ta-mention-item" data-id="${m.id}"><div class="ta-item-top"><div class="ta-item-name">${m.from} → ${m.to}</div>
      <span class="ta-badge" style="background:${m.read?'#6b7280':'#3b82f6'}22;color:${m.read?'#6b7280':'#3b82f6'}">${m.read?'Read':'Unread'}</span></div>
      <div class="ta-item-detail">${m.context}: ${m.message}</div></div>`).join('')}</div></div>`;
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch(e){} }
  function loadState() { try { const s=localStorage.getItem(STORAGE_KEY); if(s){const p=JSON.parse(s); state.activeTab=p.activeTab||state.activeTab;} } catch(e){} }

  window.teamActivity = {
    getActivities, getActivity, getActivitiesByUser, getActivitiesByType,
    getMilestones, getMilestone, getMentions, getMention, getUnreadMentions, getActivityStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, activityCount: getActivities().length, milestoneCount: getMilestones().length, mentionCount: getMentions().length }; },
  };
  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
