# LinkedIn DM Intelligence: Score + Reply + Sync to Supabase
Uses: LinkedIn automation (port 3105) + supabase-mcp + Claude Haiku for scoring
For: Portal Copy Co / Sarah Ashley outreach pipeline

---

## PASTE THIS INTO CLAUDE CODE

You are my LinkedIn DM intelligence agent for Portal Copy Co.

SCORING RUBRIC (1-10):
  Relevance(0-3) + Personalization(0-3) + CTA clarity(0-2) + Tone(0-2)
  8-10 = HOT: reply within 24h, move toward proposal
  5-7  = WARM: follow up in 3 days, send value asset
  1-4  = COLD: nurture only

---

### STEP 1 - Start LinkedIn server

curl http://localhost:3105/health
# If not running:
# cd /Users/isaiahdupree/Documents/Software/Safari Automation
# PORT=3105 npx tsx packages/linkedin-automation/src/api/server.ts &

---

### STEP 2 - Read all prospect DM conversations

Write to /tmp/read-prospects.ts and run: npx tsx /tmp/read-prospects.ts

```typescript')
a('import { getProspects, getStats } from')
a('  "/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/dist/automation/outreach-engine.js";')
a('')
a('const active = getProspects({ stage: ["connected","first_dm_sent","replied","follow_up_1","follow_up_2","engaged"] });')
a('const pending = getProspects({ stage: ["connection_sent"] });')
a('const stats = getStats();')
a('console.log("STATS:", JSON.stringify(stats, null, 2));')
a('console.log("ACTIVE:", active.length, JSON.stringify(active, null, 2));')
a('console.log("PENDING:", pending.length);')
a('```

---

### STEP 3 - Score each conversation with Claude Haiku

Write to /tmp/score-prospects.ts and run: npx tsx /tmp/score-prospects.ts

