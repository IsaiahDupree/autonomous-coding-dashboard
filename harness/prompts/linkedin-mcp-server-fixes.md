# LinkedIn MCP Server: 6 Critical Fixes
ACD task: implement all improvements to the LinkedIn automation Safari MCP server.
Target: /Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation/

---

## PASTE THIS INTO CLAUDE CODE

You are implementing 6 bug fixes to the LinkedIn automation MCP server.
Work through each fix in order. After each: npx tsc --noEmit (must be clean before next fix).

Find key files first:
  find src -name '*.ts' | xargs grep -l 'clickAtViewportPosition'
  find src -name '*.ts' | xargs grep -l 'sendMessageToProfile'
  find src -name '*.ts' | xargs grep -rn 'await wait('

---

## FIX 1 -- Expose native click + screenshot endpoints (UNBLOCKS EVERYTHING)

Root cause of all send failures: clickAtViewportPosition() exists in SafariDriver
but is NEVER exposed via REST API. JS element.click() / dispatchEvent do NOT trigger
LinkedIn SPA routing. Only native AppleScript clicks work.

Add to server.ts:

  POST /api/linkedin/debug/click
    Body: { x: number, y: number }
    Action: await driver.clickAtViewportPosition(x, y)
    Returns: { success: true, x, y, timestamp }

  GET /api/linkedin/debug/screenshot
    Action: await driver.takeScreenshot()
    Returns: { success: true, imageBase64: string }

---

## FIX 2 -- sendMessageToProfile: keep interop=msgOverlay, use native click

Problem: code strips interop=msgOverlay from compose URL.
  /messaging/compose/?profileUrn=... (no interop) -> LinkedIn redirects to home.
  The overlay URL is the ONLY path that works inside the SPA.

Find: grep -rn 'sendMessageToProfile' src/

Replace broken navigate-to-compose with:
  1. Navigate to prospect profile page (linkedin.com/in/username)
  2. waitForCondition: document.querySelector('main') is present (10s)
  3. Find Message anchor: document.querySelector('a[href*=interop=msgOverlay]')
  4. Get bounding rect, clickAtViewportPosition(rect.x + rect.width/2, rect.y + rect.height/2)
  5. waitForCondition: document.querySelector('.msg-form__contenteditable') visible (8s)
  6. Type message + send

---

## FIX 3 -- Remove broken section scoping from compose DOM search

Problem: querySelector('section') returns null on 2026 LinkedIn (obfuscated class divs).

Find: grep -rn 'querySelector.*section' src/

Replace:
  OLD: var scope = m.querySelector('section') || m;
  NEW: var scope = document;

Update compose anchor to document-scoped multi-selector:
  OLD: scope.querySelector('a[href*=msgOverlay]')
  NEW: document.querySelector('a[href*=msgOverlay], button[aria-label*=Message], a[data-control-name*=message]')

---

## FIX 4 -- Add new-message compose flow for first-contact DMs

Problem: openConversation() only finds existing threads in .msg-conversation-listitem.
No path for first-contact DMs to people not yet in message history.

Add: openNewCompose(recipientName: string, message: string): Promise<void>

Flow:
  1. Navigate to linkedin.com/messaging/
  2. waitForCondition: '.msg-overlay-list-bubble' or '.scaffold-layout__aside' present
  3. Find compose button: document.querySelector('[data-control-name=compose], button[aria-label*=Compose]')
  4. clickAtViewportPosition() on compose button
  5. waitForCondition: '.msg-connections-typeahead__search-field' appears
  6. Type recipient name character by character (simulate typing, NOT element.value = x)
  7. waitForCondition: '.msg-connections-typeahead__result-item' dropdown appears
  8. clickAtViewportPosition() on first matching suggestion
  9. waitForCondition: '.msg-form__contenteditable' appears
  10. Type message + send

Expose as:
  POST /api/linkedin/messages/new-compose
  Body: { recipientName: string, message: string, force?: boolean, dryRun?: boolean }
  Returns: { success: boolean, recipientName, messageSent }

---

## FIX 5 -- Replace all wait(N) with waitForCondition()

Problem: wait(3000) is unreliable -- LinkedIn loads anywhere from 800ms to 8000ms.

Find all: grep -rn 'await wait(' src/

