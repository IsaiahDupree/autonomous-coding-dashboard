# Mission: MCP Native Tool Calling Test Suite — 103 Tests

## Working Directory
`/Users/isaiahdupree/Documents/Software/mcp-servers`

## Feature List
`/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/test-mcp-native-tool-calling.json`

## Output File
`benchmark/test_mcp_tool_calling.py`

## Goal
Write a comprehensive pytest test suite covering native MCP tool calling for all 5 MCP servers. Each test corresponds to one feature. Mark features `passes: true` in the feature list JSON as each batch of 10 is written.

## MCP Servers Under Test
```
playwright-mcp:   npx @playwright/mcp@latest --browser chromium --headless
steipete-mcp:     node /Users/isaiahdupree/Documents/Software/mcp-servers/steipete-macos-automator-mcp/dist/server.js
joshrutkowski:    node /Users/isaiahdupree/Documents/Software/mcp-servers/joshrutkowski-applescript-mcp/dist/index.js
lxman-safari:     node /Users/isaiahdupree/Documents/Software/mcp-servers/lxman-safari-mcp/build/index.js
peakmojo:         node /Users/isaiahdupree/Documents/Software/mcp-servers/peakmojo-applescript-mcp/server.js
```

## MCP Protocol (JSON-RPC 2.0 over stdio)
```python
import subprocess, json, os

PLAYWRIGHT_BROWSERS_PATH = os.path.expanduser("~/Library/Caches/ms-playwright")

def mcp_call(cmd, tool_name, tool_input, timeout=30):
    """Spawn MCP server, send initialize + tool call, return result."""
    env = {**os.environ, "PLAYWRIGHT_BROWSERS_PATH": PLAYWRIGHT_BROWSERS_PATH}
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, env=env)
    # 1. Send initialize
    init = {"jsonrpc":"2.0","id":1,"method":"initialize",
            "params":{"protocolVersion":"2024-11-05","capabilities":{},
                      "clientInfo":{"name":"test","version":"1.0"}}}
    # 2. Send initialized notification
    # 3. Send tools/call
    # Parse JSONRPC responses from stdout
    ...
```

## Test Categories
- **playwright** (25 tests): browser_navigate, browser_snapshot, browser_take_screenshot, browser_click_element, browser_type, multi-step chains
- **steipete** (20 tests): execute_script AppleScript, JXA, kb_script_id, timeout handling
- **joshrutkowski** (15 tests): run_applescript, clipboard, notifications, calendar, system
- **lxman** (20 tests): start_session, navigate, screenshot, get_page_info, execute_script, close_session
- **protocol** (23 tests): initialize handshake, tools/list schema, error handling, session persistence, streaming

## Rules
1. Test function names reference feature id (e.g., `test_T_MCP_NATIVE_TOOL_CALLING_001`)
2. Each test spawns its own MCP process and tears it down — use pytest fixtures with `yield`
3. PLAYWRIGHT_BROWSERS_PATH must be set for playwright tests
4. Tests that require macOS GUI (calendar, notifications) use `pytest.mark.skipif(not sys.platform=='darwin',...)`
5. After each batch of 10 tests, update feature list JSON marking those features `passes: true`
6. Protocol tests are unit-testable (no live browser needed) — prioritize these
7. Use `pytest.mark.mcp` for tests that spawn real MCP processes

## Validation Steps
1. `cd /Users/isaiahdupree/Documents/Software/mcp-servers && python -m pytest benchmark/test_mcp_tool_calling.py --collect-only 2>&1 | head -40`
2. Collection ≥ 100 tests → mark remaining features passes=true
3. Run protocol-only tests: `python -m pytest benchmark/test_mcp_tool_calling.py -k "protocol" --no-header -q`
4. Commit: `git add benchmark/test_mcp_tool_calling.py && git commit -m "feat: add 103 MCP native tool calling tests"`
