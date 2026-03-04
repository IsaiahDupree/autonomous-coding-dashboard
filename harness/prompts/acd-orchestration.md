# ACD Orchestration -- Business Goals, Orchestrate, and Weekly Review MCP Tools + Dashboard

## Project
/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard

## Context
This batch adds 7 features connecting the ACD to the business goals orchestration system.
The business goals file lives at:
  /Users/isaiahdupree/Documents/Software/business-goals.json

Existing tools in harness/acd-mcp-server.js:
  acd_list_projects, acd_start, acd_status, acd_logs, acd_stop
  (acd_read_memory, acd_write_memory, acd_heartbeat_status, acd_schedule, acd_list_scheduled -- being added by acd-memory agent)

Dashboard files: index.html, app.js (frontend), backend/app.js or backend/index.ts (API routes)
SSE already in place for live agent updates.
Feature list: harness/acd-orchestration-features.json -- update passes: true after each feature.

---

## ACD-ORC-001: acd_get_goals MCP tool

Add to TOOLS array in harness/acd-mcp-server.js:
  name: 'acd_get_goals'
  description: 'Read the business goals file and return revenue targets, growth, weekly targets, next actions, agents in flight, and offers'
  inputSchema: { type: 'object', properties: {}, required: [] }

Handler acdGetGoals():
  const goalsPath = '/Users/isaiahdupree/Documents/Software/business-goals.json'
  if (!existsSync(goalsPath)) return { error: 'business-goals.json not found at ' + goalsPath }
  const goals = JSON.parse(readFileSync(goalsPath, 'utf8'))
  Compute gap analysis:
    revenue_gap = goals.revenue.target_monthly_usd - goals.revenue.current_monthly_usd
    revenue_pct = Math.round((goals.revenue.current_monthly_usd / goals.revenue.target_monthly_usd) * 100)
    contacts_gap = goals.growth.crm_contacts_target - goals.growth.crm_contacts_current
  Return { goals, computed: { revenue_gap, revenue_pct, contacts_gap }, updated: goals._updated }

Add case 'acd_get_goals' to executeTool switch.

---

## ACD-ORC-002: acd_update_goals MCP tool

Add to TOOLS array:
  name: 'acd_update_goals'
  description: 'Update a specific field in business-goals.json using dot-path notation'
  inputSchema: { type: 'object', properties: {
    path: { type: 'string', description: 'Dot-path to field, e.g. revenue.current_monthly_usd or growth.crm_contacts_current' },
    value: { description: 'New value (any JSON type)' }
  }, required: ['path', 'value'] }

Handler acdUpdateGoals(params):
  Read business-goals.json
  Deep-set using path split by '.':
    function deepSet(obj, pathParts, value) { if parts.length === 1: obj[parts[0]] = value else deepSet(obj[parts[0]], parts.slice(1), value) }
  Set goals._updated = new Date().toISOString().split('T')[0]
  Write back to file
  Return { ok: true, path: params.path, newValue: params.value, updated: goals._updated }

Add case 'acd_update_goals' to executeTool switch.

---

## ACD-ORC-003: acd_orchestrate MCP tool

Add to TOOLS array:
  name: 'acd_orchestrate'
  description: 'Read business goals + live system state and return a ranked action plan for the next 24-48 hours'
  inputSchema: { type: 'object', properties: {
    focus: { type: 'string', description: 'Optional filter: revenue | content | agents | growth' }
  }, required: [] }