If waitForCondition does not exist, add to SafariDriver:

  async waitForCondition(
    conditionFn: () => boolean,
    timeoutMs = 8000,
    intervalMs = 300
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await this.execute(conditionFn);
      if (result) return;
      await this.wait(intervalMs);
    }
    throw new Error(`waitForCondition timed out after ${timeoutMs}ms`);
  }

Replace each wait(N) with:
  After profile nav:   waitForCondition(() => !!document.querySelector('main h1, .pv-top-card'), 10000)
  After messaging nav: waitForCondition(() => !!document.querySelector('.msg-overlay-list-bubble'), 10000)
  After Message click: waitForCondition(() => !!document.querySelector('.msg-form__contenteditable'), 8000)
  Generic page load:   waitForCondition(() => document.readyState === 'complete', 8000)

---

## FIX 6 -- Add force: true flag to bypass active-hours check

Problem: active-hours check (9am-9pm) blocks all dev/test sends with no override.

Find: grep -rn 'activeHours\|getHours\|active_hours' src/

Add force?: boolean to body of these endpoints:
  POST /api/linkedin/messages/send-to
  POST /api/linkedin/messages/new-compose
  POST /api/linkedin/connect

In the active-hours check:
  if (options?.force === true) {
    console.warn('[FORCE] Bypassing active-hours check');
  } else {
    // existing active-hours enforcement
  }

---

## FIX 7 (BONUS) -- navigateViaGoogle() anti-bot helper

Problem: direct navigation to linkedin.com/in/X sometimes triggers bot detection.
Navigating via Google search result bypasses this edge case.

Add to SafariDriver or new linkedin-navigator.ts:

  async navigateViaGoogle(linkedinProfileUrl: string): Promise<void> {
    const slug = linkedinProfileUrl.split('/in/')[1]?.replace('/', '') ?? '';
    const q = encodeURIComponent('site:linkedin.com/in ' + slug);
    await this.navigateTo('https://www.google.com/search?q=' + q);
    await this.waitForCondition(() => !!document.querySelector('#search'), 8000);
    const coords = await this.execute(() => {
      const link = document.querySelector("a[href*='linkedin.com/in']") as HTMLElement;
      if (!link) return null;
      const r = link.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!coords) throw new Error('No LinkedIn result found on Google');
    await this.clickAtViewportPosition(coords.x, coords.y);
    await this.waitForCondition(() => location.hostname.includes('linkedin.com'), 10000);
  }

Expose as:
  POST /api/linkedin/navigate/via-google
  Body: { profileUrl: string }

---

## BUILD + TEST ALL FIXES

  cd "/Users/isaiahdupree/Documents/Software/Safari Automation/packages/linkedin-automation"
  npx tsc --noEmit
  npm run build
  PORT=3105 npx tsx src/api/server.ts &

  # Test Fix 1: native click
  curl -X POST http://localhost:3105/api/linkedin/debug/click -H 'Content-Type: application/json' -d '{"x":500,"y":300}'

  # Test Fix 1b: screenshot
  curl http://localhost:3105/api/linkedin/debug/screenshot | jq .success

  # Test Fix 4: new compose dry run
  curl -X POST http://localhost:3105/api/linkedin/messages/new-compose -H 'Content-Type: application/json' -d '{"recipientName":"Isaiah Dupree","message":"test","force":true,"dryRun":true}'

  # Test Fix 6: force flag bypass
  curl -X POST http://localhost:3105/api/linkedin/messages/send-to -H 'Content-Type: application/json' -d '{"profileUrl":"https://linkedin.com/in/test","message":"test","force":true,"dryRun":true}'

---

## FILES TO MODIFY (summary)

  src/api/server.ts
    + POST /api/linkedin/debug/click
    + GET  /api/linkedin/debug/screenshot
    + POST /api/linkedin/messages/new-compose
    + POST /api/linkedin/navigate/via-google
    ~ All send/connect endpoints: add force?: boolean

  src/browser/safari-driver.ts
    + waitForCondition(conditionFn, timeoutMs, intervalMs)
    + navigateViaGoogle(linkedinProfileUrl)
    ~ Replace all wait(N) with waitForCondition()

  src/automation/outreach-engine.ts (or messaging file)
    ~ Fix sendMessageToProfile: native click + interop=msgOverlay flow
    ~ Remove section scoping, use document-scoped selectors
    + openNewCompose(recipientName, message)

Commit:
  git add -A && git commit -m "fix: 6 LinkedIn MCP improvements - native click API, overlay DM, first-contact compose, waitForCondition, force flag, Google nav"