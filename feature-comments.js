// feat-104: Comments on Features
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #feature-comments-card { background: var(--color-card-bg, #1e1e2e); border: 1px solid var(--color-border, #2e2e3e); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .fc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .fc-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text, #e0e0e0); }
    .fc-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: var(--color-bg, #12121a); border-radius: 8px; padding: 3px; }
    .fc-tab { flex: 1; padding: 6px 12px; border: none; background: transparent; color: var(--color-text-secondary, #a0a0b0); cursor: pointer; border-radius: 6px; font-size: 13px; transition: all 0.2s; }
    .fc-tab.active { background: var(--color-primary, #6366f1); color: #fff; }
    .fc-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .fc-stat-card { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 12px; text-align: center; }
    .fc-stat-val { font-size: 20px; font-weight: 700; color: var(--color-text, #e0e0e0); }
    .fc-stat-label { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); margin-top: 4px; }
    .fc-list { display: flex; flex-direction: column; gap: 8px; }
    .fc-comment-item, .fc-thread-item, .fc-reaction-item { background: var(--color-bg, #12121a); border: 1px solid var(--color-border, #2e2e3e); border-radius: 8px; padding: 14px; }
    .fc-item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .fc-item-name { font-size: 13px; font-weight: 500; color: var(--color-text, #e0e0e0); }
    .fc-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
    .fc-item-detail { font-size: 12px; color: var(--color-text-secondary, #a0a0b0); }
  `;
  document.head.appendChild(style);
  const STORAGE_KEY = 'feature-comments-config';
  let state = { activeTab: 'comments' };

  function getComments() {
    return [
      { id: 'cmt-001', featureId: 'feat-094', author: 'Alice Chen', text: 'The code quality scoring algorithm needs fine-tuning for larger files', timestamp: new Date(Date.now() - 600000).toISOString(), likes: 5, resolved: false },
      { id: 'cmt-002', featureId: 'feat-095', author: 'Bob Smith', text: 'Search relevance could weight exact matches higher', timestamp: new Date(Date.now() - 1800000).toISOString(), likes: 3, resolved: false },
      { id: 'cmt-003', featureId: 'feat-092', author: 'Carol Davis', text: 'AI diagnosis confidence thresholds should be configurable', timestamp: new Date(Date.now() - 3600000).toISOString(), likes: 8, resolved: true },
      { id: 'cmt-004', featureId: 'feat-090', author: 'Dave Wilson', text: 'Mobile layout breaks on tablets in landscape mode', timestamp: new Date(Date.now() - 7200000).toISOString(), likes: 2, resolved: false },
      { id: 'cmt-005', featureId: 'feat-098', author: 'Eve Brown', text: 'Help articles need search functionality within category', timestamp: new Date(Date.now() - 14400000).toISOString(), likes: 4, resolved: true },
      { id: 'cmt-006', featureId: 'feat-100', author: 'Frank Lee', text: 'Rate limit windows should support custom durations', timestamp: new Date(Date.now() - 28800000).toISOString(), likes: 1, resolved: false },
      { id: 'cmt-007', featureId: 'feat-094', author: 'Bob Smith', text: 'Duplicate detection should consider AST similarity', timestamp: new Date(Date.now() - 43200000).toISOString(), likes: 6, resolved: false },
      { id: 'cmt-008', featureId: 'feat-092', author: 'Alice Chen', text: 'Error patterns database should be extensible', timestamp: new Date(Date.now() - 57600000).toISOString(), likes: 3, resolved: true },
    ];
  }
  function getComment(id) { return getComments().find(c => c.id === id) || null; }
  function getCommentsForFeature(featureId) { return getComments().filter(c => c.featureId === featureId); }
  function getResolvedComments() { return getComments().filter(c => c.resolved); }

  function getThreads() {
    return [
      { id: 'thr-001', featureId: 'feat-094', title: 'Code Quality Scoring Discussion', commentCount: 4, participants: ['Alice Chen', 'Bob Smith'], lastActivity: new Date(Date.now() - 600000).toISOString(), status: 'open' },
      { id: 'thr-002', featureId: 'feat-092', title: 'AI Diagnosis Accuracy', commentCount: 3, participants: ['Carol Davis', 'Alice Chen'], lastActivity: new Date(Date.now() - 3600000).toISOString(), status: 'closed' },
      { id: 'thr-003', featureId: 'feat-090', title: 'Mobile Layout Issues', commentCount: 2, participants: ['Dave Wilson', 'Eve Brown'], lastActivity: new Date(Date.now() - 7200000).toISOString(), status: 'open' },
      { id: 'thr-004', featureId: 'feat-100', title: 'Rate Limit Configuration', commentCount: 1, participants: ['Frank Lee'], lastActivity: new Date(Date.now() - 28800000).toISOString(), status: 'open' },
    ];
  }
  function getThread(id) { return getThreads().find(t => t.id === id) || null; }

  function getReactions() {
    return [
      { id: 'rxn-001', commentId: 'cmt-001', emoji: 'thumbsup', count: 5, users: ['Bob', 'Carol', 'Dave', 'Eve', 'Frank'] },
      { id: 'rxn-002', commentId: 'cmt-003', emoji: 'check', count: 8, users: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry'] },
      { id: 'rxn-003', commentId: 'cmt-007', emoji: 'brain', count: 6, users: ['Alice', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'] },
      { id: 'rxn-004', commentId: 'cmt-002', emoji: 'eyes', count: 3, users: ['Alice', 'Carol', 'Eve'] },
      { id: 'rxn-005', commentId: 'cmt-005', emoji: 'rocket', count: 4, users: ['Alice', 'Bob', 'Dave', 'Frank'] },
    ];
  }
  function getReaction(id) { return getReactions().find(r => r.id === id) || null; }
  function getReactionsForComment(commentId) { return getReactions().filter(r => r.commentId === commentId); }

  function getCommentStats() {
    return { totalComments: getComments().length, threadCount: getThreads().length, reactionCount: getReactions().length, resolvedCount: getResolvedComments().length };
  }

  function render() {
    const container = document.getElementById('feature-comments-widget');
    if (!container) return;
    const stats = getCommentStats();
    container.innerHTML = `
      <div id="feature-comments-card">
        <div class="fc-header"><h3>Feature Comments</h3></div>
        <div class="fc-stats-row">
          <div class="fc-stat-card"><div class="fc-stat-val">${stats.totalComments}</div><div class="fc-stat-label">Comments</div></div>
          <div class="fc-stat-card"><div class="fc-stat-val">${stats.threadCount}</div><div class="fc-stat-label">Threads</div></div>
          <div class="fc-stat-card"><div class="fc-stat-val">${stats.reactionCount}</div><div class="fc-stat-label">Reactions</div></div>
          <div class="fc-stat-card"><div class="fc-stat-val">${stats.resolvedCount}</div><div class="fc-stat-label">Resolved</div></div>
        </div>
        <div class="fc-tabs">
          <button class="fc-tab ${state.activeTab === 'comments' ? 'active' : ''}" data-tab="comments">Comments</button>
          <button class="fc-tab ${state.activeTab === 'threads' ? 'active' : ''}" data-tab="threads">Threads</button>
          <button class="fc-tab ${state.activeTab === 'reactions' ? 'active' : ''}" data-tab="reactions">Reactions</button>
        </div>
        <div id="fc-content"></div>
      </div>`;
    container.querySelectorAll('.fc-tab').forEach(btn => { btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; saveState(); render(); }); });
    renderContent();
  }
  function renderContent() {
    const el = document.getElementById('fc-content');
    if (!el) return;
    if (state.activeTab === 'comments') renderComments(el);
    else if (state.activeTab === 'threads') renderThreads(el);
    else renderReactions(el);
  }
  function renderComments(el) {
    el.innerHTML = `<div class="fc-list" id="fc-comment-list">${getComments().map(c => `
      <div class="fc-comment-item" data-id="${c.id}"><div class="fc-item-top"><div class="fc-item-name">${c.author}</div>
      <span class="fc-badge" style="background:${c.resolved?'#22c55e':'#f59e0b'}22;color:${c.resolved?'#22c55e':'#f59e0b'}">${c.resolved?'Resolved':'Open'}</span></div>
      <div class="fc-item-detail">${c.featureId}: ${c.text} · ${c.likes} likes</div></div>`).join('')}</div>`;
  }
  function renderThreads(el) {
    el.innerHTML = `<div id="fc-thread-section"><div class="fc-list" id="fc-thread-list">${getThreads().map(t => `
      <div class="fc-thread-item" data-id="${t.id}"><div class="fc-item-top"><div class="fc-item-name">${t.title}</div>
      <span class="fc-badge" style="background:${t.status==='open'?'#3b82f6':'#6b7280'}22;color:${t.status==='open'?'#3b82f6':'#6b7280'}">${t.status}</span></div>
      <div class="fc-item-detail">${t.featureId} · ${t.commentCount} comments · ${t.participants.join(', ')}</div></div>`).join('')}</div></div>`;
  }
  function renderReactions(el) {
    el.innerHTML = `<div id="fc-reaction-section"><div class="fc-list" id="fc-reaction-list">${getReactions().map(r => `
      <div class="fc-reaction-item" data-id="${r.id}"><div class="fc-item-top"><div class="fc-item-name">${r.commentId}</div>
      <span class="fc-badge" style="background:#6366f122;color:#6366f1">${r.emoji} (${r.count})</span></div>
      <div class="fc-item-detail">By: ${r.users.join(', ')}</div></div>`).join('')}</div></div>`;
  }
  function saveState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeTab: state.activeTab })); } catch(e){} }
  function loadState() { try { const s=localStorage.getItem(STORAGE_KEY); if(s){const p=JSON.parse(s); state.activeTab=p.activeTab||state.activeTab;} } catch(e){} }

  window.featureComments = {
    getComments, getComment, getCommentsForFeature, getResolvedComments,
    getThreads, getThread, getReactions, getReaction, getReactionsForComment, getCommentStats,
    setTab(tab) { state.activeTab = tab; saveState(); render(); },
    getState() { return { activeTab: state.activeTab, commentCount: getComments().length, threadCount: getThreads().length, reactionCount: getReactions().length }; },
  };
  document.addEventListener('DOMContentLoaded', () => { loadState(); render(); });
})();