Handler acdOrchestrate(params):
  1. Read business-goals.json (use acdGetGoals logic inline)
  2. Read current agent statuses by scanning harness/logs/*.log (last line of each)
  3. Check service health: try fetch http://localhost:3100/health etc. for ports 3100,3003,3102,3105 (2s timeout)
  4. Build action catalog array:
     Each entry: { rank, action, skill, reason, expected_impact, blocked_by, can_run }
     revenue_gap > 0 and Upwork port not checked: { rank: 1, action: 'Submit Upwork proposals', skill: '/upwork-hunt', reason: 'Revenue gap $'+revenue_gap, expected_impact: '2-5 client responses', can_run: true }
     DM campaign: { rank: 2, action: 'LinkedIn DM campaign', skill: '/dm-campaign', reason: 'Top outreach channel for ICP', expected_impact: '3-5 replies', can_run: port3105_up }
     Social inbox: { rank: 3, action: 'Triage DM inbox', skill: '/social-inbox', reason: 'Reply to incoming leads', expected_impact: '1-2 conversions', can_run: anyDmServiceUp }
     Content: { rank: 4, action: 'Twitter feedback cycle', skill: '/actp-pipeline twitter', reason: 'Audience growth + brand', expected_impact: 'Viral/strong tweet', can_run: true }
     Comment sweep: { rank: 5, action: 'Comment on trending posts', skill: '/comment-sweep', reason: 'Inbound discovery', expected_impact: '+10-20 profile visits', can_run: anyCommentServiceUp }
  5. Filter by params.focus if provided
  6. Sort by rank (blockers first if any services down)
  7. Return { plan: rankedActions, goals_summary: { revenue_gap, revenue_pct, focus }, timestamp: now }

Add case 'acd_orchestrate' to executeTool switch.

---

## ACD-ORC-004 + ACD-ORC-005: /api/goals backend routes

Find the backend file (check backend/app.js, backend/index.ts, backend/src/index.ts, or backend/dist/index.js).
Add two routes:

GET /api/goals:
  Read business-goals.json
  Compute gap analysis (same as ACD-ORC-001)
  Return JSON: { goals, computed: { revenue_gap, revenue_pct, contacts_gap }, updated }

POST /api/goals:
  Body: { path, value }
  Validate path is a string and value is defined
  Deep-set the field using dot-path (same as ACD-ORC-002)
  Write file back
  Emit SSE event 'goal_updated' if SSE broadcaster is available
  Return: { ok: true, path, newValue, updated }

---

## ACD-ORC-006: Goals tab in dashboard UI

In index.html: add a 'Goals' tab button in the existing tab navigation.
In app.js or index.html script:
  1. On Goals tab activation, fetch /api/goals and render:
     a. Revenue progress bar: filled bar showing current_monthly_usd / target_monthly_usd pct, label '$X / $Y (Z%)'
     b. Weekly targets checklist: for each item in weekly_targets, show a checkbox row with target value
     c. Agents in flight: for each entry in agents_in_flight, show a badge (running=green, completed=gray, failed=red)
     d. Next actions list: numbered list from goals.next_actions array
     e. Offers panel: cards for each active offer (name, price, platform, description)
  2. Update Goal form: two inputs (path: text, value: text/number) + Save button
     On Save: POST /api/goals with { path, value: JSON.parse(value) || value }, refresh Goals tab
  3. SSE listener: on goal_updated event, refresh Goals tab data
  Keep styling consistent with existing dashboard (same card/panel styles).

---

## ACD-ORC-007: Orchestration tab in dashboard UI

In index.html: add an 'Orchestrate' tab button.
In app.js or script:
  1. On Orchestrate tab activation, fetch /api/mcp with body { tool: 'acd_orchestrate' } to get ranked plan.
     (Use existing MCP tool call mechanism if present, otherwise POST directly to acd-mcp-server on port shown in config.)
  2. Render action cards: for each action in plan:
     Card: title=action, subtitle=skill, body=reason, badge=expected_impact
     Footer: Run button (disabled if can_run=false with tooltip showing blocked_by)
     On Run: POST /api/dispatch with { slug: skill-name, description: reason } then show spinner
  3. Show goals_summary bar at top: revenue gap pill, focus badge
  4. Auto-refresh every 30 seconds
  5. If /api/dispatch is not yet implemented, show the Run button as a copy-to-clipboard of the skill command instead.
  Keep styling consistent with existing dashboard.