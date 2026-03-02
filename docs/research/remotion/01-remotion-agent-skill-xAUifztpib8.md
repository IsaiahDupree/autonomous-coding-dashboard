# Remotion Agent Skill for Claude Code
**Video**: https://www.youtube.com/watch?v=xAUifztpib8  
**Key topic**: 9-phase production workflow for building professional explainer videos

---

## Core Insight

Remotion is React-based video rendering. The agent skill teaches Claude the full Remotion framework: compositions, animations, timing, assets. Combined with Claude Code, you can build professional videos entirely by prompting — no keyframes, no After Effects.

**Demonstrated**: Mars explainer video — fully rendered, professional, with voiceover.

---

## Installation

```bash
# From Remotion website / tool page
npx create-video@latest
```

Run OUTSIDE any project directory. This installs the skill globally so Claude can reference it.

---

## The 9-Phase Production Workflow

### Phase 1–3: Blueprint (Art Direction)
- Define visual style, color palette, typography
- Analyze source content / brand assets
- Create scene-by-scene storyboard with timing

### Phase 4–6: Motion System (Infrastructure)
- Organize assets in `/public/`
- Define constants (`COLORS`, `FONTS`, `FPS`, `SCENE_DURATIONS`) in `src/constants.ts`
- Create motion primitives: `fadeIn`, `slideUp`, `scaleIn`, `punchIn`, `stagger`
- **Critical**: Keep primitives general-purpose — do NOT bake scene-specific timing

### Phase 7–8: Component Library + Assembly
- Build reusable React components: `TextBlock`, `SceneWrapper`, `LogoReveal`, `Screenshot`
- Wire `Root.tsx` and `Composition.tsx` with correct video config
- Install fonts via `@remotion/google-fonts`

### Phase 9: Scene Generation (CRITICAL RULE)
**Generate ONE scene at a time. Review in Remotion Studio. Then proceed.**

Why:
- Much easier to debug isolated scenes
- Targeted iteration without breaking other scenes
- Faster to polish before assembly

```
Phase 9 prompt template:
"Build Scene [N] using the storyboard timing, choreography mapping,
and motion primitives. After building Scene [N], stop."
```

---

## Voiceover

- SDK: `@eleven-labs/sdk`
- API key → `.env` → `ELEVEN_LABS_API_KEY`
- Generate voiceover script first, then sync scene durations to speech timing
- Integrate with `<Audio src={staticFile('voiceover.mp3')} />` in `Composition.tsx`

---

## Key Rules Extracted

- Generate scenes ONE BY ONE (never all at once)
- Don't over-control motion primitives — general purpose only
- Use `npm start` to preview before final render
- Assets always in `/public/assets/` via `staticFile()`
- Review each scene before assembling the full video
