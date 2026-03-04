# Instagram MCP Server: 8 Improvements
Target: /Users/isaiahdupree/Documents/Software/Safari Automation/packages/instagram-dm/
After EACH feature: npx tsc --noEmit. At end: npm run build + git commit.

Key files: src/api/server.ts, src/api/mcp-server.ts, src/automation/dm-operations.ts

## IG-001: Expose AI DM endpoint POST /api/ai/generate
generateAIDM() exists but has no route. Add: POST /api/ai/generate {username, purpose, topic?} -> calls it.
Add to mcp-server.ts TOOLS: already exists as instagram_ai_generate_dm - verify route works.

## IG-002: Add GET /api/conversations/unread + instagram_get_unread MCP tool
JS: document.querySelectorAll('[class*="unread"], [class*="badge"]').length
Returns {count, conversations:[{username,preview}]}
Add tool to TOOLS array + executeTool switch in mcp-server.ts.

## IG-003: Add message timestamps to readMessages()
In message extraction JS add: msg.querySelector('time')?.getAttribute('datetime') || msg.querySelector('[class*="timestamp"]')?.innerText
Return as sentAt field on each message object.

## IG-004: Rate-limit UI detection before sends
Add detectRateLimitBanner(driver): check document.body.innerText for 'Action Blocked','try again later','temporarily blocked'.
Call before sendMessage(). If true return {success:false,rateLimited:true,error:'Instagram action blocked'}.

## IG-005: Accept/decline message requests
Add POST /api/requests/:username/accept and /decline
Navigate to requests tab, find conversation, click Accept/Decline button.
Add instagram_accept_request + instagram_decline_request MCP tools.

## IG-006: Conversation scroll/pagination
Add ?scrollMore=true to GET /api/conversations
Scroll list 600px, wait 600ms, re-extract, repeat up to 3x. Return deduplicated results.

## IG-007: Supabase CRM logging for DM sends
Optional SUPABASE_URL + SUPABASE_ANON_KEY env vars.
After successful send: fire-and-forget POST to /rest/v1/crm_messages
{platform:'instagram', to_user, content, sent_at, status:'sent'}

## IG-008: GET /api/profile/:username + instagram_get_profile MCP tool
Navigate to instagram.com/:username, extract: displayName, bio, followers, following, posts, verified.
Selectors: h2 (name), li stats row (counts), [aria-label*=Verified] (badge).

## BUILD
cd 'target dir' && npx tsc --noEmit && npm run build
PORT=3100 npx tsx src/api/server.ts &
sleep 2 && curl http://localhost:3100/api/conversations/unread
