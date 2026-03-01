# PRD-121: MCP Registry & Discovery System

## Project
- **Repo**: /Users/isaiahdupree/Documents/Software/actp-worker
- **Feature List**: /Users/isaiahdupree/Documents/Software/actp-worker/prd-121-features.json
- **Depends On**: PRD-111 (NativeToolAgent base), PRD-116 (Worker Daemon)
- **Priority**: P0 — without this, agents cannot dynamically discover or load MCP tools

## Context

Model Context Protocol (MCP) is Anthropic's open standard for connecting AI agents to external tools, data sources, and services via a standardized JSON-RPC interface. MCP servers expose **tools**, **resources**, and **prompts** that Claude can call natively via the `use_mcp_tool` tool call format.

The EverReach OS terminal needs to:
1. **Discover** domain-relevant MCP servers (from npm registry, GitHub, mcp.so, glama.ai marketplaces)
2. **Register** validated MCPs in Supabase with their tool manifests
3. **Load** MCP tools dynamically into any domain agent's tool registry at startup
4. **Start/stop** local MCP servers as subprocesses (stdio transport) or connect to remote (SSE/HTTP)
5. **Monitor** MCP health and auto-reconnect on failure
6. **Research** new MCPs for a given domain keyword — e.g., "find all MCP servers for Stripe payments"

This makes the terminal a true **MCP-native orchestrator** where every agent can compose tools from:
- Native Python tools (PRD-111 ToolRegistry)
- Anthropic API tools (function calling format)
- MCP server tools (discovered + loaded dynamically)

## Architecture

```
MCPRegistrySystem (mcp_registry.py)
    ├── MCPDiscoveryAgent   — search npm/GitHub/mcp.so/glama for domain MCPs
    ├── MCPValidator        — connect + list_tools, validate schema, test call
    ├── MCPRegistry         — Supabase actp_mcp_registry CRUD + tool manifest cache
    ├── MCPServerManager    — start/stop stdio MCP server subprocesses
    ├── MCPConnectionPool   — maintain live MCP client connections per agent
    ├── MCPToolLoader       — inject MCP tools into NativeToolAgent tool registry
    └── MCPHealthMonitor    — ping servers, reconnect on failure

NativeToolAgent integration (extends PRD-111):
    └── load_mcp_tools(domain)  — on agent start, SELECT from actp_mcp_registry
                                   WHERE domain=X AND active=true, start servers,
                                   inject tools into self.tool_registry
```

## MCP Transport Support
- **stdio** (local): spawn `npx @modelcontextprotocol/server-X` subprocess, JSON-RPC over stdin/stdout
- **SSE** (remote): connect to `http://host/sse` endpoint, parse server-sent events
- **HTTP** (remote): stateless POST to `http://host/mcp` with JSON-RPC body

## Task

### MCPDiscoveryAgent
1. `MCPDiscoveryAgent.search_npm(keyword)` — GET `https://registry.npmjs.org/-/v1/search?text=mcp+{keyword}&size=20`, filter packages matching `@modelcontextprotocol/` or `mcp-server-` naming pattern, return list of {name, description, version, weekly_downloads}
2. `MCPDiscoveryAgent.search_github(keyword)` — GET `https://api.github.com/search/repositories?q=mcp+server+{keyword}&sort=stars`, filter repos with topic `mcp` or `model-context-protocol`, return {name, url, stars, description}
3. `MCPDiscoveryAgent.search_mcp_so(keyword)` — GET `https://mcp.so/api/servers?search={keyword}`, return list of {id, name, description, install_command, tools_count}
4. `MCPDiscoveryAgent.search_glama(keyword)` — GET `https://glama.ai/mcp/servers?q={keyword}`, parse response for server listings
5. `MCPDiscoveryAgent.search_all(keyword)` — asyncio.gather all 4 sources, deduplicate by name, rank by relevance score (stars + downloads + tools_count)
6. `MCPDiscoveryAgent.classify_domain(server_name, description)` — Claude call: classify which domain this MCP serves from: social-media / content / acquisition / revenue / product / infra / general
7. `MCPDiscoveryAgent.get_install_command(npm_package)` — return `npx -y {npm_package}` or `uvx {pypi_package}` depending on registry
8. `MCPDiscoveryAgent.research_domain_mcps(domain)` — preset workflow: search_all(domain) → classify each → validate top 5 → save to registry

