# Progressive Disclosure in Claude Code
**Video**: https://www.youtube.com/watch?v=DQHFow2NoQc  
**Key topic**: How to structure agent tool loading — progressive vs. upfront disclosure

---

## Core Insight

Multiple major AI infrastructure companies (Cloudflare, Anthropic, Cursor, Vercel) independently arrived at the same conclusion: **loading all tool definitions upfront is wrong**. Tools should be discovered and loaded progressively, on demand.

This applies directly to how Remotion scenes are built — not all at once, but progressively phase by phase.

---

## The Problem with Upfront Tool Loading

When all MCP tools/definitions are loaded into context at once:
- Tools may never be used but consume context window
- Model gets confused by too many options
- Performance degrades with large tool counts

**Cloudflare's finding** (September blog): Converting MCPs to TypeScript and letting the model write code (rather than call MCPs) was more effective. Models write TypeScript better than they leverage MCP tool calls.

**Anthropic's confirmation**: Released "tool search" — Claude discovers tools on demand rather than seeing all at once.

---

## Progressive Disclosure Pattern

### Applied to Agent Tool Design
```
Instead of: Load ALL tools → Agent picks from full list
Do this:   Agent asks "what tools are available for X?" → Loads only relevant tools
```

### Applied to Remotion (Key connection)
The 9-phase workflow IS progressive disclosure:
- Phase 1-3: Only load blueprint context (style guide, storyboard)  
- Phase 4-6: Load motion primitives and constants context
- Phase 7-9: Load component library and scene-specific context

Never dump the entire Remotion API surface into one prompt.

### Bash + File System Pattern
Use bash tools to navigate codebases progressively:
```bash
# Instead of: read all files upfront
# Do this: discover what's needed
ls src/
cat src/constants.ts  # only when you need the colors
cat src/motionPrimitives.ts  # only when writing a scene
```

---

## ACTP Architecture Application

### Workflow Engine Progressive Steps
The workflow DAG already implements this correctly:
1. `research` step → only loads research data
2. `generate-content` step → loads research output + content template
3. `render-video` step → loads content + Remotion constants
4. `ai-review` step → loads rendered video + review rubric
5. `publish` step → loads reviewed content + publish config

Each step only sees the outputs it needs from previous steps.

### RemotionRenderExecutor
Apply progressive disclosure to the executor:
- Phase `art_direction`: reads brief, returns style_guide
- Phase `motion_primitives`: reads style_guide, returns primitives code
- Phase `scene_N`: reads storyboard + primitives, returns one scene file at a time

---

## Key Technical Patterns

### Tool Discovery over Tool Loading
```python
# Pattern: discover available Remotion components before generating code
# Ask Claude: "What components exist in src/components/?"
# Then load only the ones needed for this scene
```

### File System as Progressive Context
```bash
find src/ -name "*.tsx" | head -5  # discover components
cat src/components/TextBlock.tsx    # load one at a time
```

### TypeScript over MCP
For complex tool interactions, write the TypeScript integration code rather than using MCPs. The model generates better results writing code than issuing MCP tool calls for complex workflows.

---

## Key Quotes

> "The way that we've been using MCP is completely wrong."

> "Instead of loading all of the tool definitions up front, the tool search tool discovers tools on demand."

> "Models are really good at writing code. They're not necessarily great at leveraging MCP."

> "This is applicable to how you can use Claude Code, but also to how you can develop agents."
