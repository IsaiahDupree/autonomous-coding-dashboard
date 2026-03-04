# Upwork MCP Server: 8 Improvements
Target: /Users/isaiahdupree/Documents/Software/Safari Automation/packages/upwork-automation/
After EACH feature: npx tsc --noEmit. At end: npm run build + git commit.

Key files: src/api/server.ts, src/api/mcp-server.ts (port 3104), src/automation/

## UW-001: Add proposal template system
Add in-memory + file-backed proposal templates.
  GET  /api/upwork/templates           -> {templates:[{id,name,category,template,tone}]}
  POST /api/upwork/templates           -> create template, persist to ~/.upwork-automation/templates.json
  GET  /api/upwork/templates/:id       -> single template
  DELETE /api/upwork/templates/:id     -> delete template
Templates are used by upwork_generate_proposal to optionally pre-fill structure.
Add upwork_list_templates + upwork_create_template MCP tools.

## UW-002: Add job save/unsave + saved jobs list
  POST /api/upwork/jobs/save   {jobUrl} -> navigate to job, click Save button (heart icon)
    Selector: document.querySelector('[data-test="save-job"], button[aria-label*="Save"]')
  POST /api/upwork/jobs/unsave {jobUrl}
  GET  /api/upwork/jobs/saved          -> navigate to My Jobs > Saved, extract list
Add upwork_save_job + upwork_get_saved_jobs MCP tools.

## UW-003: Add connects balance endpoint
  GET /api/upwork/connects
  Navigate to upwork.com, extract connects balance:
    Selector: document.querySelector('[data-test="connects-count"], [class*="connects"]')?.innerText
  Returns: {balance:number, lastChecked:string}
Add upwork_get_connects MCP tool (already partially in upwork_get_rate_limits but needs dedicated endpoint).

## UW-004: Add watch creation + deletion for job monitoring
  POST /api/upwork/monitor/watches   {keywords:string[], jobType?, experienceLevel?, minBudget?}
    -> persist watch criteria to ~/.upwork-automation/watches.json, return {id, criteria}
  DELETE /api/upwork/monitor/watches/:id
  upwork_monitor_scan already polls all watches - this adds CRUD for them.
Add upwork_create_watch + upwork_delete_watch MCP tools.

## UW-005: Add unread messages detection
  GET /api/upwork/messages/unread
  Navigate to upwork.com/messages, extract conversations with unread badge:
    Selector: document.querySelectorAll('[class*="unread"], [data-test*="unread"]')
  Returns: {count:number, conversations:[{clientName, preview}]}
Add upwork_get_unread_messages MCP tool.

## UW-006: Add analytics summary endpoint
  GET /api/upwork/analytics
  Aggregate from in-memory application log:
    {totalApplications, viewRate, responseRate, applicationsThisWeek, averageScore, topKeywords}
  Initially use mock/computed data from the existing application tracker.
Add upwork_get_analytics MCP tool.

## UW-007: Add rate-limit detection + navigation guard
detectUpworkRateLimit(driver):
  Check document.body.innerText for 'robot','unusual activity','verify','captcha'
  Also: !!document.querySelector('[class*="captcha"], #px-captcha')
Call before search and apply operations.
Expose: GET /api/upwork/rate-status -> {limited:bool, captcha:bool, message:string}
Add upwork_get_rate_status MCP tool.

## UW-008: Add AI proposal improvement endpoint
  POST /api/upwork/proposals/improve
  Body: {existingProposal:string, jobDescription:string, feedback?:string}
  Use OpenAI gpt-4o-mini to rewrite/improve existing cover letter.
  Returns: {improvedProposal:string, changes:string[], confidence:number}
Add upwork_improve_proposal MCP tool.

## BUILD
cd target && npx tsc --noEmit && npm run build
PORT=3104 npx tsx src/api/server.ts &
sleep 2
curl http://localhost:3104/api/upwork/connects
curl http://localhost:3104/api/upwork/templates
curl http://localhost:3104/api/upwork/rate-status
