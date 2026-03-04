# TikTok MCP Server: 7 Improvements
Target: /Users/isaiahdupree/Documents/Software/Safari Automation/packages/tiktok-dm/
After EACH feature: npx tsc --noEmit. At end: npm run build + git commit.

Key files: src/api/server.ts, src/api/mcp-server.ts (DM port 3102), src/automation/
Comments service: packages/tiktok-comments/ (port 3006)

## TK-001: Add GET /api/tiktok/conversations/unread + tiktok_get_unread MCP tool
JS selectors: document.querySelectorAll('[data-e2e="message-item"] [class*="unread"], [class*="badge"]')
Return: {count:number, conversations:[{username, preview}]}
Add tool: {name:'tiktok_get_unread', description:'List unread TikTok DM conversations.', inputSchema:{type:'object',properties:{}}}
Add to executeTool: case 'tiktok_get_unread': result = await api(DM_BASE,'GET','/api/tiktok/conversations/unread'); break;

## TK-002: Add POST /api/tiktok/ai/generate + tiktok_ai_generate_dm MCP tool
Use OpenAI gpt-4o-mini (OPENAI_API_KEY from env, non-fatal if absent).
Prompt: 'Write a short TikTok DM to @{username} for: {purpose}. Topic: {topic}. Max 500 chars. Casual, energetic tone.'
Returns: {success:true, message:string, username, purpose}
Add to mcp-server.ts TOOLS + executeTool switch.

## TK-003: Rate-limit UI detection before sends
Add detectTikTokRateLimit(driver):
  Check document.body.innerText for 'You are visiting too fast','temporarily blocked','captcha','verify you are human'
  Also check: !!document.querySelector('[class*="captcha"], [id*="captcha"]')
Call before sendMessage(). Return {success:false, rateLimited:true, error:'TikTok rate limited'} if detected.
Expose: GET /api/tiktok/rate-status -> {limited:bool, captcha:bool}

## TK-004: Add GET /api/tiktok/profile/:username + tiktok_get_profile MCP tool
Navigate to tiktok.com/@{username}, extract:
  displayName: document.querySelector('[data-e2e="user-title"]')?.innerText
  bio: document.querySelector('[data-e2e="user-bio"]')?.innerText
  followers: document.querySelector('[data-e2e="followers-count"]')?.innerText
  following: document.querySelector('[data-e2e="following-count"]')?.innerText
  likes: document.querySelector('[data-e2e="likes-count"]')?.innerText
  verified: !!document.querySelector('[data-e2e="check-circle-filled"]')
Returns: {username, displayName, bio, followers, following, likes, verified}
Add tiktok_get_profile MCP tool.

## TK-005: Add trending videos endpoint via comments service (port 3006)
Add to tiktok-comments server:
  GET /api/tiktok/trending?limit=20
  Navigate to tiktok.com/foryou or tiktok.com/explore, extract video cards:
    {author, description, likes, comments, shares, views, videoUrl}
  Return: {videos:[...], count}
Add to mcp-server.ts:
  {name:'tiktok_get_trending', description:'Get trending TikTok videos from For You page.', inputSchema:{type:'object',properties:{limit:{type:'number',default:20}}}}
  case 'tiktok_get_trending': result = await api(COMMENTS_BASE,'GET','/api/tiktok/trending?limit='+(args.limit??20)); break;

## TK-006: Supabase CRM logging for DM sends
Optional SUPABASE_URL + SUPABASE_ANON_KEY env vars (dotenv, non-fatal).
After successful DM send: fire-and-forget POST to /rest/v1/crm_messages
{platform:'tiktok', to_user:username, content:text, sent_at:new Date().toISOString(), status:'sent'}

## TK-007: Add force flag to bypass active-hours on send
Add force?:boolean to POST /api/tiktok/messages/send-to body.
In active-hours check: if (body.force === true) skip, log [FORCE] bypass warning.
Update tiktok_send_dm MCP tool inputSchema to include force:boolean.

## BUILD
cd target && npx tsc --noEmit && npm run build
PORT=3102 npx tsx src/api/server.ts &
sleep 2 && curl http://localhost:3102/api/tiktok/rate-status