```typescript')
a('import { getProspects, addProspectNote, tagProspect } from')
a('  "/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/dist/automation/outreach-engine.js";')
a('import Anthropic from "@anthropic-ai/sdk";')
a('')
a('const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });')
a('const prospects = getProspects({ stage: ["connected","first_dm_sent","replied","follow_up_1","follow_up_2","engaged"] });')
a('')
a('for (const p of prospects) {')
a('  const sent = p.messagesSent.map(m => `SENT(${m.stage}): ${m.text}`).join("
");')
a('  const recv = p.messagesReceived.map(m => `REPLY: ${m.text}`).join("
");')
a('  const resp = await ai.messages.create({')
a('    model: "claude-3-haiku-20240307", max_tokens: 300,')
a('    messages: [{ role: "user", content:')
a('      `Score this LinkedIn outreach 1-10 for Portal Copy Co (copywriting services).
')
a('       Prospect: ${p.name}, ${p.headline}, ${p.location}
')
a('       Stage: ${p.stage}
')
a('       Sent:
${sent || "none"}
')
a('       Replies:
${recv || "none"}
')
a('       Scoring: Relevance(0-3)+Personalization(0-3)+CTA(0-2)+Tone(0-2)
')
a('       Return JSON only: {score,heat,relevance,personalization,cta,tone,reply_sentiment,next_action}` }]')
a('  });')
a('  const raw = resp.content[0].type==="text" ? resp.content[0].text : "{}";')
a('  const s = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");')
a('  addProspectNote(p.id, `SCORE:${s.score}/10 HEAT:${s.heat} | ${s.next_action}`);')
a('  if (s.heat==="HOT") tagProspect(p.id, "hot-lead");')
a('  if (s.heat==="WARM") tagProspect(p.id, "warm-lead");')
a('  console.log(p.name, "->", s.heat, s.score+"/10", "|", s.next_action);')
a('}')
a('```

---

### STEP 4 - Generate reply suggestions for HOT and WARM leads

Write to /tmp/generate-replies.ts and run: npx tsx /tmp/generate-replies.ts

```typescript')
a('import { getProspects } from')
a('  "/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/dist/automation/outreach-engine.js";')
a('import Anthropic from "@anthropic-ai/sdk"; import fs from "fs";')
a('')
a('const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });')
a('const leads = getProspects().filter(p => p.tags.includes("hot-lead") || p.tags.includes("warm-lead"));')
a('const out: any[] = [];')
a('')
a('for (const p of leads) {')
a('  const lastSent = p.messagesSent.at(-1)?.text ?? "none";')
a('  const lastReply = p.messagesReceived.at(-1)?.text ?? "no reply yet";')
a('  const res = await ai.messages.create({')
a('    model: "claude-3-haiku-20240307", max_tokens: 400,')
a('    messages: [{ role: "user", content:')
a('      `Write 2 LinkedIn reply options for Sarah Ashley (Portal Copy Co, copywriter).
')
a('       Prospect: ${p.name} (${p.headline}, ${p.location})
')
a('       Last Sarah sent: ${lastSent}
')
a('       Their reply: ${lastReply}
')
a('       Option A: move toward a discovery call (warm, curious, zero pressure, max 3 sentences)
')
a('       Option B: send a value asset (offer free brand voice checklist, max 2 sentences)
')
a('       Return JSON: {option_a, option_b, recommended}` }]')
a('  });')
a('  const raw = res.content[0].type==="text" ? res.content[0].text : "{}";')
a('  const r = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");')
a('  out.push({ id: p.id, name: p.name, stage: p.stage, heat: p.tags.join(","), ...r });')
a('  console.log(`--- ${p.name} (${p.tags}) ---`);')
a('  console.log("A:", r.option_a); console.log("B:", r.option_b);')
a('}')
a('fs.writeFileSync("/tmp/reply-suggestions.json", JSON.stringify(out, null, 2));')
a('```

---

### STEP 5 - Sync everything to Supabase CRM

Write to /tmp/sync-to-supabase.ts and run: npx tsx /tmp/sync-to-supabase.ts

```typescript')
a('import { getProspects } from')
a('  "/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/dist/automation/outreach-engine.js";')
a('import { createClient } from "@supabase/supabase-js"; import fs from "fs";')
a('')
a('const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);')
a('const prospects = getProspects();')
a('const replies: any[] = JSON.parse(fs.readFileSync("/tmp/reply-suggestions.json","utf8"));')
a('')
a('for (const p of prospects) {')
a('  // 1. Upsert contact')
a('  const { data: contact } = await sb.from("crm_contacts").upsert({')
a('    name: p.name, linkedin_url: p.profileUrl, title: p.headline,')
a('    location: p.location, tags: p.tags, notes: p.notes,')
a('    lead_score: p.score, stage: p.stage, platform: "linkedin",')
a('    last_contacted_at: p.lastMessageSentAt, next_followup_at: p.nextFollowUpAt')
a('  }, { onConflict: "linkedin_url" }).select().single();')
a('  if (!contact) continue;')
a('')
a('  // 2. Upsert conversation state')
a('  await sb.from("crm_conversations").upsert({')
a('    contact_id: contact.id, platform: "linkedin", stage: p.stage,')
a('    last_message_sent: p.messagesSent.at(-1)?.text ?? null,')
a('    last_message_sent_at: p.lastMessageSentAt,')
a('    last_reply_received: p.messagesReceived.at(-1)?.text ?? null,')
a('    last_reply_at: p.lastReplyAt, follow_up_count: p.followUpCount')
a('  }, { onConflict: "contact_id,platform" });')
a('')
a('  // 3. Queue next follow-up with AI-generated reply pre-written')
a('  if (p.nextFollowUpAt && new Date(p.nextFollowUpAt) > new Date()) {')
a('    const r = replies.find((x: any) => x.id === p.id);')
a('    await sb.from("crm_message_queue").upsert({')
a('      contact_id: contact.id, platform: "linkedin", status: "pending",')
a('      send_at: p.nextFollowUpAt,')
a('      message_text: r?.option_a ?? null,')
a('      message_text_b: r?.option_b ?? null,')
a('      recommended_option: r?.recommended ?? "option_a",')
a('      campaign: p.campaign')
a('    }, { onConflict: "contact_id,platform,send_at" });')
a('  }')
a('  console.log("Synced:", p.name, p.stage, p.tags.join(","));')
a('}')
a('console.log("All synced to Supabase.");')
a('```

---

### STEP 6 - Verify in Supabase (run via supabase-mcp or SQL)

SELECT c.name, c.stage, c.lead_score, c.tags,
       cv.last_message_sent, cv.last_reply_received,
       mq.send_at, mq.status, mq.recommended_option, mq.message_text
FROM crm_contacts c
LEFT JOIN crm_conversations cv ON cv.contact_id = c.id AND cv.platform = linkedin
LEFT JOIN crm_message_queue mq ON mq.contact_id = c.id AND mq.status = pending
WHERE c.platform = linkedin
ORDER BY c.lead_score DESC, mq.send_at ASC;

---

## DATA FLOW

LinkedIn automation (~/.linkedin-outreach/prospects.json)
  -> Step 2: getProspects() reads all DM state
  -> Step 3: Claude Haiku scores each message 1-10 + tags HOT/WARM/COLD
  -> Step 4: Claude Haiku writes 2 reply options per HOT/WARM lead
  -> Step 5: Supabase upsert -> crm_contacts + crm_conversations + crm_message_queue
  -> Step 6: Query DB to see ranked leads + scheduled replies

## WHAT THE DB ENABLES AFTER SYNC

  - Dashboard: all leads ranked by score, stage, next action date
  - Queue worker: poll crm_message_queue for send_at <= NOW(), auto-send via port 3105
  - Sarah reviews pre-written reply A or B before approving send
  - Analytics: connection rate, reply rate, conversion over time

## ENV VARS NEEDED

  ANTHROPIC_API_KEY  - scoring + reply generation (Claude Haiku, cheap)
  SUPABASE_URL       - project ivhfuhxorppptyuofbgq
  SUPABASE_ANON_KEY  - from Supabase dashboard