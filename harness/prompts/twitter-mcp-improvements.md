# Twitter/X MCP Server: 7 Improvements
Target: /Users/isaiahdupree/Documents/Software/Safari Automation/packages/twitter-dm/
After EACH feature: npx tsc --noEmit. At end: npm run build + git commit.

Key files: src/api/server.ts, src/api/mcp-server.ts (DM port 3003), src/automation/ (twitter-driver.ts or safari-driver.ts)
Comments service: packages/twitter-comments/ (port 3007)

## TW-001: Add POST /api/ai/generate + twitter_ai_generate_dm MCP tool
No AI DM generation exists at all. Add:
  POST /api/twitter/ai/generate {username, purpose, topic?}
  Use OpenAI gpt-4o-mini (OPENAI_API_KEY from env, non-fatal if missing).
  Prompt: 'Write a short, natural Twitter DM to @{username} for purpose: {purpose}. Topic: {topic}. Max 300 chars.'
  Returns: {success:true, message:string, username, purpose}
Add to mcp-server.ts TOOLS + executeTool.

## TW-002: Add rate-limit / suspension UI detection
Add detectTwitterRateLimit(driver): check document.body.innerText for
  'rate limit','suspended','temporarily locked','unusual login activity'
Call before send operations. Return {success:false, rateLimited:true, error:string} if detected.
Also expose: GET /api/twitter/rate-status -> {limited:bool, suspended:bool, message:string}

## TW-003: Add conversation search GET /api/twitter/conversations/search
Query param: ?q=username_or_keyword
JS: find search input in DM inbox (data-testid=SearchBox_Search_Input),
  type query, wait 800ms, extract matching conversations.
Returns {conversations:[{username,preview,unread}]}
Add twitter_search_conversations MCP tool.

## TW-004: Add tweet engagement tools (like, retweet, bookmark)
Add to comments server (port 3007):
  POST /api/twitter/tweet/like   {tweetUrl}
  POST /api/twitter/tweet/retweet {tweetUrl}
  POST /api/twitter/tweet/bookmark {tweetUrl}
  GET  /api/twitter/tweet/metrics {tweetUrl} -> {likes,retweets,views,bookmarks,replies}
Selectors: [data-testid=like], [data-testid=retweet], [data-testid=Bookmark]
Add 4 MCP tools: twitter_like_tweet, twitter_retweet, twitter_bookmark_tweet, twitter_get_tweet_metrics.

## TW-005: Add Supabase CRM logging for DM sends
Optional SUPABASE_URL + SUPABASE_ANON_KEY env vars (dotenv, non-fatal if absent).
After successful DM send: fire-and-forget POST to Supabase /rest/v1/crm_messages
{platform:'twitter', to_user:username, content:text, sent_at:new Date().toISOString(), status:'sent'}

## TW-006: Add GET /api/twitter/profile/:handle endpoint + MCP tool
Navigate to x.com/:handle, extract:
  displayName: document.querySelector('[data-testid=UserName] span')?.innerText
  bio: document.querySelector('[data-testid=UserDescription]')?.innerText
  followers: document.querySelector('[href*=followers] span')?.innerText
  following: document.querySelector('[href*=following] span')?.innerText
  verified: !!document.querySelector('[data-testid=icon-verified]')
Returns: {handle, displayName, bio, followers, following, verified}
Add twitter_get_profile MCP tool.

## TW-007: Add force flag to bypass active-hours check on send endpoints
Add force?:boolean to POST /api/twitter/messages/send-to body.
In active-hours check: if (body.force) skip enforcement, log [FORCE] warning.
Update twitter_send_dm MCP tool inputSchema to include force:boolean field.

## BUILD
cd target && npx tsc --noEmit && npm run build
PORT=3003 npx tsx src/api/server.ts &
sleep 2 && curl http://localhost:3003/api/twitter/rate-status