### MCPValidator
9. `MCPValidator.connect_stdio(command)` — asyncio subprocess: start `command`, send initialize request, await InitializeResult, return {server_name, protocol_version, capabilities}
10. `MCPValidator.list_tools(connection)` — send tools/list request, return list of {name, description, inputSchema}
11. `MCPValidator.test_tool_call(connection, tool_name, test_args)` — send tools/call request with minimal test args, verify response has content array
12. `MCPValidator.validate_server(install_command)` — full pipeline: connect → list_tools → test_call on first tool → return {valid, tools, error}
13. `MCPValidator.extract_tool_manifest(connection)` — full tool list with JSON schemas → stored as JSONB in actp_mcp_registry
14. `MCPValidator.get_compatibility_score(tools_list, domain)` — count tools relevant to domain keywords, return 0.0-1.0 compatibility

### MCPRegistry (Supabase)
15. `MCPRegistry.register_server(name, transport, command, domain, tools_manifest, source_url)` — UPSERT actp_mcp_registry: id, name, transport (stdio/sse/http), install_command, domain, tools_manifest jsonb, active bool, compatibility_score, source_url, registered_at
16. `MCPRegistry.get_servers_for_domain(domain)` — SELECT FROM actp_mcp_registry WHERE domain=X AND active=true ORDER BY compatibility_score DESC
17. `MCPRegistry.get_all_active()` — SELECT all active MCP servers with their tool manifests
18. `MCPRegistry.deactivate_server(name, reason)` — UPDATE active=false, deactivation_reason=reason
19. `MCPRegistry.update_tool_manifest(name, tools_manifest)` — UPDATE after re-validation on version change
20. `MCPRegistry.get_tools_by_capability(capability_keyword)` — SELECT servers WHERE tools_manifest::text ILIKE '%{keyword}%'
21. `MCPRegistry.get_discovery_history(days=30)` — SELECT from actp_mcp_discoveries for audit trail

### MCPServerManager
22. `MCPServerManager.start_server(name, install_command)` — asyncio subprocess: `install_command`, store proc in _procs dict, log PID to actp_mcp_processes
23. `MCPServerManager.stop_server(name)` — terminate + kill proc from _procs dict, UPDATE actp_mcp_processes status='stopped'
24. `MCPServerManager.restart_server(name)` — stop_server → asyncio.sleep(2) → start_server
25. `MCPServerManager.get_running_servers()` — {name: {pid, uptime, status}} from _procs
26. `MCPServerManager.start_domain_servers(domain)` — load from registry + start all servers for domain
27. `MCPServerManager.stop_all()` — iterate _procs, terminate all, called on worker.py shutdown

### MCPConnectionPool
28. `MCPConnectionPool.get_connection(server_name)` — return live MCPClient for server, create if not exists
29. `MCPConnectionPool.call_tool(server_name, tool_name, args)` — get_connection + send tools/call request, return result
30. `MCPConnectionPool.release_all()` — close all client connections cleanly

### MCPToolLoader
31. `MCPToolLoader.load_for_agent(agent_type, tool_registry)` — SELECT domain agents' MCP configs, start servers, register each tool as `mcp_{server}_{tool}` in tool_registry
32. `MCPToolLoader.build_tool_wrapper(server_name, tool_name, schema)` — return async callable that calls MCPConnectionPool.call_tool(server_name, tool_name, args)
33. `MCPToolLoader.get_loaded_tools(agent_type)` — return list of (tool_name, mcp_server) for agent

### MCPHealthMonitor
34. `MCPHealthMonitor.ping(server_name)` — send tools/list request with 5s timeout, return up/down
35. `MCPHealthMonitor.watch_loop(interval=60)` — asyncio: every 60s ping all running servers, reconnect on failure
36. `MCPHealthMonitor.on_failure(server_name)` — restart server via MCPServerManager.restart_server(), log to actp_mcp_health_events
37. `MCPHealthMonitor.get_uptime_stats()` — SELECT from actp_mcp_health_events, return per-server uptime %

