# Bootstrap: Self-Equip with All Skills + MCPs
Paste this into Claude Code at the start of any session to auto-load all available skills and MCPs.

---

## PASTE THIS INTO CLAUDE CODE

You are operating inside the Autonomous Coding Dashboard workspace.
Before doing anything else, equip yourself with all available skills and tools by doing the following steps:

### STEP 1 - Read project foundation

Read these files first to understand the workspace:
  cat /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/CLAUDE.md
  cat /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/README.md

### STEP 2 - Discover all skill prompt files

List every skill file available:
  ls /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/prompts/

Then read the ones relevant to your current task. Key skill files:
  AGENTIC_BASE.md               - Core agentic operating principles
  autonomous-acquisition-agent.md - Lead gen + outreach automation
  gtm-engineering-cody-schneider.md - GTM engineering workflows (Cody Schneider)
  sarah-portalcopyco-linkedin-system.md - LinkedIn outreach for Portal Copy Co
  everreach-bulk-fb-ad-generator.md - EverReach Facebook ad generator
  content-factory.md             - Content creation pipeline
  creative-testing-pipeline.md   - Ad creative testing
  cross-system-integration.md    - Cross-platform integration patterns
  actp-worker.md                 - ACTP agent worker system
  aag-agent-*.md (01-10)         - Autonomous acquisition agent swarm
  PRD_GROWTH_DATA_PLANE.md       - Growth data plane architecture

Read any file that matches your task domain with:
  cat /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/prompts/<filename>

### STEP 3 - Discover and load all MCPs

Check which MCP servers are available and running:

Available MCPs in this environment:
  1. safari-automation (port 3100-3107)
     - Instagram DM: port 3100
     - Twitter DM: port 3003
     - TikTok DM: port 3102
     - LinkedIn automation: port 3105
     - Instagram comments: port 3005
     - Twitter comments: port 3007
     - TikTok comments: port 3006
     - Threads comments: port 3004
     - Market research hub: port 3106
     Health check: curl http://localhost:3100/health

  2. supabase-mcp (project: ivhfuhxorppptyuofbgq)
     - Tables: crm_contacts, crm_conversations, crm_message_queue,
       actp_workflow_definitions, actp_workflow_executions,
       actp_agent_audit_log, youtube_video_stats, actp_social_metrics

  3. applescript / macos-automator
     - Run AppleScript and shell commands on the Mac
     - Control Safari, Mail, Messages, Calendar, Finder, Notifications

  4. remotion-documentation
     - Search Remotion video rendering docs
     - Render path: /Users/isaiahdupree/Documents/Software/Remotion/

Start any needed Safari automation services:
  cd "/Users/isaiahdupree/Documents/Software/Safari Automation"
  PORT=3105 npx tsx packages/linkedin-automation/src/api/server.ts &   # LinkedIn
  PORT=3100 npx tsx packages/instagram-dm/src/api/server.ts &          # Instagram DM
  PORT=3003 npx tsx packages/twitter-dm/src/api/server.ts &            # Twitter DM
  PORT=3106 npx tsx packages/market-research/src/api/server.ts &       # Market research

### STEP 4 - Map available automation packages

Safari Automation packages (all in /Users/isaiahdupree/Documents/Software/Safari Automation/packages/):
  linkedin-automation/   - Full prospect pipeline: search, score, connect, DM, follow-up
  instagram-dm/          - Instagram direct messages
  twitter-dm/            - Twitter/X direct messages
  tiktok-dm/             - TikTok direct messages
  instagram-comments/    - Comment on Instagram posts
  twitter-comments/      - Reply to tweets
  tiktok-comments/       - Comment on TikTok videos
  threads-comments/      - Comment on Threads posts
  market-research/       - Competitor research + niche analysis

Key LinkedIn automation functions:
  runProspectingPipeline(config)  - Search + score + send connection requests
  runOutreachCycle(campaignId)    - DMs + follow-ups for accepted connections
  createCampaign(config)          - Create outreach campaign with templates + timing
  getStats(campaignId)            - Connection rate, reply rate, conversion rate
  Import from: dist/automation/outreach-engine.js or prospecting-pipeline.js

### STEP 5 - Load environment config

Read available environment variables (do NOT print secrets):
  cat /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/.env
  cat /Users/isaiahdupree/Documents/Software/Safari Automation/.env 2>/dev/null || echo 'no safari .env'

Key env vars expected across the system:
  SUPABASE_URL / SUPABASE_ANON_KEY   - Supabase CRM + analytics
  CLAUDE_CODE_OAUTH_TOKEN            - Claude API access
  DATABASE_URL                       - Local PostgreSQL (port 5433)
  PERPLEXITY_API_KEY                 - Web research
  PHANTOM_BUSTER_API_KEY             - LinkedIn scraping
  INSTANTLY_API_KEY                  - Cold email campaigns
  FACEBOOK_ADS_API_KEY               - Facebook/Meta ads

### STEP 6 - Confirm readiness

After completing steps 1-5, report back:
  - Which skill files you read
  - Which MCP servers are currently running (health check results)
  - Which env vars are present vs missing
  - What you are now capable of doing
  - What you need from me to proceed

Then wait for my task instruction.

---

## QUICK VERSION (minimal paste)

If you just need Claude Code to self-orient fast, paste this shorter version:

  Read CLAUDE.md and all files in harness/prompts/ at
  /Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/
  then list what MCPs and automation services are available by checking
  /Users/isaiahdupree/Documents/Software/Safari Automation/packages/ and
  running: curl http://localhost:3105/health && curl http://localhost:3106/health
  Report your capabilities, then wait for my task.

---

## SKILL FILE INDEX (what each prompt does)

| File | Skill / Capability |
|------|--------------------|
| AGENTIC_BASE.md | Core operating principles for all agents |
| gtm-engineering-cody-schneider.md | Full GTM stack: LinkedIn, FB ads, email pipelines, agent swarms |
| sarah-portalcopyco-linkedin-system.md | LinkedIn outreach for Portal Copy Co (steps 1-6) |
| everreach-bulk-fb-ad-generator.md | Facebook ad bulk generator for EverReach |
| autonomous-acquisition-agent.md | Autonomous lead acquisition pipeline |
| content-factory.md | Content generation at scale |
| creative-testing-pipeline.md | Ad creative A/B testing pipeline |
| aag-agent-01-foundation.md | Acquisition agent foundation setup |
| aag-agent-02-discovery.md | Lead discovery automation |
| aag-agent-03-scoring.md | Lead scoring system |
| aag-agent-04-warmup.md | Relationship warmup sequences |
| aag-agent-05-outreach.md | Outreach message sending |
| aag-agent-06-followup.md | Follow-up sequence automation |
| aag-agent-07-orchestrator.md | Multi-agent orchestration |
| aag-agent-08-email.md | Email automation |
| aag-agent-09-entity-resolution.md | Contact deduplication + enrichment |
| aag-agent-10-reporting.md | Analytics + reporting |
| actp-worker.md | ACTP agent worker system |
| cross-system-integration.md | Cross-platform integration |
| PRD_GROWTH_DATA_PLANE.md | Growth data architecture PRD |
