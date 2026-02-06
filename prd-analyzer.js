// AI-powered PRD Analysis and Suggestions (feat-061)
(function() {
  'use strict';

  const STORAGE_KEY = 'prd-analyzer-config';
  let state = {
    lastAnalysis: null,
    analysisHistory: [],
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

  // --- CSS ---
  const style = document.createElement('style');
  style.textContent = `
    #prd-analyzer-card {
      background: var(--color-bg-secondary, #1a1f2e);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 12px;
      overflow: hidden;
    }
    #prd-analyzer-card .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      background: var(--color-bg-tertiary, #151928);
    }
    #prd-analyzer-card .card-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
    }
    #prd-analyzer-card .card-body {
      padding: 20px;
    }

    /* Input area */
    .pa-input-section {
      margin-bottom: 16px;
    }
    .pa-textarea {
      width: 100%;
      min-height: 120px;
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
    .pa-textarea:focus {
      outline: none;
      border-color: var(--color-accent, #6366f1);
    }
    .pa-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    .pa-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .pa-btn-primary {
      background: var(--color-accent, #6366f1);
      color: #fff;
    }
    .pa-btn-primary:hover { opacity: 0.9; }
    .pa-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .pa-btn-secondary {
      background: var(--color-bg-primary, #0a0e1a);
      color: var(--color-text-secondary, #94a3b8);
      border: 1px solid var(--color-border, #2a2f3e);
    }
    .pa-btn-secondary:hover { color: var(--color-text-primary, #f1f5f9); }

    /* Results container */
    .pa-results {
      display: none;
    }
    .pa-results.visible {
      display: block;
    }

    /* Score overview */
    .pa-score-overview {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .pa-score-card {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .pa-score-value {
      font-size: 1.6rem;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .pa-score-label {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #94a3b8);
    }
    .pa-score-low { color: #22c55e; }
    .pa-score-medium { color: #f59e0b; }
    .pa-score-high { color: #ef4444; }

    /* Section panels */
    .pa-section {
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .pa-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      user-select: none;
    }
    .pa-section-header:hover {
      background: var(--color-bg-secondary, #1a1f2e);
    }
    .pa-section-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-primary, #f1f5f9);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pa-section-badge {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--color-accent, #6366f1);
      color: #fff;
    }
    .pa-section-toggle {
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.8rem;
      transition: transform 0.2s;
    }
    .pa-section-body {
      padding: 0 16px 14px;
      display: none;
    }
    .pa-section.expanded .pa-section-body {
      display: block;
    }
    .pa-section.expanded .pa-section-toggle {
      transform: rotate(180deg);
    }

    /* Items */
    .pa-item {
      display: flex;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-border, #2a2f3e);
      font-size: 0.8rem;
    }
    .pa-item:last-child { border-bottom: none; }
    .pa-item-icon {
      flex-shrink: 0;
      width: 20px;
      text-align: center;
    }
    .pa-item-content {
      flex: 1;
    }
    .pa-item-title {
      color: var(--color-text-primary, #f1f5f9);
      font-weight: 500;
      margin-bottom: 2px;
    }
    .pa-item-desc {
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.75rem;
      line-height: 1.4;
    }
    .pa-item-priority {
      flex-shrink: 0;
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 500;
    }
    .pa-priority-high {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
    .pa-priority-medium {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }
    .pa-priority-low {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    /* Complexity breakdown */
    .pa-complexity-bar {
      display: flex;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      background: var(--color-bg-secondary, #1a1f2e);
      margin: 10px 0;
    }
    .pa-complexity-segment {
      height: 100%;
      transition: width 0.3s ease;
    }

    /* Analysis loading */
    .pa-loading {
      text-align: center;
      padding: 20px;
      color: var(--color-text-secondary, #94a3b8);
      font-size: 0.85rem;
      display: none;
    }
    .pa-loading.visible { display: block; }
    .pa-loading-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-border, #2a2f3e);
      border-top-color: var(--color-accent, #6366f1);
      border-radius: 50%;
      animation: pa-spin 0.8s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }
    @keyframes pa-spin {
      to { transform: rotate(360deg); }
    }

    /* Feature selector */
    .pa-feature-select {
      width: 100%;
      padding: 8px 12px;
      background: var(--color-bg-primary, #0a0e1a);
      border: 1px solid var(--color-border, #2a2f3e);
      border-radius: 6px;
      color: var(--color-text-primary, #f1f5f9);
      font-size: 0.85rem;
      font-family: inherit;
      margin-bottom: 10px;
    }
    .pa-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-text-secondary, #94a3b8);
      margin-bottom: 6px;
      display: block;
    }
  `;
  document.head.appendChild(style);

  // --- Analysis Engine ---

  // Common PRD quality checks
  const QUALITY_CHECKS = {
    hasTitle: { label: 'Document title', weight: 1 },
    hasOverview: { label: 'Overview/summary section', weight: 2 },
    hasGoals: { label: 'Goals or objectives', weight: 2 },
    hasUserStories: { label: 'User stories or use cases', weight: 2 },
    hasAcceptanceCriteria: { label: 'Acceptance criteria', weight: 3 },
    hasNonFunctional: { label: 'Non-functional requirements (performance, security)', weight: 2 },
    hasEdgeCases: { label: 'Edge cases or error handling', weight: 2 },
    hasDependencies: { label: 'Dependencies or prerequisites', weight: 1 },
    hasTimeline: { label: 'Timeline or milestones', weight: 1 },
    hasSuccessMetrics: { label: 'Success metrics or KPIs', weight: 2 },
    hasTechnicalDetails: { label: 'Technical requirements or constraints', weight: 2 },
    hasTestingPlan: { label: 'Testing strategy', weight: 1 },
  };

  const KEYWORD_PATTERNS = {
    hasTitle: /^#\s+.+/m,
    hasOverview: /overview|summary|introduction|background/i,
    hasGoals: /goals?|objectives?|purpose|aims?/i,
    hasUserStories: /user\s+stor(y|ies)|use\s+case|as\s+a\s+user|persona/i,
    hasAcceptanceCriteria: /acceptance\s+criteria|definition\s+of\s+done|requirements?|must\s+have|should\s+have/i,
    hasNonFunctional: /performance|security|scalab|reliab|availab|latency|throughput|uptime/i,
    hasEdgeCases: /edge\s+case|error\s+handl|fallback|failure|exception|invalid|boundary/i,
    hasDependencies: /dependenc|prerequisit|blockers?|requires?|integration/i,
    hasTimeline: /timeline|milestone|phase|sprint|deadline|schedule/i,
    hasSuccessMetrics: /metric|kpi|success\s+criteria|measure|benchmark|target/i,
    hasTechnicalDetails: /technical|architect|api|database|infrastruc|stack|framework/i,
    hasTestingPlan: /test(ing)?\s+(plan|strateg|approach)|qa|quality\s+assurance|unit\s+test|e2e/i,
  };

  function analyzeContent(text) {
    if (!text || text.trim().length === 0) {
      return { error: 'No content to analyze' };
    }

    const lines = text.split('\n');
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const sectionCount = (text.match(/^#{1,3}\s+/gm) || []).length;
    const bulletPoints = (text.match(/^[\s]*[-*+]\s+/gm) || []).length;
    const numberedItems = (text.match(/^[\s]*\d+[.)]\s+/gm) || []).length;

    // Check quality attributes
    const qualityResults = {};
    let qualityScore = 0;
    let maxScore = 0;

    for (const [key, check] of Object.entries(QUALITY_CHECKS)) {
      const pattern = KEYWORD_PATTERNS[key];
      const found = pattern ? pattern.test(text) : false;
      qualityResults[key] = { found, ...check };
      maxScore += check.weight;
      if (found) qualityScore += check.weight;
    }

    const qualityPct = Math.round((qualityScore / maxScore) * 100);

    // Identify missing acceptance criteria
    const missingCriteria = [];
    for (const [key, result] of Object.entries(qualityResults)) {
      if (!result.found) {
        missingCriteria.push({
          category: key,
          label: result.label,
          priority: result.weight >= 2 ? 'high' : 'low',
          suggestion: getMissingSuggestion(key),
        });
      }
    }

    // Generate improvement suggestions
    const improvements = generateImprovements(text, wordCount, sectionCount, bulletPoints, numberedItems, qualityResults);

    // Estimate complexity
    const complexity = estimateComplexity(text, wordCount, sectionCount, qualityResults);

    return {
      summary: {
        wordCount,
        sectionCount,
        bulletPoints,
        numberedItems,
        lineCount: lines.length,
        qualityScore: qualityPct,
      },
      missingCriteria,
      improvements,
      complexity,
      qualityResults,
      timestamp: new Date().toISOString(),
    };
  }

  function getMissingSuggestion(key) {
    const suggestions = {
      hasTitle: 'Add a clear, descriptive title at the top of the document.',
      hasOverview: 'Add an overview section summarizing the feature/product and its purpose.',
      hasGoals: 'Define clear goals and objectives that this PRD aims to achieve.',
      hasUserStories: 'Include user stories or use cases to describe how users will interact with the feature.',
      hasAcceptanceCriteria: 'Add specific, measurable acceptance criteria for each requirement.',
      hasNonFunctional: 'Specify non-functional requirements like performance targets, security requirements, and scalability needs.',
      hasEdgeCases: 'Document edge cases, error scenarios, and how the system should handle failures.',
      hasDependencies: 'List any dependencies, prerequisites, or integration requirements.',
      hasTimeline: 'Include a timeline with milestones or phased delivery plan.',
      hasSuccessMetrics: 'Define measurable success metrics or KPIs to evaluate the feature after launch.',
      hasTechnicalDetails: 'Add technical requirements, architecture considerations, or API specifications.',
      hasTestingPlan: 'Outline the testing strategy including unit tests, integration tests, and QA approach.',
    };
    return suggestions[key] || 'Consider adding this section for a more complete PRD.';
  }

  function generateImprovements(text, wordCount, sectionCount, bulletPoints, numberedItems, quality) {
    const improvements = [];

    // Content length checks
    if (wordCount < 100) {
      improvements.push({
        type: 'content',
        priority: 'high',
        title: 'PRD is too brief',
        description: `Only ${wordCount} words. A thorough PRD typically has 300-1000+ words. Add more detail to requirements and acceptance criteria.`,
      });
    } else if (wordCount < 300) {
      improvements.push({
        type: 'content',
        priority: 'medium',
        title: 'Consider adding more detail',
        description: `${wordCount} words is below average. Consider expanding sections with more specific requirements.`,
      });
    }

    // Structure checks
    if (sectionCount < 3) {
      improvements.push({
        type: 'structure',
        priority: 'high',
        title: 'Improve document structure',
        description: 'Add more sections with clear headings. Recommended: Overview, Goals, Requirements, Acceptance Criteria, Technical Details.',
      });
    }

    if (bulletPoints < 3 && numberedItems < 3) {
      improvements.push({
        type: 'structure',
        priority: 'medium',
        title: 'Use more structured lists',
        description: 'Break requirements into bullet points or numbered lists for clarity and easier tracking.',
      });
    }

    // Specificity checks
    const vagueTerms = text.match(/\b(fast|good|nice|easy|simple|better|improve|enhance|various|etc|some|many|few)\b/gi) || [];
    if (vagueTerms.length > 3) {
      improvements.push({
        type: 'clarity',
        priority: 'medium',
        title: 'Replace vague language',
        description: `Found ${vagueTerms.length} vague terms (e.g., "${vagueTerms.slice(0, 3).join('", "')}"). Use specific, measurable language instead.`,
      });
    }

    // Measurability
    const hasNumbers = /\d+\s*(ms|seconds?|minutes?|%|users?|requests?|MB|GB|KB)/i.test(text);
    if (!hasNumbers && quality.hasAcceptanceCriteria && quality.hasAcceptanceCriteria.found) {
      improvements.push({
        type: 'measurability',
        priority: 'medium',
        title: 'Add quantitative targets',
        description: 'Include specific numerical targets (e.g., "response time < 200ms", "support 1000 concurrent users").',
      });
    }

    // Scope checks
    if (!quality.hasEdgeCases || !quality.hasEdgeCases.found) {
      improvements.push({
        type: 'completeness',
        priority: 'medium',
        title: 'Address error scenarios',
        description: 'Document what happens when things go wrong: invalid input, network failures, edge cases.',
      });
    }

    // Consistency check
    const headings = text.match(/^#{1,3}\s+.+/gm) || [];
    const hasInconsistentCaps = headings.length > 2 && headings.some(h => /^#+\s+[a-z]/.test(h)) && headings.some(h => /^#+\s+[A-Z]/.test(h));
    if (hasInconsistentCaps) {
      improvements.push({
        type: 'consistency',
        priority: 'low',
        title: 'Standardize heading capitalization',
        description: 'Use consistent capitalization across all section headings (either Title Case or Sentence case).',
      });
    }

    // Audience check
    if (!quality.hasUserStories || !quality.hasUserStories.found) {
      improvements.push({
        type: 'audience',
        priority: 'medium',
        title: 'Define target users',
        description: 'Add user stories or personas to clarify who will use this feature and how.',
      });
    }

    return improvements;
  }

  function estimateComplexity(text, wordCount, sectionCount, quality) {
    let score = 0;
    let factors = [];

    // Word count factor
    if (wordCount > 500) {
      score += 2;
      factors.push({ name: 'Large scope', impact: 2, description: 'High word count suggests extensive feature' });
    } else if (wordCount > 200) {
      score += 1;
      factors.push({ name: 'Medium scope', impact: 1, description: 'Moderate feature scope' });
    }

    // Section count factor
    if (sectionCount > 6) {
      score += 2;
      factors.push({ name: 'Many sections', impact: 2, description: `${sectionCount} sections indicates multi-faceted feature` });
    } else if (sectionCount > 3) {
      score += 1;
      factors.push({ name: 'Multiple sections', impact: 1, description: `${sectionCount} sections` });
    }

    // Technical complexity indicators
    const techTerms = text.match(/\b(api|database|migration|authentication|authorization|encryption|websocket|real-?time|caching|queue|microservice|oauth|jwt|graphql|webhook)\b/gi) || [];
    if (techTerms.length > 5) {
      score += 3;
      factors.push({ name: 'High technical complexity', impact: 3, description: `${techTerms.length} technical terms detected` });
    } else if (techTerms.length > 2) {
      score += 2;
      factors.push({ name: 'Moderate technical complexity', impact: 2, description: `${techTerms.length} technical terms` });
    } else if (techTerms.length > 0) {
      score += 1;
      factors.push({ name: 'Some technical requirements', impact: 1, description: `${techTerms.length} technical terms` });
    }

    // Integration complexity
    const integrations = text.match(/\b(integrat|third[- ]party|external|api|sdk|plugin|library|service)\b/gi) || [];
    if (integrations.length > 3) {
      score += 2;
      factors.push({ name: 'Multiple integrations', impact: 2, description: 'References to external integrations' });
    } else if (integrations.length > 0) {
      score += 1;
      factors.push({ name: 'Some integrations', impact: 1, description: 'External integration mentioned' });
    }

    // Security/compliance factor
    if (/security|compliance|gdpr|hipaa|pci|encrypt|auth/i.test(text)) {
      score += 1;
      factors.push({ name: 'Security requirements', impact: 1, description: 'Security or compliance considerations' });
    }

    // UI complexity
    const uiTerms = text.match(/\b(responsive|animation|drag[- ]?drop|modal|wizard|dashboard|chart|graph|real[- ]?time\s+update)/gi) || [];
    if (uiTerms.length > 3) {
      score += 2;
      factors.push({ name: 'Complex UI', impact: 2, description: `${uiTerms.length} UI complexity indicators` });
    } else if (uiTerms.length > 0) {
      score += 1;
      factors.push({ name: 'Some UI complexity', impact: 1, description: 'UI interaction requirements' });
    }

    // Normalize to 1-10 scale
    const maxPossible = 13;
    const normalizedScore = Math.max(1, Math.min(10, Math.round((score / maxPossible) * 10)));

    let level, color;
    if (normalizedScore <= 3) {
      level = 'Low';
      color = '#22c55e';
    } else if (normalizedScore <= 6) {
      level = 'Medium';
      color = '#f59e0b';
    } else {
      level = 'High';
      color = '#ef4444';
    }

    // Estimate effort
    let effortDays;
    if (normalizedScore <= 2) effortDays = '1-2 days';
    else if (normalizedScore <= 4) effortDays = '3-5 days';
    else if (normalizedScore <= 6) effortDays = '1-2 weeks';
    else if (normalizedScore <= 8) effortDays = '2-4 weeks';
    else effortDays = '1-2 months';

    return {
      score: normalizedScore,
      level,
      color,
      effortEstimate: effortDays,
      factors,
      breakdown: {
        scope: Math.min(score > 2 ? 3 : score, 3),
        technical: Math.min(techTerms.length > 5 ? 3 : (techTerms.length > 2 ? 2 : (techTerms.length > 0 ? 1 : 0)), 3),
        integration: Math.min(integrations.length > 3 ? 3 : (integrations.length > 0 ? 1 : 0), 3),
        ui: Math.min(uiTerms.length > 3 ? 2 : (uiTerms.length > 0 ? 1 : 0), 3),
      },
    };
  }

  // Analyze a feature from feature_list.json
  function analyzeFeature(feature) {
    if (!feature) return { error: 'No feature provided' };
    let text = `# ${feature.description}\n\n`;
    text += `Category: ${feature.category}\nPriority: ${feature.priority}\n\n`;
    text += '## Acceptance Criteria\n';
    if (feature.acceptance_criteria) {
      feature.acceptance_criteria.forEach(ac => { text += `- ${ac}\n`; });
    }
    return analyzeContent(text);
  }

  // --- UI ---
  function render() {
    const container = document.getElementById('prd-analyzer-widget');
    if (!container) return;

    container.innerHTML = `
      <div id="prd-analyzer-card">
        <div class="card-header">
          <h3>🤖 PRD Analyzer</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:0.75rem;color:var(--color-text-secondary);">AI-powered analysis</span>
          </div>
        </div>
        <div class="card-body">
          <!-- Feature selector -->
          <div class="pa-input-section">
            <label class="pa-label">Analyze a Feature</label>
            <select class="pa-feature-select" id="pa-feature-select">
              <option value="">-- Select a feature --</option>
            </select>
          </div>

          <!-- Or paste content -->
          <div class="pa-input-section">
            <label class="pa-label">Or Paste PRD Content</label>
            <textarea class="pa-textarea" id="pa-content-input" placeholder="Paste your PRD content here for analysis..."></textarea>
          </div>

          <div class="pa-actions">
            <button class="pa-btn pa-btn-primary" id="pa-analyze-btn" onclick="window.prdAnalyzer.analyze()">Analyze PRD</button>
            <button class="pa-btn pa-btn-secondary" onclick="window.prdAnalyzer.loadDemo()">Load Demo</button>
            <button class="pa-btn pa-btn-secondary" onclick="window.prdAnalyzer.clear()">Clear</button>
          </div>

          <!-- Loading -->
          <div class="pa-loading" id="pa-loading">
            <span class="pa-loading-spinner"></span>
            Analyzing PRD content...
          </div>

          <!-- Results -->
          <div class="pa-results" id="pa-results">
            <!-- Score overview -->
            <div class="pa-score-overview" id="pa-score-overview"></div>

            <!-- Missing criteria section -->
            <div class="pa-section expanded" id="pa-missing-section">
              <div class="pa-section-header" onclick="window.prdAnalyzer.toggleSection('pa-missing-section')">
                <span class="pa-section-title">
                  Missing Acceptance Criteria
                  <span class="pa-section-badge" id="pa-missing-count">0</span>
                </span>
                <span class="pa-section-toggle">▼</span>
              </div>
              <div class="pa-section-body" id="pa-missing-list"></div>
            </div>

            <!-- Improvements section -->
            <div class="pa-section expanded" id="pa-improvements-section">
              <div class="pa-section-header" onclick="window.prdAnalyzer.toggleSection('pa-improvements-section')">
                <span class="pa-section-title">
                  Suggested Improvements
                  <span class="pa-section-badge" id="pa-improvements-count">0</span>
                </span>
                <span class="pa-section-toggle">▼</span>
              </div>
              <div class="pa-section-body" id="pa-improvements-list"></div>
            </div>

            <!-- Complexity section -->
            <div class="pa-section expanded" id="pa-complexity-section">
              <div class="pa-section-header" onclick="window.prdAnalyzer.toggleSection('pa-complexity-section')">
                <span class="pa-section-title">
                  Complexity Estimate
                  <span class="pa-section-badge" id="pa-complexity-badge">-</span>
                </span>
                <span class="pa-section-toggle">▼</span>
              </div>
              <div class="pa-section-body" id="pa-complexity-details"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    populateFeatureSelect();
  }

  function populateFeatureSelect() {
    const select = document.getElementById('pa-feature-select');
    if (!select) return;

    // Try to get features from global data
    let features = [];
    try {
      if (window.featureData && window.featureData.features) {
        features = window.featureData.features;
      }
    } catch(e) {}

    // Also listen for feature data to be loaded
    if (features.length === 0) {
      // Try fetching
      fetch('/feature_list.json')
        .then(r => r.json())
        .then(data => {
          if (data && data.features) {
            data.features.forEach(f => {
              const opt = document.createElement('option');
              opt.value = JSON.stringify(f);
              opt.textContent = `${f.id}: ${f.description} ${f.passes ? '✓' : '○'}`;
              select.appendChild(opt);
            });
          }
        })
        .catch(() => {});
    } else {
      features.forEach(f => {
        const opt = document.createElement('option');
        opt.value = JSON.stringify(f);
        opt.textContent = `${f.id}: ${f.description} ${f.passes ? '✓' : '○'}`;
        select.appendChild(opt);
      });
    }
  }

  function toggleSection(id) {
    const section = document.getElementById(id);
    if (section) section.classList.toggle('expanded');
  }

  function analyze() {
    const select = document.getElementById('pa-feature-select');
    const textarea = document.getElementById('pa-content-input');
    const loading = document.getElementById('pa-loading');
    const results = document.getElementById('pa-results');

    let analysis;

    // Show loading
    loading.classList.add('visible');
    results.classList.remove('visible');

    // Simulate async analysis
    setTimeout(() => {
      if (select.value) {
        // Analyze selected feature
        try {
          const feature = JSON.parse(select.value);
          analysis = analyzeFeature(feature);
        } catch(e) {
          analysis = { error: 'Invalid feature data' };
        }
      } else if (textarea.value.trim()) {
        // Analyze pasted content
        analysis = analyzeContent(textarea.value.trim());
      } else {
        loading.classList.remove('visible');
        return;
      }

      loading.classList.remove('visible');

      if (analysis.error) {
        return;
      }

      // Store result
      state.lastAnalysis = analysis;
      state.analysisHistory.unshift({ timestamp: analysis.timestamp, qualityScore: analysis.summary.qualityScore });
      if (state.analysisHistory.length > 20) state.analysisHistory.length = 20;
      saveState();

      renderResults(analysis);
    }, 800);
  }

  function renderResults(analysis) {
    const results = document.getElementById('pa-results');
    results.classList.add('visible');

    // Score overview
    const scoreOverview = document.getElementById('pa-score-overview');
    const qualityClass = analysis.summary.qualityScore >= 70 ? 'pa-score-low' : (analysis.summary.qualityScore >= 40 ? 'pa-score-medium' : 'pa-score-high');
    const complexityClass = analysis.complexity.score <= 3 ? 'pa-score-low' : (analysis.complexity.score <= 6 ? 'pa-score-medium' : 'pa-score-high');

    scoreOverview.innerHTML = `
      <div class="pa-score-card">
        <div class="pa-score-value ${qualityClass}">${analysis.summary.qualityScore}%</div>
        <div class="pa-score-label">Quality Score</div>
      </div>
      <div class="pa-score-card">
        <div class="pa-score-value ${complexityClass}">${analysis.complexity.score}/10</div>
        <div class="pa-score-label">Complexity</div>
      </div>
      <div class="pa-score-card">
        <div class="pa-score-value" style="color:var(--color-text-primary);font-size:1.1rem;">${analysis.complexity.effortEstimate}</div>
        <div class="pa-score-label">Effort Estimate</div>
      </div>
    `;

    // Missing criteria
    const missingCount = document.getElementById('pa-missing-count');
    const missingList = document.getElementById('pa-missing-list');
    missingCount.textContent = analysis.missingCriteria.length;

    if (analysis.missingCriteria.length === 0) {
      missingList.innerHTML = '<div style="padding:8px 0;font-size:0.8rem;color:#22c55e;">All key criteria covered!</div>';
    } else {
      missingList.innerHTML = analysis.missingCriteria.map(item => `
        <div class="pa-item">
          <div class="pa-item-icon">⚠️</div>
          <div class="pa-item-content">
            <div class="pa-item-title">${item.label}</div>
            <div class="pa-item-desc">${item.suggestion}</div>
          </div>
          <span class="pa-item-priority pa-priority-${item.priority}">${item.priority}</span>
        </div>
      `).join('');
    }

    // Improvements
    const improvementsCount = document.getElementById('pa-improvements-count');
    const improvementsList = document.getElementById('pa-improvements-list');
    improvementsCount.textContent = analysis.improvements.length;

    if (analysis.improvements.length === 0) {
      improvementsList.innerHTML = '<div style="padding:8px 0;font-size:0.8rem;color:#22c55e;">PRD looks great! No major improvements needed.</div>';
    } else {
      improvementsList.innerHTML = analysis.improvements.map(item => {
        const icon = item.type === 'content' ? '📝' : (item.type === 'structure' ? '📐' : (item.type === 'clarity' ? '🔍' : '💡'));
        return `
          <div class="pa-item">
            <div class="pa-item-icon">${icon}</div>
            <div class="pa-item-content">
              <div class="pa-item-title">${item.title}</div>
              <div class="pa-item-desc">${item.description}</div>
            </div>
            <span class="pa-item-priority pa-priority-${item.priority}">${item.priority}</span>
          </div>
        `;
      }).join('');
    }

    // Complexity details
    const complexityBadge = document.getElementById('pa-complexity-badge');
    const complexityDetails = document.getElementById('pa-complexity-details');
    complexityBadge.textContent = analysis.complexity.level;
    complexityBadge.style.background = analysis.complexity.color;

    const bd = analysis.complexity.breakdown;
    const totalBd = bd.scope + bd.technical + bd.integration + bd.ui;
    const maxBd = 12;

    complexityDetails.innerHTML = `
      <div style="margin-bottom:10px;font-size:0.8rem;color:var(--color-text-secondary);">
        Estimated effort: <strong style="color:var(--color-text-primary);">${analysis.complexity.effortEstimate}</strong>
      </div>
      <div class="pa-complexity-bar">
        <div class="pa-complexity-segment" style="width:${(bd.scope/maxBd)*100}%;background:#6366f1;" title="Scope"></div>
        <div class="pa-complexity-segment" style="width:${(bd.technical/maxBd)*100}%;background:#f59e0b;" title="Technical"></div>
        <div class="pa-complexity-segment" style="width:${(bd.integration/maxBd)*100}%;background:#22c55e;" title="Integration"></div>
        <div class="pa-complexity-segment" style="width:${(bd.ui/maxBd)*100}%;background:#ec4899;" title="UI"></div>
      </div>
      <div style="display:flex;gap:16px;font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:12px;">
        <span><span style="color:#6366f1;">●</span> Scope</span>
        <span><span style="color:#f59e0b;">●</span> Technical</span>
        <span><span style="color:#22c55e;">●</span> Integration</span>
        <span><span style="color:#ec4899;">●</span> UI</span>
      </div>
      ${analysis.complexity.factors.map(f => `
        <div class="pa-item">
          <div class="pa-item-icon">📊</div>
          <div class="pa-item-content">
            <div class="pa-item-title">${f.name}</div>
            <div class="pa-item-desc">${f.description}</div>
          </div>
          <span style="font-size:0.75rem;color:var(--color-text-secondary);">+${f.impact}</span>
        </div>
      `).join('')}
    `;
  }

  function loadDemo() {
    document.getElementById('pa-content-input').value = `# Real-Time Collaborative Editor

## Overview
Build a real-time collaborative document editor that allows multiple users to simultaneously edit the same document with live cursor tracking and conflict resolution.

## Goals
- Enable real-time collaboration for distributed teams
- Support 50+ concurrent editors per document
- Achieve sub-100ms latency for edit propagation

## User Stories
- As a user, I want to see other editors' cursors in real-time
- As a user, I want to see changes appear instantly without page refresh
- As an admin, I want to manage document access permissions

## Requirements

### Core Features
- Rich text editing with formatting toolbar
- Real-time sync using WebSocket connections
- Operational Transform (OT) for conflict resolution
- User presence indicators and cursor tracking

### Authentication
- OAuth integration with Google and GitHub
- JWT-based session management
- Role-based access control (viewer, editor, admin)

### Performance
- Response time under 200ms for edit operations
- Support 1000 concurrent users per server
- Horizontal scaling with Redis pub/sub

## Acceptance Criteria
- Multiple users can edit simultaneously without data loss
- Cursor positions update within 100ms
- Document state is consistent across all connected clients
- Offline edits are queued and synced on reconnect

## Edge Cases
- Handle network disconnection gracefully
- Resolve conflicting edits on the same line
- Handle browser tab becoming inactive
- Support undo/redo across collaborative sessions

## Technical Requirements
- Frontend: React with WebSocket client
- Backend: Node.js with Socket.IO
- Database: PostgreSQL for documents, Redis for real-time state
- Infrastructure: Docker containers with Kubernetes orchestration

## Success Metrics
- 99.9% uptime for the collaboration service
- Average edit latency below 50ms
- User satisfaction score above 4.5/5`;
    document.getElementById('pa-feature-select').value = '';
  }

  function clear() {
    document.getElementById('pa-content-input').value = '';
    document.getElementById('pa-feature-select').value = '';
    document.getElementById('pa-results').classList.remove('visible');
    document.getElementById('pa-loading').classList.remove('visible');
  }

  // --- Public API ---
  window.prdAnalyzer = {
    analyze,
    analyzeContent,
    analyzeFeature,
    loadDemo,
    clear,
    toggleSection,
    switchTab: () => {},
    getState: () => ({ ...state }),
    getLastAnalysis: () => state.lastAnalysis,
  };

  // --- Init ---
  loadState();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
