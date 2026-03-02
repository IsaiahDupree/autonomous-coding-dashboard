import json, os

queue_path = os.path.join(os.path.dirname(__file__), '..', 'repo-queue.json')
with open(queue_path, 'r') as f:
    q = json.load(f)

if any(r['id'] == 'prd051-clawbot-mcp-mesh' for r in q['repos']):
    print('Already in queue — skipping')
else:
    new_entry = {
      "id": "prd051-clawbot-mcp-mesh",
      "name": "PRD-051 — ClawBot MCP Agent Mesh (Orchestrator + Specialists + MCP Services)",
      "path": "/Users/isaiahdupree/Documents/Software/actp-worker",
      "prompt": "prompts/prd051-clawbot-mcp-mesh.md",
      "featureList": "/Users/isaiahdupree/Documents/Software/autonomous-coding-dashboard/harness/features/prd051-clawbot-mcp-mesh.json",
      "priority": -31,
      "enabled": True,
      "untilComplete": True,
      "complexity": "critical",
      "focus": "Fix double-processing bug, build MCP service mesh, ACTP MCP server, agent pool, 30+ specialist tools, orchestrator agent, skill domain filtering",
      "tags": ["clawbot", "mcp", "orchestrator", "agent-pool", "specialist-tools", "telegram", "infrastructure", "prd051"]
    }
    q['repos'].insert(0, new_entry)
    with open(queue_path, 'w') as f:
        json.dump(q, f, indent=2)
    print('Added prd051-clawbot-mcp-mesh at priority -31')

sorted_repos = sorted(q['repos'], key=lambda r: r.get('priority', 999))
print('Top 3 by priority:')
for r in sorted_repos[:3]:
    print(f"  priority={r['priority']} id={r['id']}")
print(f'Total repos: {len(q["repos"])}')
