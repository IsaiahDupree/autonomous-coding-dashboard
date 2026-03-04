# Portal Copy Co LinkedIn Outreach System
LinkedIn automation: /Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/
Server: port 3105 | State: ~/.linkedin-outreach/

## CONTEXT (paste at session start)

Business: Sarah E. Ashley, Portal Copy Co - story-driven copywriting for founders/coaches
Location: Melbourne FL | portalcopyco.com
ICP: coaches, founders, consultants, e-commerce owners (priority: Florida)

Connection note: Hi {{firstName}}, I'm Sarah - a story-driven copywriter at Portal Copy Co. I help founders & coaches bring their brand to life with copy that connects. Would love to connect! (191 chars)

First DM (day 1): Hey {{firstName}}! Thanks for connecting. What's the biggest thing you're working on communicating to your audience right now?
Follow-up 1 (day 5): Hi {{firstName}}, just following up! Happy to share copy ideas for your brand.
Follow-up 2 (day 12): {{firstName}}, I give away a free brand voice checklist - want me to send it?
Follow-up 3 (day 21): {{firstName}} - if you ever need a copywriter who gets the founder brand voice: portalcopyco.com. Take care!

Scoring (1-10): Relevance(0-3) + Personalization(0-3) + CTA clarity(0-2) + Tone(0-2)

---

## STEP 1 - Health check

curl http://localhost:3105/health
# If not running:
cd "/Users/isaiahdupree/Documents/Software/Safari Automation"
PORT=3105 npx tsx packages/linkedin-automation/src/api/server.ts &

---

## STEP 2 - Create campaign

Write to /tmp/portal-campaign.ts and run: npx tsx /tmp/portal-campaign.ts

import { createCampaign } from '/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/dist/automation/outreach-engine.js';
const c = createCampaign({
  name: 'Portal Copy Co ICP Outreach',
  offer: 'Story-driven copywriting for founders and coaches',
  search: { keywords: 'founder coach consultant personal brand', location: 'United States', connectionDegree: '2nd' },
  targetTitles: ['Founder','CEO','Owner','Business Coach','Life Coach','Executive Coach','Head of Marketing','Consultant'],
  targetLocations: ['Florida','United States'],
  minScore: 5,
  templates: {
    connectionNote: 'Hi {{firstName}}, I am Sarah from Portal Copy Co. I help founders & coaches bring their brand to life with compelling copy. Would love to connect!',
    firstDm: 'Hey {{firstName}}! Thanks for connecting. What is the biggest thing you are working on communicating to your audience right now?',
    followUp1: 'Hi {{firstName}}, just following up! Happy to share copy ideas for your brand if useful.',
    followUp2: '{{firstName}}, I give away a free brand voice checklist - want me to send it?',
    followUp3: '{{firstName}} - if you ever need a copywriter who gets the founder brand voice: portalcopyco.com. Take care!'
  },
  timing: { afterConnectedHours: 24, followUp1Hours: 120, followUp2Hours: 288, followUp3Hours: 504, giveUpAfterHours: 720 },
  maxProspectsPerRun: 20
});
console.log('Campaign ID:', c.id);

---

## STEP 3 - Run prospecting pipeline (search + score + send connection requests)

Write to /tmp/portal-prospect.ts and run: npx tsx /tmp/portal-prospect.ts

import { runProspectingPipeline } from '/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/dist/automation/prospecting-pipeline.js';
const result = await runProspectingPipeline({
  search: { keywords: 'business coach founder consultant Florida', location: 'United States', connectionDegree: '2nd' },
  scoring: { targetTitles: ['Founder','CEO','Owner','Coach','Consultant','Head of Marketing'], targetCompanies: [], targetLocations: ['Florida','United States'], minScore: 5 },
  connection: { sendRequest: true, noteTemplate: 'Hi {{firstName}}, I am Sarah from Portal Copy Co. I help founders & coaches bring their brand to life with compelling copy. Would love to connect!', skipIfConnected: true, skipIfPending: true },
  dm: { enabled: false, messageTemplate: '', onlyIfConnected: true },
  maxProspects: 20, dryRun: false, delayBetweenActions: 3000
});
console.log(JSON.stringify(result.summary, null, 2));

---

## STEP 4 - Run outreach cycle (DMs + follow-ups for accepted connections)

Replace CAMPAIGN_ID with ID from Step 2. Write to /tmp/portal-outreach.ts, run: npx tsx /tmp/portal-outreach.ts

import { runOutreachCycle } from '/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/dist/automation/outreach-engine.js';
const result = await runOutreachCycle('CAMPAIGN_ID', { dryRun: false });
console.log(JSON.stringify(result.summary, null, 2));
result.actions.forEach(a => console.log(a.timestamp, a.prospectName, a.action, a.success ? 'OK' : 'FAIL'));

---

## STEP 5 - Build tracking dashboard

Build React + Vite + Tailwind dashboard at localhost:4000 showing:
- All prospects with stage (discovered/connection_sent/connected/first_dm_sent/replied/converted)
- Message score 1-10 per prospect (Relevance + Personalization + CTA + Tone)
- Days until next follow-up action per prospect
- Stats panel: connection rate / reply rate / conversion rate
- Filter by stage, score, location
- Run outreach cycle button calling port 3105 REST API

Data: ~/.linkedin-outreach/ JSON files via Express proxy on port 4001
Output: /Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/dashboard/

---

## STEP 6 - Sync to Supabase CRM

After each run, sync all prospects to Supabase CRM (project: ivhfuhxorppptyuofbgq):
- crm_contacts: upsert name, linkedin_url, title, company, location, tags, notes
- crm_conversations: platform=linkedin, contact_id, last_message, stage
- crm_message_queue: schedule follow-ups as pending items with send_at timestamps

Read from: ~/.linkedin-outreach/prospects.json
Env vars needed: SUPABASE_URL + SUPABASE_ANON_KEY from .env
