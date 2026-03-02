# Remotion Skills — Research Synthesis
**Videos analyzed**: FVrNRnfC8oM, Vu_XOKKgJtA, xAUifztpib8, DQHFow2NoQc  
**Researched**: 2026-03-01

---

## Executive Summary

Four videos from the Remotion/AI video generation space reveal a complete production system for creating professional videos from text prompts using Claude Code + Remotion + ElevenLabs. The key insight: **you are directing a production system, not manually animating**. Claude Code handles code generation; Remotion handles rendering; ElevenLabs handles narration.

---

## Cross-Video Patterns

### Pattern 1: The 9-Phase Production System (xAUifztpib8)
The most technical video outlines a phased approach that eliminates guesswork:
- Phases 1–3: Art direction, content analysis, storyboard (blueprint before any code)
- Phases 4–6: Motion primitives, constants, choreography (reusable infrastructure)
- Phases 7–9: Components, assembly, scene generation (execution)

**Key rule from this video**: Generate scenes ONE BY ONE. Attempting to generate all scenes at once leads to hard-to-debug, monolithic code.

### Pattern 2: Motion Primitives Are Infrastructure (xAUifztpib8)
Do not over-control motion at the primitive level. Motion primitives should be:
- General-purpose (not baked for a specific scene)
- Reusable across all scenes
- Parameter-driven (delay, duration, distance as arguments)

Trying to micromanage motion timing during the primitives phase results in rigid, non-reusable animation code.

### Pattern 3: Progressive Disclosure for Agent Tools (DQHFow2NoQc)
Don't load all Remotion components and tools into context at once. Discover and use tools progressively:
- Cloudflare, Anthropic, Cursor all independently arrived at this conclusion
- Models write TypeScript code better than they leverage MCPs directly
- Load context progressively: start with blueprint, add details phase by phase

This maps directly to the 9-phase workflow — each phase only uses the outputs of the previous phase.

### Pattern 4: Product Demo Videos from UI Components (FVrNRnfC8oM)
Raw UI screenshots → animated product demo:
- Take screenshots of actual product interfaces
- Feed them as assets to Claude Code
- Claude generates React/Remotion code that animates those screenshots
- Add voiceover with NanaBanana or ElevenLabs

This is specifically valuable for ACTP — automating creation of demo videos for the products being built.

### Pattern 5: 20-Minute Motion Design Sprint (Vu_XOKKgJtA)
For simple promotional graphics (10-15 seconds):
- Install skill globally, then start Claude Code in a new project
- Focus on a single motion design (not a multi-scene video)
- Iterate rapidly: prompt → review → adjust → repeat
- Good for social media hooks, title cards, logo reveals

---

## Architecture Decisions for ACTP

### RemotionRenderExecutor Upgrades
The existing executor in `workflow_executors.py` is basic. Based on the 9-phase workflow, it should support:
1. `phase` input — which production phase to execute
2. Structured prompts per phase (art_direction, motion_primitives, scene_N)
3. `voiceover` integration via ElevenLabs
4. Preview URL return (Remotion Studio URL)
5. Scene-by-scene generation with review checkpoints

### Workflow Integration
The `render-video` step in the `research-to-publish` DAG can now be enriched with:
- Art direction derived from the content being promoted
- Automatic storyboard from the research/content context
- Scene generation per the 9-phase workflow
- ElevenLabs voiceover from the generated script

### Skills Directory
```
skills/remotion/
  SKILL.md                    ← pivot (comprehensive)
  justfile                    ← render, preview, new, health
  sub-agents/
    art-director.md           ← phases 1-3
    motion-architect.md       ← phases 4-6
    scene-builder.md          ← phases 7-9 (critical one-at-a-time rule)
    voiceover.md              ← ElevenLabs integration
```

---

## Key Quotes

> "This was not edited in After Effects. We did not touch keyframes and we didn't animate anything by hand." — xAUifztpib8

> "A common mistake here is trying to over-control this step [motion primitives]. If you attempt to micromanage motion at this stage, you will end up baking specific motion into your motion system and that makes things harder to reuse later." — xAUifztpib8

> "Generate scenes one by one — much easier to debug, iterate, and make targeted changes without breaking the entire video." — xAUifztpib8

> "The idea is instead of loading all of the tool definitions up front, the tool search tool discovers tools on demand. Claude only sees the tools that it needs." — DQHFow2NoQc (Anthropic's progressive disclosure)

> "I created this motion design graphic in less than 20 minutes using Claude Code." — Vu_XOKKgJtA

> "With just one or two prompts, I can make videos that take components from my UI and build full-on product demos." — FVrNRnfC8oM

---

## Files Created

- `skills/remotion/SKILL.md`
- `skills/remotion/justfile`
- `skills/remotion/sub-agents/art-director.md`
- `skills/remotion/sub-agents/motion-architect.md`
- `skills/remotion/sub-agents/scene-builder.md`
- `skills/remotion/sub-agents/voiceover.md`
- `docs/research/remotion/01-remotion-agent-skill-xAUifztpib8.md`
- `docs/research/remotion/02-ai-video-from-prompt-FVrNRnfC8oM.md`
- `docs/research/remotion/03-motion-design-20min-Vu_XOKKgJtA.md`
- `docs/research/remotion/04-progressive-disclosure-DQHFow2NoQc.md`
- Updated `actp-worker/workflow_executors.py` — RemotionRenderExecutor enhancements
- Updated `AGENTS.md` — remotion skill registered