### NativeToolAgent Integration
38. `NativeToolAgent.load_mcp_tools(domain)` — called in __init__: MCPToolLoader.load_for_agent(self.agent_type, self.tool_registry), log count of MCP tools loaded
39. `NativeToolAgent._call_mcp_tool(server_name, tool_name, args)` — wrapper around MCPConnectionPool.call_tool that handles errors + logs to actp_tool_call_log with source='mcp'
40. `NativeToolAgent.list_available_mcp_tools()` — return MCPToolLoader.get_loaded_tools(self.agent_type)
41. `NativeToolAgent.reload_mcp_tools()` — hot-reload MCP tools without restarting agent (for dynamic MCP additions)

### Pre-Built Domain MCP Seed Data
42. Seed `actp_mcp_registry` with high-value MCP servers already validated:
    - `@modelcontextprotocol/server-github` — domain: acquisition/infra, tools: create_issue, search_repos, list_prs
    - `@modelcontextprotocol/server-slack` — domain: acquisition, tools: send_message, list_channels
    - `@modelcontextprotocol/server-brave-search` — domain: content/social-media, tools: brave_web_search
    - `@modelcontextprotocol/server-puppeteer` — domain: content/acquisition, tools: puppeteer_navigate, screenshot
    - `@modelcontextprotocol/server-filesystem` — domain: infra, tools: read_file, write_file, list_dir
    - `mcp-server-stripe` — domain: revenue/product, tools: get_customer, list_payments, create_coupon
    - `@executeautomation/playwright-mcp-server` — domain: social-media/acquisition, tools: playwright_navigate, click, fill, screenshot

### Supabase Migrations
43. Migration: `actp_mcp_registry` — id, name text UNIQUE, transport text, install_command text, domain text, tools_manifest jsonb, active bool default true, compatibility_score float, source_url text, deactivation_reason text, registered_at, updated_at
44. Migration: `actp_mcp_discoveries` — id, keyword text, source text (npm/github/mcp_so/glama), result_count int, top_results jsonb, created_at
45. Migration: `actp_mcp_processes` — id, server_name text FK actp_mcp_registry, pid int, status text, started_at, stopped_at
46. Migration: `actp_mcp_health_events` — id, server_name text, event_type text (ping_ok/ping_fail/restart), details text, created_at

### Health Routes
47. `GET /api/mcp/registry` — all registered MCP servers with tool counts per domain
48. `GET /api/mcp/running` — currently running servers with PIDs and uptime
49. `GET /api/mcp/discover?domain=X` — trigger MCPDiscoveryAgent.research_domain_mcps(X), return found servers
50. `POST /api/mcp/register` — manually register an MCP server: {name, install_command, domain}
51. `GET /api/mcp/health` — all server uptime stats from actp_mcp_health_events

### Tests
52. `test_search_npm_finds_mcp_packages()` — mock npm registry response, verify packages with mcp-server- prefix returned
53. `test_validator_extracts_tool_manifest()` — mock stdio subprocess returning tools/list, verify manifest shape
54. `test_tool_loader_registers_mcp_tools_in_registry()` — seed 2 MCP servers, verify tool_registry has mcp_server1_tool1 etc
55. `test_health_monitor_restarts_on_failure()` — mock ping fail, verify restart_server called
56. `test_native_agent_loads_domain_mcps_on_init()` — mock registry returning 2 servers for 'acquisition', verify agent has mcp tools loaded
57. `test_seed_data_all_7_servers_registered()` — run seed, verify all 7 preset servers in actp_mcp_registry

## Environment Variables
- `MCP_GITHUB_TOKEN` — GitHub PAT for github MCP server + search API
- `MCP_BRAVE_API_KEY` — Brave Search API key for brave-search MCP
- `MCP_STRIPE_KEY` — Stripe key for mcp-server-stripe (can reuse STRIPE_SECRET_KEY)
- `MCP_DISCOVERY_ENABLED=true` — enable periodic discovery scans
- `MCP_DISCOVERY_INTERVAL_HOURS=24` — how often to auto-scan for new domain MCPs
- `MCP_HEALTH_CHECK_INTERVAL=60` — seconds between health pings
